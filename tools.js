/**
 * 拍摄前计算器 + 水印 + 选片对比
 * 全部本地运算，黄金时刻用简化太阳方位公式（不需要联网）。
 */

/* ========== 曝光三角 ========== */
const APERTURES = [1.4, 1.8, 2, 2.5, 2.8, 3.5, 4, 4.5, 5.6, 6.3, 7.1, 8, 11, 14, 16, 22];
const SHUTTERS = [
  "1/4000", "1/3200", "1/2500", "1/2000", "1/1600", "1/1250", "1/1000", "1/800",
  "1/640", "1/500", "1/400", "1/320", "1/250", "1/200", "1/160", "1/125",
  "1/100", "1/80", "1/60", "1/50", "1/40", "1/30", "1/25", "1/20",
  "1/15", "1/13", "1/10", "1/8", "1/6", "1/5", "1/4", "1/3",
  "0.4", "0.5", "0.6", "0.8", "1", "1.3", "1.6", "2", "2.5", "3.2",
  "4", "5", "6", "8", "10", "15", "20", "30",
];
const ISOS = [50, 64, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6400, 8000, 10000, 12800, 16000, 20000, 25600, 51200, 102400];

function shutterToSeconds(s) {
  if (typeof s === "number") return s;
  const str = String(s).trim();
  if (str.includes("/")) {
    const [a, b] = str.split("/").map(Number);
    return b ? a / b : 1;
  }
  return Number(str) || 1;
}

function secondsToShutter(sec) {
  if (sec >= 1) return String(Math.round(sec * 10) / 10);
  return `1/${Math.round(1 / sec)}`;
}

/**
 * 保持等效曝光，求第三个参数
 * @param {{aperture:number, shutter:number|string, iso:number, lock:'aperture'|'shutter'|'iso'}}
 */
function solveExposure({ aperture, shutter, iso, lock }) {
  const N = Number(aperture);
  const t = shutterToSeconds(shutter);
  const ISO = Number(iso);
  // EV = 2*log2(N) - log2(t) + log2(ISO/100)  （保持恒定）
  const ev = 2 * Math.log2(N) - Math.log2(t) + Math.log2(ISO / 100);
  return { aperture: N, shutter, iso, ev: ev.toFixed(2) };
}

/** 已知 aperture, iso, 求 shutter 使曝光等同 reference */
function matchShutter(aperture, iso, refN, refT, refISO) {
  // t·ISO/N² 恒等：t = t_ref × (N/N_ref)² × (ISO_ref/ISO)
  const t =
    shutterToSeconds(refT) *
    Math.pow(aperture / refN, 2) *
    (refISO / iso);
  return secondsToShutter(t);
}

function matchISO(aperture, shutter, refN, refT, refISO) {
  // ISO = ISO_ref × (N/N_ref)² × (t_ref/t)
  const iso =
    refISO *
    Math.pow(aperture / refN, 2) *
    (shutterToSeconds(refT) / shutterToSeconds(shutter));
  return Math.round(iso);
}

function matchAperture(shutter, iso, refN, refT, refISO) {
  // N = N_ref × √(t/t_ref × ISO/ISO_ref)
  const N =
    refN *
    Math.sqrt((shutterToSeconds(shutter) / shutterToSeconds(refT)) * (iso / refISO));
  // 就近取标准光圈
  let best = APERTURES[0];
  let bestDiff = Math.abs(best - N);
  for (const a of APERTURES) {
    const d = Math.abs(a - N);
    if (d < bestDiff) {
      best = a;
      bestDiff = d;
    }
  }
  return best;
}

/* ========== 景深 / 超焦距 ========== */
/** c: 弥散圆直径（全画幅默认 0.03mm） */
const COC = {
  "全画幅": 0.03,
  "APS-C": 0.02,
  "M4/3": 0.015,
  "1英寸": 0.011,
  "手机主摄": 0.008,
};

