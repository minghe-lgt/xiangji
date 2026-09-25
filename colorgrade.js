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
};

/** 风格预设 */
const GRADE_PRESETS = [
  {
    id: "auto",
    name: "自动校正",
    desc: "直方图驱动：曝光居中、拉对比、保护高光、校白平衡",
    params: "AUTO",
  },
  {
    id: "portrait",
    name: "人像暖肤",
    desc: "偏暖、柔对比、肤色通透",
    params: { ...DEFAULT_GRADE, exposure: 0.15, contrast: 8, highlights: -20, shadows: 18, temp: 18, tint: 6, vibrance: 12, clarity: -6, fade: 6 },
  },
  {
    id: "film",
    name: "经典胶片",
    desc: "褪色、低饱和、抬黑位",
    params: { ...DEFAULT_GRADE, contrast: -6, highlights: -10, shadows: 22, blacks: 18, saturation: -12, vibrance: 8, fade: 22, vignette: 12 },
  },
  {
    id: "cinema",
    name: "电影感",
    desc: "青橙对比、压高光、深阴影",
    params: { ...DEFAULT_GRADE, exposure: -0.1, contrast: 18, highlights: -28, shadows: -8, temp: -8, tint: 4, vibrance: 14, saturation: -4, clarity: 10, vignette: 18 },
  },
  {
    id: "cool",
    name: "清冷日系",
    desc: "高调、偏冷、低对比",
    params: { ...DEFAULT_GRADE, exposure: 0.25, contrast: -12, highlights: -12, shadows: 24, temp: -22, tint: -4, vibrance: 6, saturation: -10, fade: 10 },
  },
  {
    id: "bw",
    name: "经典黑白",
    desc: "高反差银盐",
    params: { ...DEFAULT_GRADE, contrast: 24, highlights: -16, shadows: -6, clarity: 18, saturation: -100, vignette: 16 },
  },
  {
    id: "vivid",
    name: "鲜活风光",
    desc: "高饱和、强通透",
    params: { ...DEFAULT_GRADE, exposure: 0.1, contrast: 16, highlights: -18, shadows: 12, temp: 6, vibrance: 22, saturation: 10, clarity: 14 },
  },
  {
    id: "matte",
    name: "哑光质感",
    desc: "压白提黑、低对比",
    params: { ...DEFAULT_GRADE, contrast: -18, highlights: -24, shadows: 16, whites: -20, blacks: 28, saturation: -8, fade: 18 },
  },
];

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

    // contrast & clarity on luminance
    L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const Lc = contrastCurve(L);
    const Lcl = clarityCurve(Lc);
    if (L > 1) {
      const scale = Lcl / L;
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
