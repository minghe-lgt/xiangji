/**
 * RAW/ARW 解析 — 提取内嵌最高分辨率 JPEG 预览 + 记录完整 RAW 尺寸
 * 不依赖后端。真正全像素 demosaic 需要 LibRaw/厂商软件；这里尽量取到文件内最大的预览。
 */

function readU16(dv, off, le) {
  return dv.getUint16(off, le);
}
function readU32(dv, off, le) {
  return dv.getUint32(off, le);
}

/** 从 JPEG 码流解析真实像素尺寸（SOF0/1/2/3） */
function jpegDimensions(bytes) {
  if (!bytes || bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i < bytes.length - 8) {
    if (bytes[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = bytes[i + 1];
    // 填充字节
    if (marker === 0xff) {
      i++;
      continue;
    }
    // 无长度段
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      i += 2;
      continue;
    }
    const len = (bytes[i + 2] << 8) | bytes[i + 3];
    if (len < 2) break;
    // SOF0/1/2/3/5/6/7/9/10/11/13/14/15
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const precision = bytes[i + 4];
      const height = (bytes[i + 5] << 8) | bytes[i + 6];
      const width = (bytes[i + 7] << 8) | bytes[i + 8];
      return { width, height, precision };
    }
    i += 2 + len;
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

/**
 * 从 TIFF/RAW 容器扫描所有内嵌 JPEG，选像素最大的。
 * 同时读取 CFA/SubIFD 上的完整 RAW 分辨率。
 * onProgress: 可选，全文件兜底扫描时的进度回调 0..1
 */
async function extractRawPreview(buffer, onProgress) {
  const dv = new DataView(buffer);
  if (buffer.byteLength < 8) throw new Error("文件太小，不是有效的 RAW/TIFF");

  const candidates = []; // { bytes, width, height, kind }
  let rawWidth = 0;
  let rawHeight = 0;
  let rawBits = 0;

  function pushJpeg(bytes, kind, hintW, hintH) {
    if (!bytes || bytes.length < 2000) return;
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return;
    const trimmed = trimJpeg(bytes);
    const dim = jpegDimensions(trimmed);
    const width = (dim && dim.width) || hintW || 0;
    const height = (dim && dim.height) || hintH || 0;
    const pixels = width * height;
    candidates.push({ bytes: trimmed, width, height, pixels, kind });
  }

  // TIFF 结构
  const bom = dv.getUint16(0, false);
  let le;
  if (bom === 0x4949) le = true;
  else if (bom === 0x4d4d) le = false;

  if (le === undefined) {
    // 兜底：全文件扫 JPEG
    const all = await scanAllJpegs(new Uint8Array(buffer), onProgress);
    if (!all.length) throw new Error("无法识别的 RAW 格式");
    all.sort((a, b) => b.pixels - a.pixels);
    return await finalizeCandidate(all[0], buffer.byteLength);
  }

  const magic = readU16(dv, 2, le);
  if (magic !== 42) {
    const all = await scanAllJpegs(new Uint8Array(buffer), onProgress);
    if (!all.length) throw new Error("TIFF 标记异常");
    all.sort((a, b) => b.pixels - a.pixels);
    return await finalizeCandidate(all[0], buffer.byteLength);
  }

  function readIFD(offset, depth) {
    if (offset <= 0 || offset + 2 > buffer.byteLength || depth > 8) return;
    const entryCount = readU16(dv, offset, le);
    if (entryCount > 512) return;

    let jpegOffset = -1;
    let jpegLength = -1;
    let stripOffsets = [];
    let stripLengths = [];
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
        for (let k = 0; k < Math.min(count, 16); k++) {
          if (p + k * 4 + 4 > buffer.byteLength) break;
          const off = readU32(dv, p + k * 4, le);
          if (off > 0) subIFDOffsets.push(off);
        }
        value = undefined;
      } else if (type === 3 && count > 1) {
        const p = readU32(dv, valOff, le);
        const arr = [];
        for (let k = 0; k < Math.min(count, 16); k++) {
          if (p + k * 2 + 2 > buffer.byteLength) break;
          arr.push(readU16(dv, p + k * 2, le));
        }
        value = arr;
      } else {
        value = readU32(dv, valOff, le);
      }

      switch (tag) {
        case 256: imageWidth = value; break;
        case 257: imageLength = value; break;
        case 258: bitsPerSample = Array.isArray(value) ? value[0] : value; break;
        case 259: compression = value; break;
        case 262: photometric = value; break;
        case 273: // StripOffsets
          if (count === 1) stripOffsets = [value];
          else if (Array.isArray(value)) stripOffsets = value.slice();
          break;
        case 278: break;
        case 279: // StripByteCounts
          if (count === 1) stripLengths = [value];
          else if (Array.isArray(value)) stripLengths = value.slice();
          break;
        case 330:
          if (count === 1 && typeof value === "number") subIFDOffsets.push(value);
          break;
        case 513: jpegOffset = value; break;
        case 514: jpegLength = value; break;
        default:
          break;
      }
    }

    // CFA / RAW 主数据尺寸（photometric 32803=CFA，或 SubIFD 大图）
    const isCFA = photometric === 32803 || photometric === 34892;
    const area = imageWidth * imageLength;
    if (area > rawWidth * rawHeight && imageWidth > 100) {
      // 仅当像 RAW 主图（宽高都大）时记录
      if (isCFA || area > 500000) {
        rawWidth = imageWidth;
        rawHeight = imageLength;
        rawBits = bitsPerSample;
      }
    }

    // JPEGInterchangeFormat
    if (jpegOffset > 0 && jpegLength > 2000) {
      const end = Math.min(buffer.byteLength, jpegOffset + jpegLength);
      pushJpeg(new Uint8Array(buffer, jpegOffset, end - jpegOffset), "jpeg-IFD", imageWidth, imageLength);
    }

    // Strip 里直接是 JPEG
    if (stripOffsets.length) {
      for (let s = 0; s < Math.min(stripOffsets.length, 4); s++) {
        const off = stripOffsets[s];
        const len = stripLengths[s] || 0;
        if (off > 0 && len > 2000) {
          const end = Math.min(buffer.byteLength, off + len);
          pushJpeg(new Uint8Array(buffer, off, end - off), "jpeg-strip", imageWidth, imageLength);
        }
      }
    }

    for (const s of subIFDOffsets) readIFD(s, depth + 1);

    const next = offset + 2 + entryCount * 12;
    if (next + 4 <= buffer.byteLength) {
      const nextOff = readU32(dv, next, le);
      if (nextOff > 0 && nextOff < buffer.byteLength && nextOff !== offset) readIFD(nextOff, depth + 1);
    }
  }

  readIFD(readU32(dv, 4, le), 0);

  // 全文件扫描补漏：仅当 IFD 一无所获，或最大候选仍是缩略图级时才值得扫。
  // 现代机身的 IFD 预览通常就是全尺寸，直接跳过这个最重的步骤。
  const bestPixels = candidates.reduce((m, c) => Math.max(m, c.pixels), 0);
  if (candidates.length === 0 || bestPixels < 1200000) {
    const scanned = await scanAllJpegs(new Uint8Array(buffer), onProgress);
    for (const s of scanned) {
      if (!candidates.some((c) => c.bytes.length === s.bytes.length && c.pixels === s.pixels)) {
        candidates.push({ ...s, kind: "jpeg-scan" });
      }
    }
  }

  if (!candidates.length) {
    throw new Error(
      "这个 RAW 里没有可用的 JPEG 预览。请用相机「RAW+JPEG」格式，或从 Imaging Edge / Lightroom 导出 JPEG 后再导入。"
    );
  }

  // 像素优先；同分辨率时选码流更大的（通常压缩更好）
  candidates.sort((a, b) => {
    if (b.pixels !== a.pixels) return b.pixels - a.pixels;
    return b.bytes.length - a.bytes.length;
  });

  // 若最大预览很小（缩略图级），警告文案会带 raw 尺寸
  return await finalizeCandidate(candidates[0], buffer.byteLength, rawWidth, rawHeight, rawBits, candidates.length);
}

