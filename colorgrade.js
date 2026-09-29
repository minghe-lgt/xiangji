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
  { id: "portra400", name: "人像 Portra 400", cat: "胶片", desc: "人像暖肤、奶油高光", params: { ...DEFAULT_GRADE, exposure: 0.12, contrast: 4, highlights: -18, shadows: 16, temp: 16, tint: 8, vibrance: 10, saturation: -4, clarity: -8, fade: 8 } },
  { id: "portra800", name: "人像 Portra 800", cat: "胶片", desc: "更暖、颗粒感、街头人像", params: { ...DEFAULT_GRADE, exposure: 0.1, contrast: 8, highlights: -16, shadows: 14, temp: 20, tint: 6, vibrance: 12, saturation: -2, fade: 12, vignette: 10 } },
  { id: "fuji400h", name: "富士 400H", cat: "胶片", desc: "青绿调、清新胶片", params: { ...DEFAULT_GRADE, exposure: 0.15, contrast: -6, highlights: -12, shadows: 18, temp: -10, tint: -8, vibrance: 8, saturation: -10, fade: 10 } },
  { id: "superia", name: "富士 Superia 400", cat: "胶片", desc: "青色偏移、日系日常", params: { ...DEFAULT_GRADE, contrast: 6, highlights: -12, shadows: 10, temp: -8, tint: -6, vibrance: 14, saturation: -4, fade: 8 } },
  { id: "cinestill", name: "CineStill 800T 钨丝", cat: "胶片", desc: "钨丝灯青调、夜景霓虹", params: { ...DEFAULT_GRADE, exposure: -0.05, contrast: 12, highlights: -20, shadows: -6, temp: -28, tint: 8, vibrance: 18, saturation: -2, clarity: 8, vignette: 14 } },
  { id: "trix", name: "Tri-X 400 高反差", cat: "胶片", desc: "高反差黑白、纪实", params: { ...DEFAULT_GRADE, exposure: 0.05, contrast: 22, highlights: -14, shadows: -8, clarity: 16, saturation: -100, fade: 8, vignette: 12 } },
  { id: "hp5", name: "Ilford HP5 柔调", cat: "胶片", desc: "柔和黑白、灰阶丰富", params: { ...DEFAULT_GRADE, contrast: 10, highlights: -10, shadows: 12, blacks: 8, clarity: 6, saturation: -100, fade: 12 } },
  { id: "polaroid", name: "拍立得", cat: "胶片", desc: "褪色、粉调、梦幻", params: { ...DEFAULT_GRADE, exposure: 0.18, contrast: -12, highlights: -20, shadows: 22, temp: 12, tint: 14, vibrance: -4, saturation: -14, fade: 28, vignette: 16 } },
  { id: "filmclassic", name: "经典褪色", cat: "胶片", desc: "老电影、抬黑压白", params: { ...DEFAULT_GRADE, contrast: -8, highlights: -16, shadows: 20, whites: -14, blacks: 22, saturation: -12, vibrance: 6, fade: 24, vignette: 10 } },

  // —— 电影 ——
  { id: "tealorange", name: "青橙大片", cat: "电影", desc: "好莱坞 Teal & Orange", params: { ...DEFAULT_GRADE, exposure: -0.05, contrast: 18, highlights: -24, shadows: -6, temp: -6, tint: 6, vibrance: 16, saturation: -2, clarity: 10, hueBlue: 24, hueOrange: -10, vignette: 18, splitStrength: 30, splitHue: 40, splitHueShadow: 200 } },
  { id: "bladerunner", name: "银翼杀手", cat: "电影", desc: "赛博青紫、高对比", params: { ...DEFAULT_GRADE, exposure: -0.12, contrast: 22, highlights: -18, shadows: -12, temp: -22, tint: 16, vibrance: 14, saturation: -6, clarity: 12, vignette: 22, splitStrength: 36, splitHue: 220, splitHueShadow: 280 } },
  { id: "wes", name: "韦斯·安德森", cat: "电影", desc: "对称粉黄、复古糖果色", params: { ...DEFAULT_GRADE, exposure: 0.1, contrast: 8, highlights: -12, shadows: 12, temp: 18, tint: 12, vibrance: 16, saturation: 6, fade: 10, splitStrength: 18, splitHue: 50, splitHueShadow: 320 } },
  { id: "noir", name: "黑色电影", cat: "电影", desc: "低调、硬光、戏剧", params: { ...DEFAULT_GRADE, exposure: -0.18, contrast: 28, highlights: -20, shadows: -16, whites: 10, blacks: -10, clarity: 18, saturation: -100, vignette: 28 } },
  { id: "moonlight", name: "月光蓝调", cat: "电影", desc: "忧郁蓝、低饱和", params: { ...DEFAULT_GRADE, exposure: -0.1, contrast: 14, highlights: -16, shadows: -8, temp: -30, tint: 8, vibrance: -6, saturation: -16, fade: 14, vignette: 16, splitStrength: 24, splitHueShadow: 210 } },
  { id: "golden", name: "黄金时刻", cat: "电影", desc: "暖金、柔高光", params: { ...DEFAULT_GRADE, exposure: 0.12, contrast: 10, highlights: -18, shadows: 14, temp: 24, tint: 6, vibrance: 14, saturation: 4, clarity: 4, fade: 6, splitStrength: 20, splitHue: 45 } },

  // —— 日系 / 人像 ——
  { id: "japan", name: "日系清冷", cat: "人像", desc: "高调、偏冷、低对比", params: { ...DEFAULT_GRADE, exposure: 0.25, contrast: -14, highlights: -12, shadows: 24, temp: -18, tint: -4, vibrance: 6, saturation: -12, fade: 12 } },
  { id: "japanwarm", name: "日系暖调", cat: "人像", desc: "胶片暖、奶油肌", params: { ...DEFAULT_GRADE, exposure: 0.18, contrast: -6, highlights: -16, shadows: 18, temp: 14, tint: 6, vibrance: 8, saturation: -8, clarity: -6, fade: 10 } },
  { id: "skin", name: "人像暖肤", cat: "人像", desc: "偏暖、柔对比、通透", params: { ...DEFAULT_GRADE, exposure: 0.15, contrast: 8, highlights: -20, shadows: 18, temp: 18, tint: 6, vibrance: 12, clarity: -6, fade: 6 } },
  { id: "candy", name: "糖果少女", cat: "人像", desc: "粉紫、高明度", params: { ...DEFAULT_GRADE, exposure: 0.22, contrast: -8, highlights: -14, shadows: 20, temp: 8, tint: 20, vibrance: 14, saturation: -2, fade: 12, splitStrength: 16, splitHue: 320 } },
  { id: "mori", name: "森系自然", cat: "人像", desc: "绿调、柔和", params: { ...DEFAULT_GRADE, exposure: 0.12, contrast: -4, highlights: -14, shadows: 16, temp: -6, tint: -12, vibrance: 10, saturation: -6, fade: 8, splitStrength: 14, splitHueShadow: 120 } },

  // —— 黑白 / 风格 ——
  { id: "bw", name: "经典黑白", cat: "黑白", desc: "高反差银盐", params: { ...DEFAULT_GRADE, contrast: 24, highlights: -16, shadows: -6, clarity: 18, saturation: -100, vignette: 16 } },
  { id: "bwsoft", name: "柔和黑白", cat: "黑白", desc: "灰阶、肖像", params: { ...DEFAULT_GRADE, contrast: 8, highlights: -12, shadows: 14, clarity: 4, saturation: -100, fade: 10 } },
  { id: "bwhyper", name: "高反差黑白", cat: "黑白", desc: "街头、硬光", params: { ...DEFAULT_GRADE, exposure: -0.05, contrast: 36, highlights: -10, shadows: -18, clarity: 24, saturation: -100, vignette: 22 } },
  { id: "crush", name: "浓墨重彩", cat: "风格", desc: "高对比、高饱和", params: { ...DEFAULT_GRADE, exposure: -0.05, contrast: 24, highlights: -18, shadows: -8, vibrance: 22, saturation: 12, clarity: 16, vignette: 14 } },
  { id: "fadeout", name: "褪色怀旧", cat: "风格", desc: "胶片褪色、低反差", params: { ...DEFAULT_GRADE, contrast: -16, highlights: -22, shadows: 20, whites: -18, blacks: 26, saturation: -16, fade: 30, vignette: 12 } },
  { id: "coldfilm", name: "冷调电影", cat: "风格", desc: "清冷、克制", params: { ...DEFAULT_GRADE, exposure: -0.04, contrast: 12, highlights: -16, shadows: -4, temp: -18, tint: 4, vibrance: -4, saturation: -12, clarity: 8, vignette: 12 } },
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

