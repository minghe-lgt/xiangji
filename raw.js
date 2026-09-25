/**
 * RAW/ARW 轻量解析 — 提取内嵌 JPEG 预览（绝大多数 ARW/CR2/NEF/ARW 都带全尺寸预览）
 * 不依赖后端；对无预览的 RAW 会给出明确提示。
 */

function readU16(dv, off, le) {
  return dv.getUint16(off, le);
}
function readU32(dv, off, le) {
  return dv.getUint32(off, le);
}

/**
 * 从 TIFF/RAW 容器中扫描并提取内嵌 JPEG。
 * 支持：ARW / CR2 / CR3(有限) / NEF / DNG / TIFF
 * @param {ArrayBuffer} buffer
 * @returns {Promise<{blob: Blob, width: number, height: number, source: string}>}
 */
async function extractRawPreview(buffer) {
  const dv = new DataView(buffer);
  if (buffer.byteLength < 8) throw new Error("文件太小，不是有效的 RAW/TIFF");

  // TIFF endian
  const bom = dv.getUint16(0, false);
  let le;
  if (bom === 0x4949) le = true;
  else if (bom === 0x4d4d) le = false;
  else {
    // 不是 TIFF，尝试直接找 JPEG SOI（有些封装）
    const jpeg = findJpegInBytes(new Uint8Array(buffer));
    if (jpeg) return jpeg;
    throw new Error("无法识别的 RAW 格式（非 TIFF/ARW 容器）");
  }

  const magic = readU16(dv, 2, le);
  if (magic !== 42) {
    const jpeg = findJpegInBytes(new Uint8Array(buffer));
    if (jpeg) return jpeg;
    throw new Error("TIFF 标记异常");
  }

  // 遍历 IFD 链，收集 JPEGInterchangeFormat / 大图 Strip
  const candidates = [];

  function readIFD(offset, depth) {
    if (offset <= 0 || offset + 2 > buffer.byteLength || depth > 6) return;
    const entryCount = readU16(dv, offset, le);
    if (entryCount > 512) return;

    let jpegOffset = -1;
    let jpegLength = -1;
    let stripOffset = -1;
    let stripLength = -1;
    let subIFDOffsets = [];
    let imageWidth = 0;
    let imageLength = 0;
    let compression = 1;
    let photometric = 0;
    let bitsPerSample = 8;

    for (let i = 0; i < entryCount; i++) {
      const e = offset + 2 + i * 12;
      if (e + 12 > buffer.byteLength) break;
      const tag = readU16(dv, e, le);
      const type = readU16(dv, e + 2, le);
      const count = readU32(dv, e + 4, le);
      const valOff = e + 8;

      let value;
      if (type === 3 && count === 1) value = readU16(dv, valOff, le);
      else if (type === 4 && count === 1) value = readU32(dv, valOff, le);
      else if (type === 4 && count > 1) {
        const p = readU32(dv, valOff, le);
        // 读取多个 long（SubIFD 偏移）
        for (let k = 0; k < Math.min(count, 8); k++) {
          const off = readU32(dv, p + k * 4, le);
          if (off > 0) subIFDOffsets.push(off);
        }
        value = undefined;
      } else if (type === 3 && count > 1) {
        const p = readU32(dv, valOff, le);
        const arr = [];
        for (let k = 0; k < Math.min(count, 8); k++) arr.push(readU16(dv, p + k * 2, le));
        value = arr;
      } else {
        value = readU32(dv, valOff, le);
      }

      switch (tag) {
        case 256: imageWidth = value; break; // ImageWidth
        case 257: imageLength = value; break; // ImageLength
        case 259: compression = value; break;
        case 262: photometric = value; break;
        case 258: bitsPerSample = Array.isArray(value) ? value[0] : value; break;
        case 513: jpegOffset = value; break; // JPEGInterchangeFormat
        case 514: jpegLength = value; break; // JPEGInterchangeFormatLength
        case 273: // StripOffsets
          if (count === 1) stripOffset = value;
          else if (Array.isArray(value) && value.length) stripOffset = value[0];
          break;
        case 279: // StripByteCounts
          if (count === 1) stripLength = value;
          else if (Array.isArray(value) && value.length) stripLength = value[0];
          break;
        case 330: // SubIFDs
          if (count === 1 && typeof value === "number") subIFDOffsets.push(value);
          break;
        default:
          break;
      }
    }

    // JPEG preview via JPEGInterchangeFormat
    if (jpegOffset > 0 && jpegLength > 16) {
      const end = Math.min(buffer.byteLength, jpegOffset + jpegLength);
      const bytes = new Uint8Array(buffer, jpegOffset, end - jpegOffset);
      if (bytes[0] === 0xff && bytes[1] === 0xd8) {
        candidates.push({ bytes, width: imageWidth, height: imageLength, kind: "jpeg-IFD" });
      }
    }

    // Strip 里直接是 JPEG（常见于预览）
    if (stripOffset > 0 && stripLength > 16) {
      const end = Math.min(buffer.byteLength, stripOffset + stripLength);
      const bytes = new Uint8Array(buffer, stripOffset, end - stripOffset);
      if (bytes[0] === 0xff && bytes[1] === 0xd8) {
        candidates.push({ bytes, width: imageWidth, height: imageLength, kind: "jpeg-strip" });
      }
    }

    // SubIFDs
    for (const s of subIFDOffsets) readIFD(s, depth + 1);

    // next IFD
    const next = offset + 2 + entryCount * 12;
    if (next + 4 <= buffer.byteLength) {
      const nextOff = readU32(dv, next, le);
      if (nextOff > 0 && nextOff < buffer.byteLength) readIFD(nextOff, depth + 1);
    }
  }

  const firstIFD = readU32(dv, 4, le);
  readIFD(firstIFD, 0);

  // 选最大的预览
  if (candidates.length) {
    candidates.sort((a, b) => b.bytes.length - a.bytes.length);
    const best = candidates[0];
    // 精确 JPEG 长度（到 EOI）
    const jpegBytes = trimJpeg(best.bytes);
    const blob = new Blob([jpegBytes], { type: "image/jpeg" });
    const dim = await imageBlobSize(blob);
    return {
      blob,
      width: dim.width || best.width,
      height: dim.height || best.height,
      source: `RAW 内嵌预览 · ${best.kind}`,
    };
  }

  // 全文件扫 JPEG（兜底）
  const scanned = findJpegInBytes(new Uint8Array(buffer));
  if (scanned) return scanned;

  throw new Error("这个 RAW 里没有可用的 JPEG 预览。请先用相机/厂商软件导出 JPEG，或用 DNG/RAW 预览导出功能。");
}