/** 全文件 JPEG 扫描：分块让出主线程，onProgress 0..1。
 *  内层找结尾最多看 64MB——CFA 数据里可能出现伪 FFD8FF，不设上限会退化成 O(N²)。 */
async function scanAllJpegs(bytes, onProgress) {
  const found = [];
  const MAX_CANDIDATE = 64 * 1024 * 1024;
  const CHUNK = 1 << 20; // 每 ~1MB 让出一次
  let nextYield = CHUNK;
  let i = 0;
  while (i < bytes.length - 4) {
    if (bytes[i] === 0xff && bytes[i + 1] === 0xd8 && bytes[i + 2] === 0xff) {
      const limit = Math.min(bytes.length - 1, i + MAX_CANDIDATE);
      let end = -1;
      for (let j = i + 3; j < limit; j++) {
        if (bytes[j] === 0xff && bytes[j + 1] === 0xd9) {
          end = j + 2;
          break;
        }
      }
      if (end > 0) {
        const slice = bytes.subarray(i, end);
        // 忽略过小的缩略图
        if (slice.length > 25000) {
          const dim = jpegDimensions(slice);
          const width = dim ? dim.width : 0;
          const height = dim ? dim.height : 0;
          found.push({
            bytes: slice,
            width,
            height,
            pixels: width * height,
            kind: "jpeg-scan",
          });
        }
        i = end;
      } else {
        i += 3; // 伪起始标记
      }
    } else {
      i++;
    }
    if (i >= nextYield) {
      nextYield = i + CHUNK;
      onProgress?.(i / bytes.length);
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  onProgress?.(1);
  return found;
}

async function finalizeCandidate(best, fileSize, rawW, rawH, rawBits, total) {
  // Blob 构造即拷贝：JPEG 字节自持，不再引用整个 RAW 缓冲（否则大文件无法 GC）
  const blob = new Blob([best.bytes], { type: "image/jpeg" });
  const dim = await imageBlobSize(blob);
  const width = dim.width || best.width;
  const height = dim.height || best.height;
  const mp = ((width * height) / 1e6).toFixed(1);
  const rawMp = rawW ? ((rawW * rawH) / 1e6).toFixed(1) : null;

  let source = `RAW 预览 · ${best.kind} · ${width}×${height} (${mp}MP)`;
  if (total && total > 1) source += ` · 已选文件内 ${total} 张预览中最大者`;
  if (rawW && rawH && (rawW > width || rawH > height)) {
    source += ` · 完整 RAW ${rawW}×${rawH} (${rawMp}MP${rawBits ? `, ${rawBits}bit` : ""})`;
  }

  return {
    blob,
    width,
    height,
    rawWidth: rawW || 0,
    rawHeight: rawH || 0,
    source,
    isFullRaw: rawW > 0 && width >= rawW * 0.95,
  };
}

function isRawFile(file) {
  const name = (file.name || "").toLowerCase();
  return (
    /\.(arw|cr2|cr3|nef|dng|orf|raf|rw2|pef|srw|arq|raw)$/.test(name) ||
    file.type === "image/x-sony-arw" ||
    file.type === "image/x-canon-cr2"
  );
}

/**
 * 统一入口：普通图片直接解码，RAW 提取内嵌最大预览
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
        note: `${file.name} · ${preview.source}`,
        rawWidth: preview.rawWidth,
        rawHeight: preview.rawHeight,
        isFullRaw: preview.isFullRaw,
        originalBlob: preview.blob,
        originalName: file.name.replace(/\.[^.]+$/i, "") + "-preview.jpg",
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
      rawWidth: img.naturalWidth,
      rawHeight: img.naturalHeight,
      isFullRaw: true,
      originalBlob: file,
      originalName: file.name,
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
