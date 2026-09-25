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

  if (lock === "aperture") {
    // 改 ISO → 求 shutter，或改 shutter → 求 iso（这里：已知 aperture，按给出的 shutter/iso 之一配平）
    return {
      aperture: N,
      shutter,
      iso,
      ev: ev.toFixed(2),
    };
  }
  return { aperture: N, shutter, iso, ev: ev.toFixed(2) };
}

/** 已知 aperture, iso, 求 shutter 使曝光等同 reference */
function matchShutter(aperture, iso, refN, refT, refISO) {
  const t =
    shutterToSeconds(refT) *
    Math.pow(aperture / refN, 2) *
    (iso / refISO);
  return secondsToShutter(t);
}

function matchISO(aperture, shutter, refN, refT, refISO) {
  const iso =
    refISO *
    Math.pow(refN / aperture, 2) *
    (shutterToSeconds(refT) / shutterToSeconds(shutter));
  return Math.round(iso);
}

function matchAperture(shutter, iso, refN, refT, refISO) {
  const N =
    refN *
    Math.sqrt((shutterToSeconds(shutter) / shutterToSeconds(refT)) * (refISO / iso));
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
/**
 * 在画布右下角/指定角绘制文字水印
 * @param {HTMLCanvasElement} canvas
 * @param {{text:string, position:string, opacity:number, size:number, color:string}} opt
 */
function applyTextWatermark(canvas, opt) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const fontSize = Math.round(Math.min(w, h) * (opt.size || 0.035));
  const pad = Math.round(fontSize * 0.8);

  ctx.save();
  ctx.globalAlpha = (opt.opacity ?? 0.55);
  ctx.fillStyle = opt.color || "#ffffff";
  ctx.font = `500 ${fontSize}px "Noto Sans SC", system-ui, sans-serif`;
  ctx.textBaseline = "middle";

  const metrics = ctx.measureText(opt.text || "光影手帐");
  const tw = metrics.width;
  const th = fontSize;

  let x = pad;
  let y = h - pad - th / 2;
  if ((opt.position || "br").includes("r")) x = w - pad - tw;
  if ((opt.position || "br").includes("t")) y = pad + th / 2;
  if ((opt.position || "br").includes("c") && !opt.position?.includes("t") && !opt.position?.includes("b")) {
    y = h / 2;
    x = (w - tw) / 2;
  }

  // 阴影描边提升可读性
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = fontSize * 0.15;
  ctx.fillText(opt.text || "光影手帐", x, y);
  ctx.restore();
  return canvas;
}

/* ========== 选片对比评分 ========== */
function averagePickScores(list) {
  // list: [{score}] → 简单均分
  if (!list.length) return 0;
  return Math.round(list.reduce((s, x) => s + (x.score || 0), 0) / list.length);
}
