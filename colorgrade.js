/**
 * 本地调色引擎 + 大模型调色接口
 * 所有像素处理都在浏览器 Canvas 完成；LLM 仅在你主动启用时接收缩略图。
 */

/* ========== 调色参数 ========== */
const DEFAULT_GRADE = {
  exposure: 0,      // -2 .. 2 EV
  contrast: 0,      // -100 .. 100
  highlights: 0,    // -100 .. 100
  shadows: 0,       // -100 .. 100
  whites: 0,        // -100 .. 100
  blacks: 0,        // -100 .. 100
  temp: 0,          // -100 冷 .. 100 暖
  tint: 0,          // -100 绿 .. 100 品红
  vibrance: 0,      // -100 .. 100
  saturation: 0,    // -100 .. 100
  clarity: 0,       // -100 .. 100
  fade: 0,          // 0 .. 100 褪色胶片感
  vignette: 0,      // 0 .. 100 暗角
  // 色调曲线（阴影 / 中间调 / 高光）
  curveShadows: 0,  // -100..100
  curveMids: 0,
  curveHighlights: 0,
  // HSL 主色微调
  hueRed: 0, hueOrange: 0, hueYellow: 0, hueGreen: 0, hueAqua: 0, hueBlue: 0,
  satRed: 0, satOrange: 0, satYellow: 0, satGreen: 0, satAqua: 0, satBlue: 0,
  // 分离色调
  splitHue: 0,      // 高光色相 0-360（用 0 表示关闭）
  splitHueShadow: 0,
  splitStrength: 0, // 0-100
  // 胶片质感
  grain: 0,         // 0-100 颗粒
  halation: 0,      // 0-100 高光光晕
};

/** 风格预设 */
/**
 * 风格预设（内置精选）
 * 参考主流胶片卷 / 电影 LUT / 修图 App 体系整理，参数为在本引擎下逼近观感的近似值。
 */
const GRADE_PRESETS = [
  // —— 基础 ——
  { id: "auto", name: "自动校正", cat: "基础", desc: "直方图驱动：曝光居中、拉对比、保护高光", params: "AUTO" },
  { id: "clean", name: "干净通透", cat: "基础", desc: "轻微提亮、柔对比", params: { ...DEFAULT_GRADE, exposure: 0.12, contrast: 6, highlights: -14, shadows: 12, vibrance: 10 } },
  { id: "pop", name: "风光强化", cat: "基础", desc: "通透、高饱和、强清晰", params: { ...DEFAULT_GRADE, exposure: 0.08, contrast: 16, highlights: -18, shadows: 12, temp: 6, vibrance: 22, saturation: 10, clarity: 14 } },
  { id: "matte", name: "哑光质感", cat: "基础", desc: "压白提黑、低对比", params: { ...DEFAULT_GRADE, contrast: -18, highlights: -24, shadows: 16, whites: -20, blacks: 28, saturation: -8, fade: 18 } },

  // —— 胶片 ——
  { id: "portra400", name: "人像 Portra 400", cat: "胶片", desc: "人像暖肤、奶油高光", params: { ...DEFAULT_GRADE, exposure: 0.12, contrast: 4, highlights: -18, shadows: 16, temp: 16, tint: 8, vibrance: 10, saturation: -4, clarity: -8, fade: 8 , grain: 16, halation: 10} },
  { id: "portra800", name: "人像 Portra 800", cat: "胶片", desc: "更暖、颗粒感、街头人像", params: { ...DEFAULT_GRADE, exposure: 0.1, contrast: 8, highlights: -16, shadows: 14, temp: 20, tint: 6, vibrance: 12, saturation: -2, fade: 12, vignette: 10 , grain: 22, halation: 12} },
  { id: "fuji400h", name: "富士 400H", cat: "胶片", desc: "青绿调、清新胶片", params: { ...DEFAULT_GRADE, exposure: 0.15, contrast: -6, highlights: -12, shadows: 18, temp: -10, tint: -8, vibrance: 8, saturation: -10, fade: 10 , grain: 12, halation: 8} },
  { id: "superia", name: "富士 Superia 400", cat: "胶片", desc: "青色偏移、日系日常", params: { ...DEFAULT_GRADE, contrast: 6, highlights: -12, shadows: 10, temp: -8, tint: -6, vibrance: 14, saturation: -4, fade: 8 , grain: 14, halation: 8} },
  { id: "cinestill", name: "CineStill 800T 钨丝", cat: "胶片", desc: "钨丝灯青调、夜景霓虹", params: { ...DEFAULT_GRADE, exposure: -0.05, contrast: 12, highlights: -20, shadows: -6, temp: -28, tint: 8, vibrance: 18, saturation: -2, clarity: 8, vignette: 14 , grain: 26, halation: 52} },
  { id: "trix", name: "Tri-X 400 高反差", cat: "胶片", desc: "高反差黑白、纪实", params: { ...DEFAULT_GRADE, exposure: 0.05, contrast: 22, highlights: -14, shadows: -8, clarity: 16, saturation: -100, fade: 8, vignette: 12 , grain: 30, halation: 6} },
  { id: "hp5", name: "Ilford HP5 柔调", cat: "胶片", desc: "柔和黑白、灰阶丰富", params: { ...DEFAULT_GRADE, contrast: 10, highlights: -10, shadows: 12, blacks: 8, clarity: 6, saturation: -100, fade: 12 , grain: 18, halation: 5} },
  { id: "polaroid", name: "拍立得", cat: "胶片", desc: "褪色、粉调、梦幻", params: { ...DEFAULT_GRADE, exposure: 0.18, contrast: -12, highlights: -20, shadows: 22, temp: 12, tint: 14, vibrance: -4, saturation: -14, fade: 28, vignette: 16 , grain: 20, halation: 18} },
  { id: "filmclassic", name: "经典褪色", cat: "胶片", desc: "老电影、抬黑压白", params: { ...DEFAULT_GRADE, contrast: -8, highlights: -16, shadows: 20, whites: -14, blacks: 22, saturation: -12, vibrance: 6, fade: 24, vignette: 10 , grain: 16, halation: 10} },

  // —— 电影 ——
  { id: "tealorange", name: "青橙大片", cat: "电影", desc: "好莱坞 Teal & Orange", params: { ...DEFAULT_GRADE, exposure: -0.05, contrast: 18, highlights: -24, shadows: -6, temp: -6, tint: 6, vibrance: 16, saturation: -2, clarity: 10, hueBlue: 24, hueOrange: -10, vignette: 18, splitStrength: 30, splitHue: 40, splitHueShadow: 200 , grain: 8, halation: 12} },
  { id: "bladerunner", name: "银翼杀手", cat: "电影", desc: "赛博青紫、高对比", params: { ...DEFAULT_GRADE, exposure: -0.12, contrast: 22, highlights: -18, shadows: -12, temp: -22, tint: 16, vibrance: 14, saturation: -6, clarity: 12, vignette: 22, splitStrength: 36, splitHue: 220, splitHueShadow: 280 , grain: 12, halation: 22} },
  { id: "wes", name: "韦斯·安德森", cat: "电影", desc: "对称粉黄、复古糖果色", params: { ...DEFAULT_GRADE, exposure: 0.1, contrast: 8, highlights: -12, shadows: 12, temp: 18, tint: 12, vibrance: 16, saturation: 6, fade: 10, splitStrength: 18, splitHue: 50, splitHueShadow: 320 } },
  { id: "noir", name: "黑色电影", cat: "电影", desc: "低调、硬光、戏剧", params: { ...DEFAULT_GRADE, exposure: -0.18, contrast: 28, highlights: -20, shadows: -16, whites: 10, blacks: -10, clarity: 18, saturation: -100, vignette: 28 , grain: 16, halation: 4} },
  { id: "moonlight", name: "月光蓝调", cat: "电影", desc: "忧郁蓝、低饱和", params: { ...DEFAULT_GRADE, exposure: -0.1, contrast: 14, highlights: -16, shadows: -8, temp: -30, tint: 8, vibrance: -6, saturation: -16, fade: 14, vignette: 16, splitStrength: 24, splitHueShadow: 210 , grain: 14, halation: 18} },
  { id: "golden", name: "黄金时刻", cat: "电影", desc: "暖金、柔高光", params: { ...DEFAULT_GRADE, exposure: 0.12, contrast: 10, highlights: -18, shadows: 14, temp: 24, tint: 6, vibrance: 14, saturation: 4, clarity: 4, fade: 6, splitStrength: 20, splitHue: 45 , grain: 10, halation: 16} },

  // —— 日系 / 人像 ——
  { id: "japan", name: "日系清冷", cat: "人像", desc: "高调、偏冷、低对比", params: { ...DEFAULT_GRADE, exposure: 0.25, contrast: -14, highlights: -12, shadows: 24, temp: -18, tint: -4, vibrance: 6, saturation: -12, fade: 12 } },
  { id: "japanwarm", name: "日系暖调", cat: "人像", desc: "胶片暖、奶油肌", params: { ...DEFAULT_GRADE, exposure: 0.18, contrast: -6, highlights: -16, shadows: 18, temp: 14, tint: 6, vibrance: 8, saturation: -8, clarity: -6, fade: 10 , grain: 12, halation: 8} },
  { id: "skin", name: "人像暖肤", cat: "人像", desc: "偏暖、柔对比、通透", params: { ...DEFAULT_GRADE, exposure: 0.15, contrast: 8, highlights: -20, shadows: 18, temp: 18, tint: 6, vibrance: 12, clarity: -6, fade: 6 } },
  { id: "candy", name: "糖果少女", cat: "人像", desc: "粉紫、高明度", params: { ...DEFAULT_GRADE, exposure: 0.22, contrast: -8, highlights: -14, shadows: 20, temp: 8, tint: 20, vibrance: 14, saturation: -2, fade: 12, splitStrength: 16, splitHue: 320 } },
  { id: "mori", name: "森系自然", cat: "人像", desc: "绿调、柔和", params: { ...DEFAULT_GRADE, exposure: 0.12, contrast: -4, highlights: -14, shadows: 16, temp: -6, tint: -12, vibrance: 10, saturation: -6, fade: 8, splitStrength: 14, splitHueShadow: 120 } },

  // —— 黑白 / 风格 ——
  { id: "bw", name: "经典黑白", cat: "黑白", desc: "高反差银盐", params: { ...DEFAULT_GRADE, contrast: 24, highlights: -16, shadows: -6, clarity: 18, saturation: -100, vignette: 16 , grain: 14, halation: 4} },
  { id: "bwsoft", name: "柔和黑白", cat: "黑白", desc: "灰阶、肖像", params: { ...DEFAULT_GRADE, contrast: 8, highlights: -12, shadows: 14, clarity: 4, saturation: -100, fade: 10 , grain: 12, halation: 3} },
  { id: "bwhyper", name: "高反差黑白", cat: "黑白", desc: "街头、硬光", params: { ...DEFAULT_GRADE, exposure: -0.05, contrast: 36, highlights: -10, shadows: -18, clarity: 24, saturation: -100, vignette: 22 , grain: 20, halation: 4} },
  { id: "crush", name: "浓墨重彩", cat: "风格", desc: "高对比、高饱和", params: { ...DEFAULT_GRADE, exposure: -0.05, contrast: 24, highlights: -18, shadows: -8, vibrance: 22, saturation: 12, clarity: 16, vignette: 14 } },
  { id: "fadeout", name: "褪色怀旧", cat: "风格", desc: "胶片褪色、低反差", params: { ...DEFAULT_GRADE, contrast: -16, highlights: -22, shadows: 20, whites: -18, blacks: 26, saturation: -16, fade: 30, vignette: 12 , grain: 22, halation: 8} },
  { id: "coldfilm", name: "冷调电影", cat: "风格", desc: "清冷、克制", params: { ...DEFAULT_GRADE, exposure: -0.04, contrast: 12, highlights: -16, shadows: -4, temp: -18, tint: 4, vibrance: -4, saturation: -12, clarity: 8, vignette: 12 , grain: 12, halation: 10} },
];