function dofCalc({ focal, aperture, distance, sensor }) {
  const f = Number(focal); // mm
  const N = Number(aperture);
  const s = Number(distance) * 1000; // m → mm
  const c = COC[sensor] ?? 0.03;

  const H = (f * f) / (N * c) + f; // mm
  let near = 0;
  let far = 0;
  if (s > 0) {
    near = (s * (H - f)) / (H + s - 2 * f);
    if (s >= H) far = Infinity;
    else far = (s * (H - f)) / (H - s);
  }
  const total = far === Infinity ? Infinity : Math.max(0, far - near);

  return {
    hyperfocal: H / 1000, // m
    near: near / 1000,
    far: far === Infinity ? Infinity : far / 1000,
    total: total === Infinity ? Infinity : total / 1000,
  };
}

/* ========== ND 换算 ========== */
const ND_STOPS = {
  "ND2": 1,
  "ND4": 2,
  "ND8": 3,
  "ND16": 4,
  "ND32": 5,
  "ND64": 6,
  "ND100 (6.6档)": 6.6,
  "ND1000": 10,
  "ND2000": 11,
  "ND3200": 11.6,
  "ND6400": 12.6,
  "ND10000": 13.3,
  "ND64000": 16,
};

function ndConvert(baseShutter, stops) {
  const t = shutterToSeconds(baseShutter) * Math.pow(2, Number(stops));
  return {
    seconds: t,
    label: t >= 1 ? `${Math.round(t * 10) / 10}s` : secondsToShutter(t),
    friendly: formatLongExposure(t),
  };
}