function saveUserPreset(name, params, desc) {
  const list = loadUserPresets();
  const item = {
    id: "u_" + Date.now().toString(36),
    name: (name || "自定义").slice(0, 16),
    desc: (desc || "").slice(0, 30),
    cat: "我的",
    params: { ...DEFAULT_GRADE, ...params },
    createdAt: new Date().toISOString(),
  };
  list.unshift(item);
  // 最多 40 个
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
  };
}

function importPresetJSON(obj) {
  if (!obj || typeof obj !== "object") throw new Error("无效的预设文件");
  if (obj.params === "AUTO") {
    return saveUserPreset(obj.name || "导入预设", DEFAULT_GRADE, obj.desc || "");
  }
  const p = { ...DEFAULT_GRADE, ...(obj.params || {}) };
  return saveUserPreset(obj.name || "导入预设", p, obj.desc || "");
}

/* ========== 像素级调色 ========== */
function applyGrade(srcCanvas, params) {
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

  // clarity 是局部对比，这里用亮度域软对比近似
  const clarityCurve = (v) => {
    if (clarity === 0) return v;
    const x = v / 255;
    const k = clarity * 0.35;
    // S 曲线，中间调增强
    const y = x + k * (x - 0.5) * (1 - Math.abs(x - 0.5) * 2);
    return clamp(y * 255, 0, 255);
  };

  const contrastCurve = (v) => {
    const x = v / 255;
    if (contrast === 0) return v;
    const y = 0.5 + (x - 0.5) * (1 + contrast * 0.85);
    return clamp(y * 255, 0, 255);
  };

  const fadeCurve = (v) => {
    if (fade === 0) return v;
    // 抬黑压白
    const x = v / 255;
    const y = fade * 0.18 + x * (1 - fade * 0.28);
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

  // HSL 按红/橙/黄/绿/青/蓝微调
  const applyFamily = (r, g, b) => {
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    const dlt = mx - mn;
    if (dlt < 10) return [r, g, b];
    const fam = {};
    if (mx === r) {
      fam.red = g >= b ? (g - b) / dlt : 1;
      if (g > b) fam.orange = (g - b) / dlt;
    } else if (mx === g) {
      fam.green = (b - r) / dlt + 1;
      if (r > b) fam.yellow = (r - b) / dlt;
    } else {
      fam.blue = (r - g) / dlt + 1;
      if (g > r) fam.aqua = (g - r) / dlt;
    }
    let nr = r, ng = g, nb = b;
    const knobs = [
      ["red", p.hueRed, p.satRed],
      ["orange", p.hueOrange, p.satOrange],
      ["yellow", p.hueYellow, p.satYellow],
      ["green", p.hueGreen, p.satGreen],
      ["aqua", p.hueAqua, p.satAqua],
      ["blue", p.hueBlue, p.satBlue],
    ];
    for (const [key, dh, ds] of knobs) {
      const w = Math.min(1, fam[key] || 0);
      if (w <= 0.02) continue;
      const isWarm = key === "red" || key === "orange" || key === "yellow";
      const hueAmt = dh * w * 0.01;
      if (isWarm) {
        nr += hueAmt * 38;
        nb -= hueAmt * 38;
      } else {
        nr -= hueAmt * 38;
        nb += hueAmt * 38;
      }
      const Lv = 0.2126 * nr + 0.7152 * ng + 0.0722 * nb;
      const sm = 1 + (ds / 100) * w * 0.55;
      nr = Lv + (nr - Lv) * sm;
      ng = Lv + (ng - Lv) * sm;
      nb = Lv + (nb - Lv) * sm;
    }
    return [clamp(nr, 0, 255), clamp(ng, 0, 255), clamp(nb, 0, 255)];
  };

  // 分离色调：高光/阴影染色
  const applySplitTint = (r, g, b) => {
    if (!p.splitStrength) return [r, g, b];
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const w = (p.splitStrength / 100) * 0.24;
    const hiW = Math.max(0, L / 255 - 0.45) * 1.8 * w;
    const shW = Math.max(0, 0.55 - L / 255) * 1.8 * w;
    let nr = r, ng = g, nb = b;
    if (p.splitHue) {
      const a = (p.splitHue - 40) / 180;
      nr += hiW * (a > 0 ? 55 : 8) * (a > 0 ? 1 : -0.2);
      ng += hiW * (a > 0 ? 18 : 6);
      nb += hiW * (a > 0 ? -35 : 60);
    }
    if (p.splitHueShadow) {
      const a = (p.splitHueShadow - 200) / 180;
      nr += shW * (a > 0 ? -18 : 28);
      ng += shW * 6;
      nb += shW * (a > 0 ? 58 : -12);
    }
    return [clamp(nr, 0, 255), clamp(ng, 0, 255), clamp(nb, 0, 255)];
  };

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] * evMul * rGain;
    let g = d[i + 1] * evMul * gGain;
    let b = d[i + 2] * evMul * bGain;

    // 亮度
    let L = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    // highlights / shadows / whites / blacks
    const ln = L / 255;
    if (hi !== 0 && ln > 0.55) {
      const k = hi * 0.55 * ((ln - 0.55) / 0.45);
      const f = 1 + k;
      r *= f; g *= f; b *= f;
      L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    if (sh !== 0 && ln < 0.5) {
      const k = sh * 0.7 * (1 - ln / 0.5);
      const f = 1 + k;
      r *= f; g *= f; b *= f;
      L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    if (wh !== 0) {
      const f = 1 + wh * 0.25 * Math.max(0, ln - 0.4);
      r *= f; g *= f; b *= f;
    }
    if (bl !== 0) {
      const f = 1 + bl * 0.4 * Math.max(0, 0.45 - ln);
      r *= f; g *= f; b *= f;
    }

    // contrast & clarity & tone curve on luminance
    L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const Lc = contrastCurve(L);
    const Lcl = clarityCurve(Lc);
    const Lcur = applyCurve(Lcl);
    if (L > 1) {
      const scale = Lcur / L;
      r *= scale; g *= scale; b *= scale;
    }

    // saturation / vibrance
    L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const satLevel = maxC === 0 ? 0 : (maxC - minC) / maxC;
    let satMul = sat;
    if (vib !== 0) {
      // vibrance：低饱和区提升更多
      satMul += vib * (1 - satLevel) * 0.9;
    }
    r = L + (r - L) * satMul;
    g = L + (g - L) * satMul;
    b = L + (b - L) * satMul;

    // HSL family
    [r, g, b] = applyFamily(r, g, b);

    // split tone
    [r, g, b] = applySplitTint(r, g, b);

    // fade
    r = fadeCurve(r);
    g = fadeCurve(g);
    b = fadeCurve(b);

    d[i] = clamp(r, 0, 255);
    d[i + 1] = clamp(g, 0, 255);
    d[i + 2] = clamp(b, 0, 255);
  }

  // 暗角
  if (p.vignette > 0) {
    const amount = p.vignette / 100;
    const cx = w / 2;
    const cy = h / 2;
    const maxD = Math.sqrt(cx * cx + cy * cy);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = (x - cx) / maxD;
        const dy = (y - cy) / maxD;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const v = 1 - amount * Math.pow(Math.min(1, dist * 1.15), 2.2);
        const i = (y * w + x) * 4;
        d[i] *= v;
        d[i + 1] *= v;
        d[i + 2] *= v;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return out;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/* ========== 自动校正（基于直方图） ========== */
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
  const cfg = loadLLMConfig();
  if (!cfg.vendorId || !cfg.apiKey) {
    throw new Error("尚未配置大模型。请在调色工作台「厂商设置」里填写厂商与 API Key。");
  }
  const vendor = LLM_VENDORS.find((v) => v.id === cfg.vendorId) || LLM_VENDORS[0];
  const baseUrl = (cfg.baseUrl || vendor.baseUrl || "").replace(/\/$/, "");
  const model = cfg.model || vendor.models[0];
  if (!baseUrl) throw new Error("请填写 API Base URL");
  if (!model) throw new Error("请填写模型名称");

  const thumb = canvasToThumbBase64(canvas, 640);

  let res;
  if (vendor.id === "anthropic") {
    res = await fetch(`${baseUrl}/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": cfg.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: thumb } },
              { type: "text", text: userText },
            ],
          },
        ],
      }),
    });
  } else {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature: 0.5,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${thumb}` } },
            ],
          },
        ],
      }),
    });
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
  const vendor = LLM_VENDORS.find((v) => v.id === cfg.vendorId) || LLM_VENDORS[0];
  const baseUrl = (cfg.baseUrl || vendor.baseUrl || "").replace(/\/$/, "");
  const model = cfg.model || vendor.models[0];
  if (!baseUrl) throw new Error("请填写 API Base URL");
  if (!model) throw new Error("请填写模型名称");

  const thumb = canvasToThumbBase64(canvas, 512);

  const system = `你是专业摄影调色师。根据用户想要的效果，给出 Lightroom 风格调色参数。
只输出 JSON，不要 markdown，格式：
{"exposure":-0.2,"contrast":15,"highlights":-25,"shadows":20,"whites":0,"blacks":0,"temp":10,"tint":5,"vibrance":15,"saturation":0,"clarity":8,"fade":5,"vignette":10,"note":"一句话说明"}
参数范围：exposure -2..2，其余 -100..100（fade/vignette 0..100）。`;

  const userText = `用户想要：${userIntent}
画面信息：均值亮度 ${meta.meanL}，对比 ${meta.contrast}，动态范围 ${meta.dynamicRange}，饱和度 ${meta.sat}，色温倾向 ${meta.warmth}
请给出调色参数 JSON。`;

  // OpenAI 兼容 / Anthropic 两套
  let res;
  if (vendor.id === "anthropic") {
    res = await fetch(`${baseUrl}/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": cfg.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model,
        max_tokens: 800,
        system,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: thumb } },
              { type: "text", text: userText },
            ],
          },
        ],
      }),
    });
  } else {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 800,
        temperature: 0.4,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${thumb}` },
              },
            ],
          },
        ],
      }),
    });
  }

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${t.slice(0, 180) || "请求失败"}`);
  }

  const data = await res.json();
  let content;
  if (vendor.id === "anthropic") {
    content = data.content && data.content[0] && data.content[0].text;
  } else {
    content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  }
  if (!content) throw new Error("模型没有返回内容");

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
