/**
 * 照片管家 — 本地文件夹扫描 / EXIF / 自动分类 / 重命名 / 写回磁盘
 * 全程本地，不经云端。写入依赖 File System Access API（Chrome / Edge）。
 */

/* ========== EXIF 最小解析 ========== */
function parseExifFromArrayBuffer(buffer) {
  try {
    const dv = new DataView(buffer);
    if (buffer.byteLength < 20) return {};
    // JPEG?
    if (dv.getUint8(0) === 0xff && dv.getUint8(1) === 0xd8) {
      return parseJpegExif(dv, buffer);
    }
    // TIFF (ARW 等)
    const bom = dv.getUint16(0, false);
    if (bom === 0x4949 || bom === 0x4d4d) {
      const le = bom === 0x4949;
      if (dv.getUint16(2, le) === 42) {
        return parseTiffExif(dv, buffer, le, dv.getUint32(4, le));
      }
    }
    return {};
  } catch {
    return {};
  }
}

function parseJpegExif(dv, buffer) {
  let i = 2;
  while (i < buffer.byteLength - 4) {
    if (dv.getUint8(i) !== 0xff) {
      i++;
      continue;
    }
    const marker = dv.getUint8(i + 1);
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const len = dv.getUint16(i + 2, false);
    if (marker === 0xe1) {
      // APP1
      const start = i + 4;
      if (start + 6 < buffer.byteLength) {
        const sig = String.fromCharCode(
          dv.getUint8(start),
          dv.getUint8(start + 1),
          dv.getUint8(start + 2),
          dv.getUint8(start + 3),
          dv.getUint8(start + 4),
          dv.getUint8(start + 5)
        );
        if (sig === "Exif\0\0") {
          const tiffOff = start + 6;
          const le = dv.getUint16(tiffOff, false) === 0x4949;
          if (dv.getUint16(tiffOff + 2, le) === 42) {
            return parseTiffExif(dv, buffer, le, tiffOff + dv.getUint32(tiffOff + 4, le), tiffOff);
          }
        }
      }
    }
    if (len < 2) break;
    i += 2 + len;
    if (marker === 0xda) break; // SOS
  }
  return {};
}

function parseTiffExif(dv, buffer, le, ifdOffset, tiffBase = 0) {
  const out = {
    dateTime: null,
    gps: null,
    make: null,
    model: null,
    lens: null,
    iso: null,
    shutter: null,
    aperture: null,
    focal: null,
    width: 0,
    height: 0,
  };

  function readIFD(offset, base, depth, isGps) {
    if (offset <= 0 || offset + 2 > buffer.byteLength || depth > 5) return;
    const entryCount = dv.getUint16(base + offset, le);
    if (entryCount > 400) return;
    let exifIFD = -1;
    let gpsIFD = -1;
    let gps = {};

    for (let i = 0; i < entryCount; i++) {
      const e = base + offset + 2 + i * 12;
      if (e + 12 > buffer.byteLength) break;
      const tag = dv.getUint16(e, le);
      const type = dv.getUint16(e + 2, le);
      const count = dv.getUint32(e + 4, le);
      const valOff = e + 8;

      const typeSize = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 }[type] || 1;
      const byteLen = typeSize * count;
      let ptr = valOff;
      if (byteLen > 4) ptr = base + dv.getUint32(valOff, le);

      function readAscii() {
        if (ptr + count > buffer.byteLength) return null;
        let s = "";
        for (let k = 0; k < count && k < 80; k++) {
          const c = dv.getUint8(ptr + k);
          if (c === 0) break;
          s += String.fromCharCode(c);
        }
        return s.trim();
      }

      function readRational() {
        if (ptr + 8 > buffer.byteLength) return 0;
        const num = dv.getUint32(ptr, le);
        const den = dv.getUint32(ptr + 4, le);
        return den === 0 ? 0 : num / den;
      }

      if (isGps) {
        if (tag === 1) gps.latRef = readAscii();
        if (tag === 2) {
          const a = readRational();
          ptr += 8;
          const b = readRational();
          ptr += 8;
          const c = readRational();
          gps.lat = a + b / 60 + c / 3600;
        }
        if (tag === 3) gps.lonRef = readAscii();
        if (tag === 4) {
          const a = readRational();
          ptr += 8;
          const b = readRational();
          ptr += 8;
          const c = readRational();
          gps.lon = a + b / 60 + c / 3600;
        }
        continue;
      }

      switch (tag) {
        case 256:
          out.width = type === 3 ? dv.getUint16(valOff, le) : dv.getUint32(valOff, le);
          break;
        case 257:
          out.height = type === 3 ? dv.getUint16(valOff, le) : dv.getUint32(valOff, le);
          break;
        case 271:
          out.make = readAscii();
          break;
        case 272:
          out.model = readAscii();
          break;
        case 306:
          out.dateTime = normalizeExifDate(readAscii());
          break;
        case 34853:
          gpsIFD = dv.getUint32(valOff, le);
          break;
        case 40962:
          if (!out.width) out.width = dv.getUint32(valOff, le);
          break;
        case 40963:
          if (!out.height) out.height = dv.getUint32(valOff, le);
          break;
        case 34665:
          exifIFD = dv.getUint32(valOff, le);
          break;
        case 33434:
          out.shutter = formatShutter(readRational());
          break;
        case 33437:
          out.aperture = readRational();
          break;
        case 34855:
          out.iso = type === 3 ? dv.getUint16(valOff, le) : dv.getUint32(valOff, le);
          break;
        case 37386:
          out.focal = readRational();
          break;
        case 42036:
          out.lens = readAscii();
          break;
        default:
          break;
      }
    }

    if (Object.keys(gps).length) {
      if (gps.lat != null && gps.lon != null) {
        const lat = gps.latRef === "S" ? -gps.lat : gps.lat;
        const lon = gps.lonRef === "W" ? -gps.lon : gps.lon;
        out.gps = { lat, lon };
      }
    }

    if (gpsIFD > 0) readIFD(gpsIFD, base, depth + 1, true);
    if (exifIFD > 0) readIFD(exifIFD, base, depth + 1, false);
  }

  readIFD(ifdOffset, tiffBase, 0, false);
  return out;
}