function formatLongExposure(sec) {
  if (sec < 60) return `${Math.round(sec * 10) / 10} 秒`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m} 分 ${s} 秒`;
}

/* ========== 黄金时刻（本地太阳计算，无网络） ========== */
/**
 * 简化算法：太阳赤纬 + 时角 → 日出日落 / 黄金时刻 / 蓝调时刻
 * 返回本地时间 Date 对象
 */
function sunTimes(date, latDeg, lonDeg) {
  const rad = Math.PI / 180;
  const lat = latDeg * rad;

  // 距 J2000 的儒略日
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date - start) / 86400000);

  // 赤纬（简化）
  const decl = 23.44 * rad * Math.sin(2 * Math.PI * (dayOfYear - 81) / 365);

  // 日出时角
  const zenith = 90.833 * rad; // 含大气折射
  const cosH =
    (Math.cos(zenith) / (Math.cos(lat) * Math.cos(decl))) - Math.tan(lat) * Math.tan(decl);

  if (cosH > 1) return { polar: "极夜" };
  if (cosH < -1) return { polar: "极昼" };

  const H = Math.acos(cosH) / rad; // 度

  // 均时差（简化）
  const B = (2 * Math.PI * (dayOfYear - 81)) / 364;
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);

  // 正午（UTC 小时）
  const solarNoonUTC = 12 - lonDeg / 15 - eot / 60;
  const sunriseUTC = solarNoonUTC - H / 15;
  const sunsetUTC = solarNoonUTC + H / 15;

  function utcHoursToDate(hours) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setUTCHours(Math.floor(hours), Math.round((hours % 1) * 60), 0, 0);
    return d;
  }

  const sunrise = utcHoursToDate(sunriseUTC);
  const sunset = utcHoursToDate(sunsetUTC);

  // 黄金时刻：日出后/日落前约 1 小时（按日照时长的 1/4 近似）
  const dayLengthH = 2 * H / 15;
  const golden = Math.min(1.0, Math.max(0.4, dayLengthH / 6));

  function shift(d, hours) {
    return new Date(d.getTime() + hours * 3600 * 1000);
  }

  return {
    sunrise,
    sunset,
    goldenMorning: { start: sunrise, end: shift(sunrise, golden) },
    goldenEvening: { start: shift(sunset, -golden), end: sunset },
    blueMorning: { start: shift(sunrise, -golden * 0.45), end: sunrise },
    blueEvening: { start: sunset, end: shift(sunset, golden * 0.45) },
  };
}

function fmtTime(d) {
  if (!d || !(d instanceof Date)) return "—";
  return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

/* ========== 水印 ========== */
/* ========== 水印（多版式 / 参数条 / Logo / 平铺 / 白边） ========== */
const WM_PRESET_KEY = "lightjournal.wmPreset";

function loadWmPreset() {
  try {
    return JSON.parse(localStorage.getItem(WM_PRESET_KEY) || "null");
  } catch {
    return null;
  }
}

function saveWmPreset(cfg) {
  localStorage.setItem(WM_PRESET_KEY, JSON.stringify({ ...cfg, logo: undefined }));
}

/**
 * 绘制水印
 * @param {HTMLCanvasElement} canvas
 * @param {{
 *   type: 'text'|'exif'|'logo'|'combo'|'tile'|'frame',
 *   style: 'br'|'bl'|'tr'|'c'|'bar',
 *   text: string, sub: string, opacity: number, size: number,
 *   showExif: boolean, logoImage?: HTMLImageElement|null,
 *   exif?: {aperture?:string,shutter?:string,iso?:string,focal?:string} | null
 * }} opt
 */
function drawWatermark(canvas, opt) {
  const o = {
    type: opt.type || "text",
    style: opt.style || "br",
    text: opt.text || "© 光影手帐",
    sub: opt.sub || "",
    opacity: (opt.opacity ?? 60) / 100,
    size: (opt.size ?? 36) / 1000,
    showExif: !!opt.showExif,
    logoImage: opt.logoImage || null,
    exif: opt.exif || null,
  };

  if (o.type === "frame") return drawFrameBorder(canvas, o);
  if (o.type === "tile") return drawTileWatermark(canvas, o);

  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const base = Math.min(w, h);

  ctx.save();
  ctx.globalAlpha = o.opacity;

  const exifLine = o.exif
    ? [o.exif.aperture && `f/${String(o.exif.aperture).replace(/^f\//, "")}`, o.exif.shutter, o.exif.iso && `ISO${o.exif.iso}`, o.exif.focal && `${o.exif.focal}`]
        .filter(Boolean)
        .join("  ·  ")
    : "";

  if (o.type === "logo" && o.logoImage) {
    drawLogo(ctx, o.logoImage, w, h, o.style, base);
  } else if (o.type === "exif") {
    drawExifBar(ctx, w, h, exifLine || o.text, o);
  } else if (o.type === "combo") {
    drawCombo(ctx, w, h, o, exifLine);
  } else {
    drawTextMark(ctx, w, h, o, exifLine);
  }

  ctx.restore();
  return canvas;
}

function shadowText(ctx, text, x, y, font, fill, align = "left") {
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = Math.max(4, parseInt(font) * 0.12);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
}

function drawTextMark(ctx, w, h, o, exifLine) {
  const fontSize = Math.round(Math.min(w, h) * o.size);
  const pad = Math.round(fontSize * 0.9);
  const font = `500 ${fontSize}px "Noto Sans SC", system-ui, sans-serif`;
  let x = pad;
  let y = h - pad;
  if (o.style === "bl") x = pad;
  else if (o.style === "tr") { x = w - pad; y = pad; }
  else if (o.style === "c") { x = w / 2; y = h / 2; }
  else x = w - pad;

  const align = o.style === "bl" ? "left" : o.style === "tr" || o.style === "br" ? "right" : "center";
  shadowText(ctx, o.text, x, y, font, "#ffffff", align);
  if (o.sub) {
    shadowText(ctx, o.sub, x, y + fontSize * 1.25, `${Math.round(fontSize * 0.55)}px system-ui`, "rgba(255,255,255,0.85)", align);
  }
  if (o.showExif && exifLine) {
    shadowText(ctx, exifLine, x, y + (o.sub ? fontSize * 2 : fontSize * 1.3), `${Math.round(fontSize * 0.5)}px "JetBrains Mono", monospace`, "rgba(255,255,255,0.75)", align);
  }
}

function drawExifBar(ctx, w, h, line, o) {
  const fontSize = Math.round(Math.min(w, h) * o.size * 0.55);
  const barH = Math.round(fontSize * 2.2);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, h - barH, w, barH);
  shadowText(ctx, line, w / 2, h - barH / 2, `500 ${fontSize}px "JetBrains Mono", monospace`, "#f0e9de", "center");
  if (o.text) {
    shadowText(ctx, o.text, w / 2, h - barH - fontSize * 0.9, `500 ${Math.round(fontSize * 0.95)}px system-ui`, "#ffffff", "center");
  }
}