function findJpegInBytes(bytes) {
  for (let i = 0; i < bytes.length - 4; i++) {
    if (bytes[i] === 0xff && bytes[i + 1] === 0xd8 && bytes[i + 2] === 0xff) {
      // 找 EOI
      for (let j = i + 3; j < bytes.length - 1; j++) {
        if (bytes[j] === 0xff && bytes[j + 1] === 0xd9) {
          const slice = bytes.subarray(i, j + 2);
          if (slice.length > 20000) {
            // 大于 20KB 才当有效预览
            return (async () => {
              const blob = new Blob([slice], { type: "image/jpeg" });
              const dim = await imageBlobSize(blob);
              return {
                blob,
                width: dim.width,
                height: dim.height,
                source: "RAW 内嵌 JPEG（扫描）",
              };
            })();
          }
        }
      }
    }
  }
  return null;
}

function trimJpeg(bytes) {
  for (let j = 2; j < bytes.length - 1; j++) {
    if (bytes[j] === 0xff && bytes[j + 1] === 0xd9) return bytes.subarray(0, j + 2);
  }
  return bytes;
}

function imageBlobSize(blob) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/** 判断文件是否是 RAW 容器 */
function isRawFile(file) {
  const name = (file.name || "").toLowerCase();
  return /\.(arw|cr2|cr3|nef|dng|orf|raf|rw2|pef|srw|arq|raw)$/.test(name) || file.type === "image/x-sony-arw" || file.type === "image/x-canon-cr2";
}

/**
 * 统一入口：普通图片直接解码，RAW 提取内嵌预览
 * @returns {Promise<{img: HTMLImageElement, note: string}>}
 */
async function loadPhotoFile(file) {
  if (isRawFile(file) || file.size > 25 * 1024 * 1024) {
    try {
      const buf = await file.arrayBuffer();
      const preview = await extractRawPreview(buf);
      const url = URL.createObjectURL(preview.blob);
      const img = await loadImage(url);
      return {
        img,
        note: `${file.name} · ${preview.source}${preview.width ? ` · ${preview.width}×${preview.height}` : ""}`,
        cleanup: () => URL.revokeObjectURL(url),
      };
    } catch (e) {
      throw new Error(`RAW 解析失败：${e.message || e}`);
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    return {
      img,
      note: `${file.name} · ${img.naturalWidth}×${img.naturalHeight}`,
      cleanup: () => URL.revokeObjectURL(url),
    };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw new Error("图片读取失败，请换一张试试");
  }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("解码失败"));
    img.src = url;
  });
}