function formatShutter(sec) {
  if (!sec || !Number.isFinite(sec)) return null;
  if (sec >= 1) return (Math.round(sec * 10) / 10) + "s";
  return "1/" + Math.round(1 / sec) + "s";
}

function formatExifSummary(exif) {
  const parts = [];
  if (exif.make || exif.model) parts.push([exif.make, exif.model].filter(Boolean).join(" "));
  if (exif.lens) parts.push(exif.lens);
  const shot = [];
  if (exif.aperture) shot.push("f/" + (Math.round(exif.aperture * 10) / 10));
  if (exif.shutter) shot.push(exif.shutter);
  if (exif.iso) shot.push("ISO" + exif.iso);
  if (exif.focal) shot.push(Math.round(exif.focal) + "mm");
  if (shot.length) parts.push(shot.join(" · "));
  return parts.filter(Boolean).join(" | ");
}

function normalizeExifDate(s) {
  if (!s || s.length < 10) return null;
  // "2026:03:26 14:32:11" or "2026-03-26 14:32:11"
  const m = s.match(/(\d{4})[:\-](\d{2})[:\-](\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
}

/* ========== 自动分类启发式 ========== */
const CATEGORY_META = {
  人像: { icon: "👤", order: 1 },
  风光: { icon: "🏞", order: 2 },
  夜景: { icon: "🌃", order: 3 },
  街拍: { icon: "🚶", order: 4 },
  静物: { icon: "📷", order: 5 },
  文档: { icon: "📄", order: 6 },
  未分类: { icon: "📁", order: 9 },
};

function classifyImage(img, fileName) {
  const maxSide = 180;
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(8, Math.round(img.naturalWidth * scale));
  const h = Math.max(8, Math.round(img.naturalHeight * scale));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const n = w * h;

  let sumL = 0;
  let skin = 0, sky = 0, green = 0, dark = 0, warm = 0;
  let sumSat = 0, sumR = 0, sumB = 0;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    sumL += L;
    if (L < 40) dark++;
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
    sumSat += sat;
    sumR += r;
    sumB += b;
    if (r > 95 && g > 40 && b > 20 && r > g && g > b && maxC - minC > 15 && Math.abs(r - g) > 15) skin++;
    if (b > r && b > g && L > 70 && sat > 0.15) sky++;
    if (g > r && g > b && sat > 0.18) green++;
    if (r > b + 12 && L > 60) warm++;
  }

  const meanL = sumL / n;
  const skinR = skin / n;
  const skyR = sky / n;
  const greenR = green / n;
  const darkR = dark / n;
  const sat = sumSat / n;
  const warmth = (sumR / n - sumB / n) / 255;
  const aspect = img.naturalWidth / img.naturalHeight;

  const name = (fileName || "").toLowerCase();
  const nameHints = {
    人像: /portrait|dsc_|img_\d|face|人像|写真/.test(name),
    风光: /landscape|dsc_\d|view|scenery|风光|风景/.test(name),
    静物: /food|still|product|静物|美食/.test(name),
    文档: /scan|doc|paper|screenshot|截图|文档/.test(name),
  };

  // 规则优先级
  if (nameHints.文档 || (sat < 0.12 && meanL > 140 && skinR < 0.02 && skyR < 0.05)) {
    return { category: "文档", confidence: 0.75, reason: "低饱和高亮 / 文件名像文档" };
  }
  if (skinR > 0.1) {
    return { category: "人像", confidence: 0.72, reason: "肤色像素占比高" };
  }
  if (darkR > 0.35 && meanL < 70) {
    return { category: "夜景", confidence: 0.7, reason: "整体偏暗" };
  }
  if (skyR > 0.18 || greenR > 0.22) {
    return { category: "风光", confidence: 0.68, reason: skyR > greenR ? "天空占比高" : "植被占比高" };
  }
  if (aspect < 1.05 && skinR > 0.04) {
    return { category: "人像", confidence: 0.55, reason: "竖幅 + 少量肤色" };
  }
  if (aspect < 1.2 && meanL < 110 && darkR > 0.12 && warm > 0) {
    return { category: "街拍", confidence: 0.5, reason: "竖幅城市感" };
  }
  if (sat < 0.16 && meanL > 100) {
    return { category: "静物", confidence: 0.48, reason: "干净低饱和" };
  }
  return { category: "未分类", confidence: 0.3, reason: "特征不明显" };
}

/* ========== 命名规则 ========== */
/**
 * 规则（由本站约定）：
 *   目录: <根>/YYYY-MM/<类型>/
 *   文件: YYYYMMDD_HHmm_<类型>_<地点或序号>.<原扩展名>
 *   例:   2026-03/人像/20260326_1432_人像_西湖_001.jpg
 */
function buildOrganizedName(file, exif, category, locationLabel, seq) {
  const dt = (exif && exif.dateTime) || new Date(file.lastModified || Date.now());
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  const month = `${y}-${m}`;
  const day = `${y}${m}${d}`;
  const time = `${hh}${mm}`;

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const loc = (locationLabel || "").trim().replace(/[\\/:*?"<>|]/g, "").slice(0, 12);
  const locPart = loc ? `_${loc}` : "";
  const seqPart = String(seq).padStart(3, "0");

  const fileName = `${day}_${time}_${category}${locPart}_${seqPart}.${ext}`;
  const folder = `${month}/${category}`;
  return {
    folder,
    fileName,
    path: `${folder}/${fileName}`,
    dateLabel: `${y}-${m}-${d}`,
    timeLabel: `${hh}:${mm}`,
    gps: exif && exif.gps ? exif.gps : null,
  };
}

function isToday(date) {
  if (!date) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function isImageFile(file) {
  const name = (file.name || "").toLowerCase();
  return (
    /\.(jpe?g|png|webp|gif|arw|cr2|cr3|nef|dng|orf|raf|rw2|pef|srw|tiff?|heic|avif)$/.test(name) ||
    (file.type && file.type.startsWith("image/"))
  );
}

/* ========== File System Access ========== */
function supportsFileSystemAccess() {
  return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
}

async function pickDirectory(mode = "readwrite") {
  if (!supportsFileSystemAccess()) {
    throw new Error(
      "当前浏览器不支持本地文件夹写入。请用 Chrome / Edge 打开本站，才能选择文件夹并自动归类。"
    );
  }
  return window.showDirectoryPicker({ mode, id: "lightjournal-photos" });
}

async function listImagesInDirectory(dirHandle, max = 500) {
  const files = [];
  async function walk(handle, path = "") {
    if (files.length >= max) return;
    for await (const [name, h] of handle.entries()) {
      if (files.length >= max) return;
      if (h.kind === "directory") {
        await walk(h, path + name + "/");
      } else if (/\.(jpe?g|png|webp|gif|arw|cr2|cr3|nef|dng|orf|raf|rw2|pef|srw|tiff?|heic|avif)$/i.test(name)) {
        try {
          const file = await h.getFile();
          files.push({ file, handle: h, relPath: path + name });
        } catch {
          /* skip */
        }
      }
    }
  }
  await walk(dirHandle);
  return files;
}

async function ensureDirectory(rootHandle, folderPath) {
  const parts = folderPath.split("/").filter(Boolean);
  let cur = rootHandle;
  for (const p of parts) {
    cur = await cur.getDirectoryHandle(p, { create: true });
  }
  return cur;
}

async function writeFileToDirectory(rootHandle, folderPath, fileName, blob) {
  const dir = await ensureDirectory(rootHandle, folderPath);
  const fh = await dir.getFileHandle(fileName, { create: true });
  const writable = await fh.createWritable();
  await writable.write(blob);
  await writable.close();
}

async function readFileAsArrayBuffer(file, maxBytes = 12 * 1024 * 1024) {
  // 只读前 12MB 足够 EXIF；大文件避免卡顿
  if (file.size <= maxBytes) return file.arrayBuffer();
  return file.slice(0, maxBytes).arrayBuffer();
}

async function fileToImage(file) {
  // RAW 走内嵌预览
  if (isRawFile(file)) {
    const buf = await file.arrayBuffer();
    const preview = await extractRawPreview(buf);
    const url = URL.createObjectURL(preview.blob);
    const img = await loadImage(url);
    // 让调用方 cleanup
    img._objectUrl = url;
    return img;
  }
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  img._objectUrl = url;
  return img;
}

function isSameDay(d1, d2) {
  return (
    d1 &&
    d2 &&
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}