function drawCombo(ctx, w, h, o, exifLine) {
  const pad = Math.round(Math.min(w, h) * 0.035);
  const fontSize = Math.round(Math.min(w, h) * o.size * 0.7);
  // logo left
  if (o.logoImage) {
    const lh = fontSize * 1.5;
    const ratio = o.logoImage.width / o.logoImage.height || 1;
    const lw = lh * ratio;
    ctx.globalAlpha = o.opacity * 0.95;
    ctx.drawImage(o.logoImage, pad, h - pad - lh, lw, lh);
  }
  const x = o.logoImage ? pad + fontSize * 2.2 : pad;
  shadowText(ctx, o.text, x, h - pad - fontSize * 0.2, `600 ${fontSize}px system-ui`, "#ffffff", "left");
  if (o.sub) {
    shadowText(ctx, o.sub, x, h - pad + fontSize * 0.9, `400 ${Math.round(fontSize * 0.55)}px system-ui`, "rgba(255,255,255,0.8)", "left");
  }
  if (o.showExif && exifLine) {
    shadowText(ctx, exifLine, w - pad, h - pad, `500 ${Math.round(fontSize * 0.5)}px monospace`, "rgba(255,255,255,0.8)", "right");
  }
}

function drawLogo(ctx, logo, w, h, style, base) {
  const maxH = base * 0.12;
  const ratio = logo.width / logo.height || 1;
  const lh = maxH;
  const lw = lh * ratio;
  const pad = base * 0.04;
  let x = w - pad - lw;
  let y = h - pad - lh;
  if (style === "bl") x = pad;
  else if (style === "tr") { x = w - pad - lw; y = pad; }
  else if (style === "c") { x = (w - lw) / 2; y = (h - lh) / 2; }
  ctx.drawImage(logo, x, y, lw, lh);
}

function drawTileWatermark(canvas, o) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const fontSize = Math.round(Math.min(w, h) * o.size * 0.9);
  ctx.save();
  ctx.globalAlpha = o.opacity;
  ctx.font = `600 ${fontSize}px system-ui`;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const gapX = fontSize * 8;
  const gapY = fontSize * 3.5;
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-Math.PI / 7);
  for (let y = -h; y < h; y += gapY) {
    for (let x = -w; x < w; x += gapX) {
      ctx.fillText(o.text, x + ((y / gapY) % 2) * (gapX / 2), y);
    }
  }
  ctx.restore();
  return canvas;
}

function drawFrameBorder(canvas, o) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const base = Math.min(w, h);
  const m = Math.round(base * 0.035);
  const bar = Math.round(base * 0.085);
  const out = document.createElement("canvas");
  out.width = w + m * 2;
  out.height = h + m + bar;
  const octx = out.getContext("2d");
  octx.fillStyle = "#f7f2ea";
  octx.fillRect(0, 0, out.width, out.height);
  octx.drawImage(canvas, m, m);
  // caption
  octx.globalAlpha = 1;
  const fs = Math.round(bar * 0.38);
  shadowText(octx, o.text, m, m + h + bar / 2, `500 ${fs}px system-ui`, "#2a241c", "left");
  if (o.showExif && o.exif) {
    const line = [o.exif.aperture && `f/${String(o.exif.aperture).replace(/^f\//, "")}`, o.exif.shutter, o.exif.iso && `ISO${o.exif.iso}`, o.exif.focal]
      .filter(Boolean)
      .join("  ·  ");
    shadowText(octx, line, out.width - m, m + h + bar / 2, `400 ${Math.round(fs * 0.85)}px monospace`, "#8a7d6c", "right");
  }
  // replace canvas content
  canvas.width = out.width;
  canvas.height = out.height;
  canvas.getContext("2d").drawImage(out, 0, 0);
}

function formatExifWatermark(exif) {
  if (!exif) return null;
  return {
    aperture: exif.aperture ? (typeof exif.aperture === "number" ? exif.aperture : String(exif.aperture).replace(/^f\//, "")) : "",
    shutter: exif.shutter || "",
    iso: exif.iso ? String(exif.iso).replace(/^ISO/i, "") : "",
    focal: exif.focal ? (typeof exif.focal === "number" ? Math.round(exif.focal) + "mm" : exif.focal) : "",
  };
}

/* ========== 选片对比评分 ========== */
function averagePickScores(list) {
  // list: [{score}] → 简单均分
  if (!list.length) return 0;
  return Math.round(list.reduce((s, x) => s + (x.score || 0), 0) / list.length);
}