/** 用户自定义预设（localStorage） */
const USER_PRESET_KEY = "lightjournal.userPresets";

function loadUserPresets() {
  try {
    return JSON.parse(localStorage.getItem(USER_PRESET_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveUserPreset(name, params, desc, masks) {
  const list = loadUserPresets();
  const item = {
    id: "u_" + Date.now().toString(36),
    name: (name || "自定义").slice(0, 16),
    desc: (desc || "").slice(0, 30),
    cat: "我的",
    params: { ...DEFAULT_GRADE, ...params },
    masks: Array.isArray(masks) ? masks : [],
    createdAt: new Date().toISOString(),
  };
  list.unshift(item);
  localStorage.setItem(USER_PRESET_KEY, JSON.stringify(list.slice(0, 40)));
  return item;
}

function deleteUserPreset(id) {
  const list = loadUserPresets().filter((x) => x.id !== id);
  localStorage.setItem(USER_PRESET_KEY, JSON.stringify(list));
}

function exportPresetJSON(preset) {
  return {
    format: "lightjournal-preset",
    version: 1,
    name: preset.name,
    desc: preset.desc || "",
    params: preset.params === "AUTO" ? "AUTO" : { ...DEFAULT_GRADE, ...preset.params },
    masks: preset.masks || [],
  };
}

function importPresetJSON(obj) {
  if (!obj || typeof obj !== "object") throw new Error("无效的预设文件");
  if (obj.params === "AUTO") {
    return saveUserPreset(obj.name || "导入预设", { ...DEFAULT_GRADE }, obj.desc || "");
  }
  return saveUserPreset(obj.name || "导入预设", sanitizeGradeParams(obj.params), obj.desc || "");
}

/* ========== 导入校验（预设来自外部文件，数值不可信） ========== */
const GRADE_RANGES = {
  exposure: [-2, 2],
  fade: [0, 100],
  vignette: [0, 100],
  splitStrength: [0, 100],
  splitHue: [0, 360],
  splitHueShadow: [0, 360],
  grain: [0, 100],
  halation: [0, 100],
};

function sanitizeGradeParams(raw) {
  const out = { ...DEFAULT_GRADE };
  if (!raw || typeof raw !== "object") return out;
  for (const k of Object.keys(DEFAULT_GRADE)) {
    const n = Number(raw[k]);
    if (!Number.isFinite(n)) continue; // 非法值回落默认 0
    const range = GRADE_RANGES[k] || [-100, 100];
    out[k] = clamp(n, range[0], range[1]);
  }
  return out;
}

function sanitizeMasks(input) {
  if (!Array.isArray(input)) return [];
  const num = (v, lo, hi, dflt) => {
    const n = Number(v);
    return Number.isFinite(n) ? clamp(n, lo, hi) : dflt;
  };
  return input.slice(0, 12).map((m, i) => {
    const base = m && m.type === "grad" ? createGradMask() : createRadialMask();
    if (!m || typeof m !== "object") return base;
    base.id = typeof m.id === "string" && m.id.length <= 40 ? m.id : base.id + i;
    base.x = num(m.x, -1, 2, base.x);
    base.y = num(m.y, -1, 2, base.y);
    base.feather = num(m.feather, 0, 1, base.feather);
    base.invert = !!m.invert;
    if (base.type === "radial") {
      base.rx = num(m.rx, 0.01, 1.5, base.rx);
      base.ry = num(m.ry, 0.01, 1.5, base.ry);
    } else {
      base.angle = num(m.angle, -360, 360, base.angle);
      base.length = num(m.length, 0.02, 2, base.length);
    }
    base.params = sanitizeGradeParams(m.params);
    return base;
  });
}

/* ========== 像素级调色 ==========
 * 结构：buildGradeSession 只做一次预计算（LUT/系数），主循环按行带执行，
 * 同一核心同时服务同步 applyGrade（预览）与分块 applyGradeAsync（全尺寸导出）。
 * 热循环内零对象分配：HSL 旋钮经模块级 scratch 传递，避免每像素 new Array。
 */
const _hslOut = new Float64Array(3);

/** 单个 HSL 旋钮（与旧版逐旋钮累计顺序一致，中间不做钳制） */
function hslKnob(r, g, b, dh, ds, w, isWarm) {
  const hueAmt = dh * w * 0.01;
  let nr = r, ng = g, nb = b;
  if (isWarm) {
    nr += hueAmt * 38;
    nb -= hueAmt * 38;
  } else {
    nr -= hueAmt * 38;
    nb += hueAmt * 38;
  }
  const Lv = 0.2126 * nr + 0.7152 * ng + 0.0722 * nb;
  const sm = 1 + (ds / 100) * w * 0.55;
  _hslOut[0] = Lv + (nr - Lv) * sm;
  _hslOut[1] = Lv + (ng - Lv) * sm;
  _hslOut[2] = Lv + (nb - Lv) * sm;
}

function buildGradeSession(srcCanvas, params) {
  const w = srcCanvas.width;
  const h = srcCanvas.height;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d");
  ctx.drawImage(srcCanvas, 0, 0);

  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  const p = { ...DEFAULT_GRADE, ...params };

  // 预计算曲线
  const evMul = Math.pow(2, p.exposure);
  const contrast = p.contrast / 100;
  const sat = 1 + p.saturation / 100;
  const vib = p.vibrance / 100;
  const fade = p.fade / 100;
  const clarity = p.clarity / 100;
  const hi = p.highlights / 100;
  const sh = p.shadows / 100;
  const wh = p.whites / 100;
  const bl = p.blacks / 100;

  // 白平衡：temp/tint
  const t = p.temp / 100;
  const ti = p.tint / 100;
  const rGain = 1 + t * 0.28 + ti * 0.08;
  const gGain = 1 - ti * 0.12;
  const bGain = 1 - t * 0.28 + ti * 0.06;

  const hiOn = hi !== 0;
  const shOn = sh !== 0;
  const whOn = wh !== 0;
  const blOn = bl !== 0;
  const hasSat = sat !== 1 || vib !== 0;
  const hasFade = fade !== 0;
  const hasSplit = !!p.splitStrength;
  const hasHSL =
    p.hueRed || p.hueOrange || p.hueYellow || p.hueGreen || p.hueAqua || p.hueBlue ||
    p.satRed || p.satOrange || p.satYellow || p.satGreen || p.satAqua || p.satBlue;

  // clarity 是局部对比，这里用亮度域软对比近似
  const clarityCurve = (v) => {
    const x = v / 255;
    const k = clarity * 0.35;
    const y = x + k * (x - 0.5) * (1 - Math.abs(x - 0.5) * 2);
    return clamp(y * 255, 0, 255);
  };

  const contrastCurve = (v) => {
    const x = v / 255;
    const y = 0.5 + (x - 0.5) * (1 + contrast * 0.85);
    return clamp(y * 255, 0, 255);
  };

  // 色调曲线：阴影 / 中间调 / 高光
  const applyCurve = (L) => {
    const x = clamp(L, 0, 255) / 255;
    let y = x;
    if (p.curveShadows !== 0) y += (p.curveShadows / 100) * 0.22 * (1 - x) * (1 - x);
    if (p.curveMids !== 0) y += (p.curveMids / 100) * 0.2 * (1 - Math.abs(x - 0.5) * 2);
    if (p.curveHighlights !== 0) y += (p.curveHighlights / 100) * 0.22 * x * x;
    return clamp(y * 255, 0, 255);
  };

  // 对比 / 清晰度 / 色调曲线都是亮度的值函数 → 合成一张 256 项查找表
  const hasTone =
    contrast !== 0 || clarity !== 0 ||
    p.curveShadows !== 0 || p.curveMids !== 0 || p.curveHighlights !== 0;
  let toneLUT = null;
  if (hasTone) {
    toneLUT = new Float64Array(256);
    for (let v = 0; v < 256; v++) toneLUT[v] = applyCurve(clarityCurve(contrastCurve(v)));
  }

  // 褪色按通道值函数 → 256 项查找表（曲线输出是 0..255 像素域，必须 ×255）
  let fadeLUT = null;
  if (hasFade) {
    fadeLUT = new Uint8ClampedArray(256);
    for (let v = 0; v < 256; v++) {
      const x = v / 255;
      fadeLUT[v] = (fade * 0.18 + x * (1 - fade * 0.28)) * 255;
    }
  }

  // 暗角参数
  const hasVignette = p.vignette > 0;
  const vigAmount = p.vignette / 100;
  const vigCx = w / 2;
  const vigCy = h / 2;
  const vigMaxD = Math.sqrt(vigCx * vigCx + vigCy * vigCy);

  // 颗粒
  const hasGrain = p.grain > 0;
  const grainStrength = p.grain / 100;

  // 光晕：1/4 分辨率掩膜，主循环前一次性算好
  let halMask = null;
  let halSw = 0;
  let halSh = 0;
  const halAmt = p.halation / 100;
  if (p.halation > 0) {
    halSw = Math.max(8, w >> 2);
    halSh = Math.max(8, h >> 2);
    halMask = new Float32Array(halSw * halSh);
    for (let y = 0; y < halSh; y++) {
      for (let x = 0; x < halSw; x++) {
        const sx = Math.min(w - 1, (x * w) / halSw | 0);
        const sy = Math.min(h - 1, (y * h) / halSh | 0);
        const i = (sy * w + sx) * 4;
        const L = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        halMask[y * halSw + x] = L > 200 ? (L - 200) / 55 : 0;
      }
    }
    const blur = (arr, ww, hh, r) => {
      const tmp = new Float32Array(arr.length);
      for (let y = 0; y < hh; y++) {
        for (let x = 0; x < ww; x++) {
          let s = 0, n = 0;
          for (let k = -r; k <= r; k++) {
            const xx = x + k;
            if (xx < 0 || xx >= ww) continue;
            s += arr[y * ww + xx];
            n++;
          }
          tmp[y * ww + x] = s / Math.max(1, n);
        }
      }
      for (let x = 0; x < ww; x++) {
        for (let y = 0; y < hh; y++) {
          let s = 0, n = 0;
          for (let k = -r; k <= r; k++) {
            const yy = y + k;
            if (yy < 0 || yy >= hh) continue;
            s += tmp[yy * ww + x];
            n++;
          }
          arr[y * ww + x] = s / Math.max(1, n);
        }
      }
    };
    const br = Math.max(2, (Math.min(halSw, halSh) / 18) | 0);
    blur(halMask, halSw, halSh, br);
    blur(halMask, halSw, halSh, br);
  }
  const hasHalation = !!halMask;

  /** 主调色：处理行带 [y0, y1) */
  function gradeRows(y0, y1) {
    const wm1 = Math.max(1, w - 1);
    for (let y = y0; y < y1; y++) {
      let i = y * w * 4;
      for (let x = 0; x < w; x++, i += 4) {
        let r = d[i] * evMul * rGain;
        let g = d[i + 1] * evMul * gGain;
        let b = d[i + 2] * evMul * bGain;

        let L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const ln = L / 255;

        // highlights / shadows / whites / blacks
        if (hiOn && ln > 0.55) {
          const f = 1 + hi * 0.55 * ((ln - 0.55) / 0.45);
          r *= f; g *= f; b *= f;
        }
        if (shOn && ln < 0.5) {
          const f = 1 + sh * 0.7 * (1 - ln / 0.5);
          r *= f; g *= f; b *= f;
        }
        if (whOn) {
          const f = 1 + wh * 0.25 * Math.max(0, ln - 0.4);
          r *= f; g *= f; b *= f;
        }
        if (blOn) {
          const f = 1 + bl * 0.4 * Math.max(0, 0.45 - ln);
          r *= f; g *= f; b *= f;
        }

        // contrast & clarity & tone curve on luminance（查表）
        if (hasTone) {
          L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          if (L > 0.0001) {
            const Lcur = toneLUT[L > 255 ? 255 : L < 0 ? 0 : L | 0];
            const scale = Lcur / L;
            r *= scale; g *= scale; b *= scale;
          }
        }

        // saturation / vibrance
        if (hasSat) {
          L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          const maxC = r > g ? (r > b ? r : b) : g > b ? g : b;
          const minC = r < g ? (r < b ? r : b) : g < b ? g : b;
          const satLevel = maxC === 0 ? 0 : (maxC - minC) / maxC;
          let satMul = sat;
          if (vib !== 0) satMul += vib * (1 - satLevel) * 0.9; // vibrance：低饱和区提升更多
          r = L + (r - L) * satMul;
          g = L + (g - L) * satMul;
          b = L + (b - L) * satMul;
        }

        // HSL family（主族 + 相邻族，按原 red→…→blue 次序累计）
        if (hasHSL) {
          const mx = r > g ? (r > b ? r : b) : g > b ? g : b;
          const mn = r < g ? (r < b ? r : b) : g < b ? g : b;
          const dlt = mx - mn;
          if (dlt >= 10) {
            let nr = r, ng = g, nb = b;
            if (mx === r) {
              const wR = (g >= b ? (g - b) / dlt : 1);
              const wO = g > b ? (g - b) / dlt : 0;
              if (wR > 0.02 && (p.hueRed || p.satRed)) {
                hslKnob(nr, ng, nb, p.hueRed, p.satRed, Math.min(1, wR), true);
                nr = _hslOut[0]; ng = _hslOut[1]; nb = _hslOut[2];
              }
              if (wO > 0.02 && (p.hueOrange || p.satOrange)) {
                hslKnob(nr, ng, nb, p.hueOrange, p.satOrange, Math.min(1, wO), true);
                nr = _hslOut[0]; ng = _hslOut[1]; nb = _hslOut[2];
              }
            } else if (mx === g) {
              const wY = r > b ? (r - b) / dlt : 0;
              const wG = Math.min(1, (b - r) / dlt + 1);
              if (wY > 0.02 && (p.hueYellow || p.satYellow)) {
                hslKnob(nr, ng, nb, p.hueYellow, p.satYellow, Math.min(1, wY), true);
                nr = _hslOut[0]; ng = _hslOut[1]; nb = _hslOut[2];
              }
              if (wG > 0.02 && (p.hueGreen || p.satGreen)) {
                hslKnob(nr, ng, nb, p.hueGreen, p.satGreen, wG, false);
                nr = _hslOut[0]; ng = _hslOut[1]; nb = _hslOut[2];
              }
            } else {
              const wB = Math.min(1, (r - g) / dlt + 1);
              const wA = g > r ? (g - r) / dlt : 0;
              if (wA > 0.02 && (p.hueAqua || p.satAqua)) {
                hslKnob(nr, ng, nb, p.hueAqua, p.satAqua, Math.min(1, wA), false);
                nr = _hslOut[0]; ng = _hslOut[1]; nb = _hslOut[2];
              }
              if (wB > 0.02 && (p.hueBlue || p.satBlue)) {
                hslKnob(nr, ng, nb, p.hueBlue, p.satBlue, wB, false);
                nr = _hslOut[0]; ng = _hslOut[1]; nb = _hslOut[2];
              }
            }
            r = clamp(nr, 0, 255);
            g = clamp(ng, 0, 255);
            b = clamp(nb, 0, 255);
          }
        }

        // 分离色调：高光/阴影染色
        if (hasSplit) {
          const Ls = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          const wS = (p.splitStrength / 100) * 0.24;
          const hiW = Math.max(0, Ls / 255 - 0.45) * 1.8 * wS;
          const shW = Math.max(0, 0.55 - Ls / 255) * 1.8 * wS;
          if (p.splitHue) {
            const a = (p.splitHue - 40) / 180;
            r += hiW * (a > 0 ? 55 : 8) * (a > 0 ? 1 : -0.2);
            g += hiW * (a > 0 ? 18 : 6);
            b += hiW * (a > 0 ? -35 : 60);
          }
          if (p.splitHueShadow) {
            const a = (p.splitHueShadow - 200) / 180;
            r += shW * (a > 0 ? -18 : 28);
            g += shW * 6;
            b += shW * (a > 0 ? 58 : -12);
          }
          r = clamp(r, 0, 255);
          g = clamp(g, 0, 255);
          b = clamp(b, 0, 255);
        }

        // fade
        if (hasFade) {
          r = fadeLUT[r > 255 ? 255 : r < 0 ? 0 : r | 0];
          g = fadeLUT[g > 255 ? 255 : g < 0 ? 0 : g | 0];
          b = fadeLUT[b > 255 ? 255 : b < 0 ? 0 : b | 0];
        }

        d[i] = r; // Uint8ClampedArray 写入自动钳制
        d[i + 1] = g;
        d[i + 2] = b;
      }
    }
  }

  /** 后期效果（暗角 / 光晕 / 颗粒）行带 [y0, y1) */
  function postRows(y0, y1) {
    if (hasVignette) {
      for (let y = y0; y < y1; y++) {
        const dy = (y - vigCy) / vigMaxD;
        for (let x = 0; x < w; x++) {
          const dx = (x - vigCx) / vigMaxD;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const v = 1 - vigAmount * Math.pow(Math.min(1, dist * 1.15), 2.2);
          const i = (y * w + x) * 4;
          d[i] *= v;
          d[i + 1] *= v;
          d[i + 2] *= v;
        }
      }
    }
    if (hasHalation) {
      for (let y = y0; y < y1; y++) {
        const my = Math.min(halSh - 1, ((y * halSh) / h) | 0);
        for (let x = 0; x < w; x++) {
          const mx = Math.min(halSw - 1, ((x * halSw) / w) | 0);
          const m = halMask[my * halSw + mx] * halAmt;
          if (m < 0.01) continue;
          const i = (y * w + x) * 4;
          d[i] = clamp(d[i] + m * 95, 0, 255);
          d[i + 1] = clamp(d[i + 1] + m * 28, 0, 255);
          d[i + 2] = clamp(d[i + 2] + m * 12, 0, 255);
        }
      }
    }
    if (hasGrain) {
      for (let y = y0; y < y1; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const L = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
          const lumW = 1 - Math.abs(L / 255 - 0.5) * 1.2;
          // xorshift-ish hash（坐标定值，保证预览与导出一致）
          let n = (x * 374761393 + y * 668265263) | 0;
          n = (n ^ (n >>> 13)) * 1274126177;
          n = (n ^ (n >>> 16)) >>> 0;
          const rnd = (n % 2000) / 2000 - 0.5;
          const noise = rnd * grainStrength * 42 * Math.max(0.15, lumW);
          d[i] += noise;
          d[i + 1] += noise * 0.95;
          d[i + 2] += noise * 0.9;
        }
      }
    }
  }

  return {
    out, ctx, w, h, gradeRows, postRows,
    hasPost: hasVignette || hasHalation || hasGrain,
    finish: () => ctx.putImageData(imgData, 0, 0),
  };
}

const yieldToUI = () =>
  new Promise((resolve) => {
    if (typeof MessageChannel !== "undefined") {
      const ch = new MessageChannel();
      ch.port1.onmessage = () => resolve();
      ch.port2.postMessage(0);
    } else {
      setTimeout(resolve, 0);
    }
  });

/** 同步调色（预览用，≤1600px） */
function applyGrade(srcCanvas, params) {
  const s = buildGradeSession(srcCanvas, params);
  s.gradeRows(0, s.h);
  s.postRows(0, s.h);
  s.finish();
  return s.out;
}

/** 分块调色（全尺寸导出用）：按行带让出主线程，onProgress 0..1 */
async function applyGradeAsync(srcCanvas, params, onProgress) {
  const s = buildGradeSession(srcCanvas, params);
  const units = (s.hasPost ? 2 : 1) * Math.ceil(s.h / 32) || 1;
  let done = 0;
  const step = Math.max(8, Math.ceil(s.h / 32));
  for (let y = 0; y < s.h; y += step) {
    s.gradeRows(y, Math.min(s.h, y + step));
    onProgress?.(++done / units);
    if (y + step < s.h) await yieldToUI();
  }
  if (s.hasPost) {
    for (let y = 0; y < s.h; y += step) {
      s.postRows(y, Math.min(s.h, y + step));
      onProgress?.(++done / units);
      if (y + step < s.h) await yieldToUI();
    }
  }
  s.finish();
  return s.out;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/* ========== 局部蒙版（径向 / 渐变） ========== */
const MASK_DEFAULT = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  temp: 0,
  tint: 0,
  saturation: 0,
  clarity: 0,
  brightness: 0, // -100..100 简单提亮压暗
};

function createRadialMask() {
  return {
    id: "m" + Date.now().toString(36),
    type: "radial",
    x: 0.5,
    y: 0.5,
    rx: 0.28,
    ry: 0.36,
    feather: 0.45, // 0..1
    invert: false,
    params: { ...MASK_DEFAULT },
  };
}

function createGradMask() {
  return {
    id: "m" + Date.now().toString(36) + "g",
    type: "grad",
    x: 0.5,
    y: 0.72,
    angle: 0, // 0 = 上下渐变
    length: 0.55,
    feather: 0.35,
    invert: false,
    params: { ...MASK_DEFAULT },
  };
}

function maskAlpha(mask, nx, ny) {
  // nx, ny in 0..1
  if (mask.type === "radial") {
    const dx = (nx - mask.x) / Math.max(0.02, mask.rx);
    const dy = (ny - mask.y) / Math.max(0.02, mask.ry);
    const d = Math.sqrt(dx * dx + dy * dy); // 0 center, 1 edge
    const inner = 1 - clamp(mask.feather, 0, 0.95);
    let a = 1;
    if (d > inner) {
      a = 1 - (d - inner) / Math.max(0.05, 1 - inner);
    }
    a = clamp(a, 0, 1);
    return mask.invert ? 1 - a : a;
  }
  // graduated
  // 约定：angle 0 = 上下渐变（上方保留效果、向下淡出），顺时针增大；90° = 左右渐变。
  // length = 中心到完全无效的距离（半幅）；feather = 过渡带占全幅 (2×length) 的比例：
  // 0 = 在 length 处硬切，1 = 全程平滑过渡。此前 feather 只挪动起点、几乎不起作用，且
  // 注释与实现方向矛盾，现统一为一套语义，辅助线（drawMaskOverlay）同步。
  const ang = (mask.angle * Math.PI) / 180;
  const gx = Math.sin(ang);
  const gy = Math.cos(ang);
  const px = nx - mask.x;
  const py = ny - mask.y;
  const t = px * gx + py * gy;
  const len = Math.max(0.05, mask.length);
  const band = 2 * len * clamp(mask.feather, 0, 1);
  const a0 = len - band; // 过渡带起点（t <= a0 全效果，t >= len 无效果）
  let a;
  if (t <= a0) a = 1;
  else if (t >= len) a = 0;
  else {
    const s = (t - a0) / Math.max(0.001, len - a0);
    a = 1 - s * s * (3 - 2 * s);
  }
  return mask.invert ? 1 - a : a;
}

/** 带局部蒙版的调色：先全局，再逐像素叠加 mask 参数 */
function applyGradeWithMasks(srcCanvas, globalParams, masks) {
  const out = applyGrade(srcCanvas, globalParams);
  if (!masks || !masks.length) return out;
  const ctx = out.getContext("2d");
  const w = out.width;
  const h = out.height;
  const img = ctx.getImageData(0, 0, w, h);
  applyMaskBands(img, masks, w, h, 0, h);
  ctx.putImageData(img, 0, 0);
  return out;
}

/** 分块版（全尺寸导出用）：onProgress 0..1，全局调色占 70%，蒙版占 30% */
async function applyGradeWithMasksAsync(srcCanvas, globalParams, masks, onProgress) {
  const out = await applyGradeAsync(srcCanvas, globalParams, (p) => onProgress?.(p * 0.7));
  if (!masks || !masks.length) {
    onProgress?.(1);
    return out;
  }
  const ctx = out.getContext("2d");
  const w = out.width;
  const h = out.height;
  const img = ctx.getImageData(0, 0, w, h);
  const step = Math.max(8, Math.ceil(h / 20));
  let done = 0;
  const units = Math.ceil(h / step);
  for (let y = 0; y < h; y += step) {
    applyMaskBands(img, masks, w, h, y, Math.min(h, y + step));
    onProgress?.(0.7 + 0.3 * (++done / units));
    if (y + step < h) await yieldToUI();
  }
  ctx.putImageData(img, 0, 0);
  onProgress?.(1);
  return out;
}

/** 蒙版参数 → 行带 [y0,y1) 像素叠加（热循环零分配，参数外提） */
function applyMaskBands(imgData, masks, w, h, y0, y1) {
  const d = imgData.data;
  const wm1 = Math.max(1, w - 1);
  const hm1 = Math.max(1, h - 1);
  for (const mask of masks) {
    const mp = mask.params || {};
    const bright = (mp.brightness || 0) / 100;
    const ev = Math.pow(2, (mp.exposure || 0) * 0.5);
    const t = (mp.temp || 0) / 100;
    const ti = (mp.tint || 0) / 100;
    const con = (mp.contrast || 0) / 100;
    const sat = 1 + (mp.saturation || 0) / 100;
    const mHi = (mp.highlights || 0) / 100;
    const mSh = (mp.shadows || 0) / 100;
    const mCl = (mp.clarity || 0) / 100;
    const empty = Object.keys(mp).every((k) => !mp[k]);
    if (empty) continue;
    const hasBright = bright !== 0;
    const hasEv = ev !== 1;
    const hasWb = t !== 0 || ti !== 0;
    const hasHi = mHi !== 0;
    const hasSh = mSh !== 0;
    const hasClarity = mCl !== 0;
    const hasCon = con !== 0;
    const hasSat = sat !== 1;
    if (!hasBright && !hasEv && !hasWb && !hasHi && !hasSh && !hasClarity && !hasCon && !hasSat) continue;
    for (let y = y0; y < y1; y++) {
      const ny = y / hm1;
      for (let x = 0; x < w; x++) {
        const a = maskAlpha(mask, x / wm1, ny);
        if (a < 0.01) continue;
        const i = (y * w + x) * 4;
        let r = d[i], g = d[i + 1], b = d[i + 2];
        if (hasBright) {
          r += bright * 55; g += bright * 55; b += bright * 55;
        }
        if (hasEv) {
          r *= ev; g *= ev; b *= ev;
        }
        if (hasWb) {
          r *= 1 + t * 0.22 + ti * 0.05;
          g *= 1 - ti * 0.08;
          b *= 1 - t * 0.22 + ti * 0.04;
        }
        // highlights / shadows：按亮度区间乘性增减（与全局版同式）
        if (hasHi || hasSh) {
          const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          const ln = L / 255;
          if (hasHi && ln > 0.55) {
            const f = 1 + mHi * 0.55 * ((ln - 0.55) / 0.45);
            r *= f; g *= f; b *= f;
          }
          if (hasSh && ln < 0.5) {
            const f = 1 + mSh * 0.7 * (1 - ln / 0.5);
            r *= f; g *= f; b *= f;
          }
        }
        // clarity：亮度域 S 曲线近似局部对比（与全局版同式）
        if (hasClarity) {
          const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          if (L > 0.0001) {
            const xx = clamp(L, 0, 255) / 255;
            const k = mCl * 0.35;
            const yy = xx + k * (xx - 0.5) * (1 - Math.abs(xx - 0.5) * 2);
            const scale = clamp(yy * 255, 0, 255) / L;
            r *= scale; g *= scale; b *= scale;
          }
        }
        if (hasCon) {
          const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          const k = 1 + con * 0.7;
          r = L + (r - L) * k;
          g = L + (g - L) * k;
          b = L + (b - L) * k;
        }
        if (hasSat) {
          const L2 = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          r = L2 + (r - L2) * sat;
          g = L2 + (g - L2) * sat;
          b = L2 + (b - L2) * sat;
        }
        const r2 = clamp(r, 0, 255);
        const g2 = clamp(g, 0, 255);
        const b2 = clamp(b, 0, 255);
        d[i] = r + (r2 - r) * a;
        d[i + 1] = g + (g2 - g) * a;
        d[i + 2] = b + (b2 - b) * a;
      }
    }
  }
}

/** 画蒙版辅助线（选中时） */
function drawMaskOverlay(canvas, mask, active) {
  if (!mask) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.save();
  ctx.strokeStyle = active ? "rgba(212,160,84,0.95)" : "rgba(212,160,84,0.35)";
  ctx.lineWidth = 2;
  if (mask.type === "radial") {
    ctx.beginPath();
    ctx.ellipse(mask.x * w, mask.y * h, mask.rx * w, mask.ry * h, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(
      mask.x * w,
      mask.y * h,
      mask.rx * w * (1 - mask.feather * 0.5),
      mask.ry * h * (1 - mask.feather * 0.5),
      0,
      0,
      Math.PI * 2
    );
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(mask.x * w, mask.y * h, 5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(212,160,84,0.9)";
    ctx.fill();
  } else {
    // 渐变辅助线：实线 = 过渡带中点（半效果处），虚线 = 全效果边界。
    // 与 maskAlpha 同一坐标系：渐变方向 d=(sin,cos)，等值线沿垂直方向 u=(cos,-sin)。
    const ang = (mask.angle * Math.PI) / 180;
    const cx = mask.x * w;
    const cy = mask.y * h;
    const dx = Math.sin(ang);
    const dy = Math.cos(ang);
    const ux = Math.cos(ang);
    const uy = -Math.sin(ang);
    const len = Math.max(0.05, mask.length);
    const band = 2 * len * clamp(mask.feather, 0, 1);
    const a0 = len - band;
    const tm = (a0 + len) / 2; // 过渡带中点
    const span = Math.max(w, h) * 1.5;
    const line = (t, dash) => {
      const bx = cx + dx * t * w;
      const by = cy + dy * t * h;
      ctx.setLineDash(dash ? [8, 8] : []);
      ctx.beginPath();
      ctx.moveTo(bx - ux * span, by - uy * span);
      ctx.lineTo(bx + ux * span, by + uy * span);
      ctx.stroke();
      ctx.setLineDash([]);
    };
    line(tm, false);
    line(a0, true);
    // 方向小箭头：指向效果淡出的一侧
    const ax = cx + dx * tm * w;
    const ay = cy + dy * tm * h;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax + dx * 14 - ux * 6, ay + dy * 14 - uy * 6);
    ctx.lineTo(ax + dx * 14 + ux * 6, ay + dy * 14 + uy * 6);
    ctx.closePath();
    ctx.fillStyle = "rgba(212,160,84,0.9)";
    ctx.fill();
  }
  ctx.restore();
}
function autoGradeFromHistogram(hist, meta) {
  const params = { ...DEFAULT_GRADE };
  const mean = (meta.meanL || 128) / 255;

  // 曝光：把均值拉向 0.45（略偏中间）
  const target = 0.45;
  params.exposure = clamp((target - mean) * 2.2, -1.2, 1.2);

  // 对比：动态范围窄则拉对比
  const dr = meta.dynamicRange || 120;
  if (dr < 90) params.contrast = clamp((90 - dr) * 0.55, 0, 40);
  else if (dr > 200) params.contrast = clamp((200 - dr) * 0.12, -20, 0);

  // 高光溢出
  const over = meta.overRatio || 0;
  if (over > 0.5) params.highlights = -45;
  else if (over > 0.1) params.highlights = -25;

  // 暗部
  const under = meta.underRatio || 0;
  if (under > 4) params.shadows = 28;
  else if (under > 1.5) params.shadows = 16;

  // 白平衡：灰世界假设
  const warmth = meta.warmth || 0;
  params.temp = clamp(-warmth * 160, -35, 35);

  // 饱和
  const sat = meta.sat || 0.28;
  if (sat < 0.15) {
    params.vibrance = 18;
    params.saturation = 8;
  } else if (sat > 0.5) {
    params.saturation = -12;
    params.vibrance = -4;
  } else {
    params.vibrance = 10;
  }

  // 清晰度：软图加分
  if ((meta.contrast || 30) < 28) params.clarity = 12;

  return params;
}

/* ========== LLM 厂商配置 ========== */
const LLM_VENDORS = [
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"],
    keyHint: "sk-...",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    models: ["deepseek-chat", "deepseek-reasoner"],
    keyHint: "sk-...",
  },
  {
    id: "moonshot",
    name: "Moonshot Kimi",
    baseUrl: "https://api.moonshot.cn/v1",
    models: ["moonshot-v1-8k-vision-preview", "moonshot-v1-32k", "kimi-latest"],
    keyHint: "sk-...",
  },
  {
    id: "zhipu",
    name: "智谱 GLM",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    models: ["glm-4v-plus", "glm-4-plus", "glm-4-air"],
    keyHint: "....",
  },
  {
    id: "qwen",
    name: "通义千问",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    models: ["qwen-vl-plus", "qwen-vl-max", "qwen-plus"],
    keyHint: "sk-...",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    models: ["claude-sonnet-4-5", "claude-haiku-4-5", "claude-opus-4-5"],
    keyHint: "sk-ant-...",
  },
  {
    id: "custom",
    name: "自定义 OpenAI 兼容",
    baseUrl: "",
    models: [],
    keyHint: "你的 key",
  },
];

const LLM_STORE_KEY = "lightjournal.llm";

function loadLLMConfig() {
  try {
    return JSON.parse(localStorage.getItem(LLM_STORE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveLLMConfig(cfg) {
  localStorage.setItem(LLM_STORE_KEY, JSON.stringify(cfg));
}

/** 画布转 base64 JPEG 缩略图（供 LLM） */
function canvasToThumbBase64(canvas, maxSize = 512) {
  const scale = Math.min(1, maxSize / Math.max(canvas.width, canvas.height));
  const w = Math.max(1, Math.round(canvas.width * scale));
  const h = Math.max(1, Math.round(canvas.height * scale));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d").drawImage(canvas, 0, 0, w, h);
  return c.toDataURL("image/jpeg", 0.82).split(",")[1];
}

function llmConfigReady() {
  const cfg = loadLLMConfig();
  return !!(cfg.vendorId && cfg.apiKey && (cfg.baseUrl || (LLM_VENDORS.find((v) => v.id === cfg.vendorId) || {}).baseUrl));
}

/** 通用 LLM 视觉调用：system + userText + image */
async function callLLMVision({ system, userText, canvas, maxTokens = 1200 }) {
  return callLLMVisionN({ system, userText, canvases: canvas ? [canvas] : [], maxTokens });
}

/** 多图版：作业点评等场景一次看多张 */
async function callLLMVisionN({ system, userText, canvases = [], maxTokens = 1200 }) {
  const cfg = loadLLMConfig();
  if (!cfg.vendorId || !cfg.apiKey) {
    throw new Error("尚未配置大模型。请在调色工作台「厂商设置」里填写厂商与 API Key。");
  }
  const vendor = LLM_VENDORS.find((v) => v.id === cfg.vendorId) || LLM_VENDORS[0];
  const baseUrl = (cfg.baseUrl || vendor.baseUrl || "").replace(/\/$/, "");
  const model = cfg.model || vendor.models[0];
  if (!baseUrl) throw new Error("请填写 API Base URL");
  if (!model) throw new Error("请填写模型名称");

  const thumbs = canvases.map((c) => canvasToThumbBase64(c, 640));
  const anthropicParts = [
    ...thumbs.map((t) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: t } })),
    { type: "text", text: userText },
  ];
  const openaiParts = [
    { type: "text", text: userText },
    ...thumbs.map((t) => ({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${t}` } })),
  ];

  let res;
  try {
    if (vendor.id === "anthropic") {
      res = await fetch(`${baseUrl}/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": cfg.apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        signal: AbortSignal.timeout(90000),
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system,
          messages: [{ role: "user", content: anthropicParts }],
        }),
      });
    } else {
      res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${cfg.apiKey}`,
        },
        signal: AbortSignal.timeout(90000),
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature: 0.5,
          messages: [
            { role: "system", content: system },
            { role: "user", content: openaiParts },
          ],
        }),
      });
    }
  } catch (e) {
    if (e && (e.name === "TimeoutError" || /timeout|timed out/i.test(e.message || ""))) {
      throw new Error("请求超时（90 秒）。请检查网络，或减少图片数量后重试。");
    }
    if ((e.message || "") === "Failed to fetch") {
      throw new Error("网络请求失败：多为该厂商 API 不允许浏览器直连（CORS 限制）或网络不通。可换支持 CORS 的厂商/中转地址。");
    }
    throw e;
  }

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${t.slice(0, 200) || "请求失败"}`);
  }

  const data = await res.json();
  let content;
  if (vendor.id === "anthropic") {
    content = data.content && data.content[0] && data.content[0].text;
  } else {
    content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  }
  if (!content) throw new Error("模型没有返回内容");
  return { content, vendor: vendor.name, model };
}

/**
 * 大模型专业摄影点评（结构化）
 * @returns {Promise<{scores:object, summary:string, strengths:string[], improvements:string[], composition:string, light:string, color:string, narrative:string, vendor:string, model:string}>}
 */
async function askLLMAnalyze(canvas, localMeta) {
  const system = `你是资深摄影评审，风格接近摄影工作坊导师：专业、具体、可执行。
只输出 JSON，不要 markdown：
{
  "scores": {"composition":0-100,"exposure":0-100,"color":0-100,"light":0-100,"story":0-100,"technical":0-100},
  "summary": "50字内总评",
  "strengths": ["亮点1","亮点2"],
  "improvements": ["改进1","改进2","改进3"],
  "composition": "构图细评 60-100字",
  "light": "用光细评 60-100字",
  "color": "色彩细评 60-100字",
  "narrative": "叙事/情绪 40-80字",
  "shootingAdvice": "下次拍摄可执行建议 1-2条"
}`;

  const userText = `请专业点评这张照片。本地启发式参考数据（仅供校准，以你看图为准）：
综合 ${localMeta?.overall ?? "-"}，构图 ${localMeta?.dims?.find?.((d) => d.key === "composition")?.score ?? "-"}，
曝光 ${localMeta?.dims?.find?.((d) => d.key === "exposure")?.score ?? "-"}，
均值亮度 ${localMeta?.meta?.meanL ?? "-"}，对比 ${localMeta?.meta?.contrast ?? "-"}，
动态范围 ${localMeta?.meta?.dynamicRange ?? "-"}，光向 ${localMeta?.light?.direction ?? "-"}。
请输出 JSON。`;

  const { content, vendor, model } = await callLLMVision({ system, userText, canvas, maxTokens: 1400 });
  const m = content.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("返回中没有找到 JSON");
  let parsed;
  try {
    parsed = JSON.parse(m[0]);
  } catch {
    throw new Error("返回的 JSON 无法解析");
  }

  const num = (v, d = 70) => {
    const n = Number(v);
    return Number.isFinite(n) ? clamp(n, 0, 100) : d;
  };
  const arr = (v) => (Array.isArray(v) ? v.slice(0, 6).map(String) : []);

  return {
    scores: {
      composition: num(parsed.scores?.composition),
      exposure: num(parsed.scores?.exposure),
      color: num(parsed.scores?.color),
      light: num(parsed.scores?.light),
      story: num(parsed.scores?.story),
      technical: num(parsed.scores?.technical),
    },
    summary: String(parsed.summary || "").slice(0, 120),
    strengths: arr(parsed.strengths),
    improvements: arr(parsed.improvements),
    composition: String(parsed.composition || ""),
    light: String(parsed.light || ""),
    color: String(parsed.color || ""),
    narrative: String(parsed.narrative || ""),
    shootingAdvice: String(parsed.shootingAdvice || ""),
    vendor,
    model,
  };
}

/**
 * 调用大模型，按用户描述给出调色参数
 * @returns {Promise<{params: object, text: string, vendor: string, model: string}>}
 */
async function askLLMGrade(canvas, userIntent, meta) {
  const cfg = loadLLMConfig();
  if (!cfg.vendorId || !cfg.apiKey) {
    throw new Error("尚未配置大模型。请在「AI 调色」面板填写厂商与 API Key。");
  }

  const system = `你是专业摄影调色师。根据用户想要的效果，给出 Lightroom 风格调色参数。
只输出 JSON，不要 markdown，格式：
{"exposure":-0.2,"contrast":15,"highlights":-25,"shadows":20,"whites":0,"blacks":0,"temp":10,"tint":5,"vibrance":15,"saturation":0,"clarity":8,"fade":5,"vignette":10,"grain":12,"halation":20,"note":"一句话说明"}
参数范围：exposure -2..2；fade/vignette/grain/halation 0..100；其余 -100..100。
胶片/夜景霓虹可适当 grain、halation；商业干净片两者取 0。`;

  const userText = `用户想要：${userIntent}
画面信息：均值亮度 ${meta.meanL}，对比 ${meta.contrast}，动态范围 ${meta.dynamicRange}，饱和度 ${meta.sat}，色温倾向 ${meta.warmth}
请给出调色参数 JSON。`;

  // 统一走 callLLMVisionN（自带超时 / CORS 友好提示）
  const { content, vendor, model } = await callLLMVisionN({ system, userText, canvas, maxTokens: 800 });

  // 提取 JSON
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("返回中没有找到 JSON 参数");
  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error("返回的 JSON 无法解析");
  }

  // 规范化
  const params = { ...DEFAULT_GRADE };
  const num = (v, min, max, dft) => {
    const n = Number(v);
    return Number.isFinite(n) ? clamp(n, min, max) : dft;
  };
  params.exposure = num(parsed.exposure, -2, 2, 0);
  params.contrast = num(parsed.contrast, -100, 100, 0);
  params.highlights = num(parsed.highlights, -100, 100, 0);
  params.shadows = num(parsed.shadows, -100, 100, 0);
  params.whites = num(parsed.whites, -100, 100, 0);
  params.blacks = num(parsed.blacks, -100, 100, 0);
  params.temp = num(parsed.temp, -100, 100, 0);
  params.tint = num(parsed.tint, -100, 100, 0);
  params.vibrance = num(parsed.vibrance, -100, 100, 0);
  params.saturation = num(parsed.saturation, -100, 100, 0);
  params.clarity = num(parsed.clarity, -100, 100, 0);
  params.fade = num(parsed.fade, 0, 100, 0);
  params.vignette = num(parsed.vignette, 0, 100, 0);
  params.grain = num(parsed.grain, 0, 100, 0);
  params.halation = num(parsed.halation, 0, 100, 0);

  return {
    params,
    text: parsed.note || content.slice(0, 120),
    vendor: vendor.name,
    model,
  };
}

/** 导出调色后的 JPEG */
function exportCanvasJPEG(canvas, quality = 0.95) {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        // 某些环境 toBlob 可能失败，用 dataURL 兜底
        if (blob) return resolve(blob);
        try {
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(dataURLtoBlob(dataUrl));
        } catch (e) {
          resolve(null);
        }
      },
      "image/jpeg",
      quality
    );
  });
}

/**
 * 导出 PNG —— 对「当前画布像素」无损（8-bit / sRGB）。
 * 注意：若源图本身来自 ARW 内嵌 JPEG，那一步已有损，PNG 只能保证后续不再劣化。
 */
function exportCanvasPNG(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (blob && blob.type === "image/png") return resolve(blob);
        try {
          const dataUrl = canvas.toDataURL("image/png");
          resolve(dataURLtoBlob(dataUrl));
        } catch (e) {
          resolve(null);
        }
      },
      "image/png"
    );
  });
}

function dataURLtoBlob(dataUrl) {
  const parts = dataUrl.split(",");
  const mime = parts[0].match(/:(.*?);/)[1];
  const bin = atob(parts[1]);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/** 画布是否仍等于「未调色」默认状态 */
function isNeutralGrade(params) {
  const d = DEFAULT_GRADE;
  return Object.keys(d).every((k) => Math.abs((params[k] ?? 0) - d[k]) < 0.001);
}

function downloadBlob(blob, filename) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
