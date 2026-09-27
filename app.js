/* 光影手帐 — UI 逻辑 */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const STORE_KEYS = {
  plan: "lightjournal.plan.v2",
  journal: "lightjournal.journal.v2",
};

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("localStorage save failed", e);
  }
}

let planState = loadJSON(STORE_KEYS.plan, {});
let activeStage = "all";

const TOTAL_WEEKS = STAGES.reduce((s, st) => s + st.weeks.length, 0);

/* ========== Path strip ========== */
function renderPath() {
  $("#pathStrip").innerHTML = STAGES.map((st, idx) => {
    const done = st.weeks.filter((w) => planState[w.week]).length;
    const pct = Math.round((done / st.weeks.length) * 100);
    return `
      <div class="path-item" data-stage="${st.id}">
        <div class="num">${String(idx + 1).padStart(2, "0")}</div>
        <div class="name">${st.name}</div>
        <span class="sub">${st.subtitle}</span>
        <div class="bar"><i style="width:${pct}%"></i></div>
      </div>
    `;
  }).join("");

  $$("#pathStrip .path-item").forEach((el) => {
    el.addEventListener("click", () => {
      activeStage = el.dataset.stage;
      renderStageFilter();
      renderPlan();
      $("#plan").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function renderStageFilter() {
  const chips = [
    { id: "all", name: "全部" },
    ...STAGES.map((s) => ({ id: s.id, name: s.name })),
  ];
  $("#stageFilter").innerHTML = chips
    .map(
      (c) =>
        `<button class="chip ${c.id === activeStage ? "active" : ""}" data-stage="${c.id}" type="button">${c.name}</button>`
    )
    .join("");

  $$("#stageFilter .chip").forEach((el) => {
    el.addEventListener("click", () => {
      activeStage = el.dataset.stage;
      renderStageFilter();
      renderPlan();
    });
  });
}

function renderPlan() {
  const stages = activeStage === "all" ? STAGES : STAGES.filter((s) => s.id === activeStage);

  $("#stageBlocks").innerHTML = stages
    .map((st) => {
      const done = st.weeks.filter((w) => planState[w.week]).length;
      return `
        <div class="stage-block" data-stage="${st.id}">
          <div class="stage-head">
            <h3>${st.name}</h3>
            <span class="stage-sub">${st.subtitle}</span>
            <span class="stage-count mono">${done} / ${st.weeks.length}</span>
          </div>
          <div class="plan-grid">
            ${st.weeks.map(weekCard).join("")}
          </div>
        </div>
      `;
    })
    .join("");

  const doneCount = STAGES.flatMap((s) => s.weeks).filter((w) => planState[w.week]).length;
  $("#planProgressBar").style.width = `${(doneCount / TOTAL_WEEKS) * 100}%`;
  $("#planProgressText").textContent = `${doneCount} / ${TOTAL_WEEKS}`;
  updateJournalWeeks();
}

function weekCard(item) {
  const done = !!planState[item.week];
  const quiz = item.quiz || [];
  return `
    <article class="plan-card ${done ? "done" : ""}" data-week="${item.week}">
      <div class="plan-week">
        <span>Week ${String(item.week).padStart(2, "0")}${done ? " · 已完成" : ""}</span>
        <span>${item.hours || "点击展开"}</span>
      </div>
      <h4 data-toggle="${item.week}">${item.title}</h4>
      <div class="plan-detail">
        <div class="detail-block">
          <div class="label">理论要点</div>
          <ul>${item.theory.map((t) => `<li>${t}</li>`).join("")}</ul>
        </div>
        <div class="detail-block">
          <div class="label">拍摄任务</div>
          <p>${item.task}</p>
        </div>
        <div class="detail-block">
          <div class="label">自检标准</div>
          <p>${item.checkpoint}</p>
        </div>
        ${
          quiz.length
            ? `<div class="detail-block quiz-block">
          <div class="label">过关自测 · 答对 3 题再打卡</div>
          <ol class="quiz-list">${quiz.map((q) => `<li>${q}</li>`).join("")}</ol>
        </div>`
            : ""
        }
        <div class="detail-block reading">
          <div class="label">推荐阅读</div>
          <p>${item.reading}</p>
        </div>
      </div>
      <label class="plan-check">
        <input type="checkbox" ${done ? "checked" : ""} data-check="${item.week}" />
        <span>标记为完成</span>
      </label>
    </article>
  `;
}

function bindPlan() {
  $("#stageBlocks").addEventListener("click", (e) => {
    const h = e.target.closest("[data-toggle]");
    if (h) {
      const card = h.closest(".plan-card");
      card.classList.toggle("open");
      return;
    }
    const card = e.target.closest(".plan-card");
    if (card && !e.target.closest(".plan-check")) {
      card.classList.toggle("open");
    }
  });

  $("#stageBlocks").addEventListener("change", (e) => {
    const cb = e.target.closest("[data-check]");
    if (!cb) return;
    const week = Number(cb.dataset.check);
    planState[week] = cb.checked;
    saveJSON(STORE_KEYS.plan, planState);
    renderPlan();
    renderPath();
    updateJournalWeeks();
  });

  $("#resetPlanBtn").addEventListener("click", () => {
    if (!confirm("确定重置全部训练进度？")) return;
    planState = {};
    saveJSON(STORE_KEYS.plan, planState);
    renderPlan();
    renderPath();
  });
}

/* ========== Drills / Library / Cheat ========== */
const ICONS = {
  grid: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>`,
  line: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 20L21 4"/><path d="M3 20h5"/><path d="M16 4h5v5"/></svg>`,
  frame: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg>`,
  mirror: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3v18"/><path d="M8 7H5v10h3"/><path d="M16 7h3v10h-3"/></svg>`,
  layers: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 17l9 5 9-5"/></svg>`,
  space: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="8" cy="12" r="2.5"/><rect x="12" y="4" width="9" height="16" rx="1" stroke-dasharray="2 2"/></svg>`,
  diag: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 20L20 4"/><circle cx="20" cy="4" r="2"/><circle cx="4" cy="20" r="2"/></svg>`,
  spiral: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 12c0-2 1.5-3.5 3.5-3.5S19 10 19 12s-1.8 5-5.2 5S7 14.5 7 12 9 6 13 6s8 3.2 8 8-3.5 10-9 10-10-4-10-8 3-7 7.5-7"/></svg>`,
  minus: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 12h14"/><rect x="3" y="3" width="18" height="18" rx="3" stroke-dasharray="3 2"/></svg>`,
};

function renderDrills() {
  $("#drillGrid").innerHTML = DRILLS.map(
    (d) => `
    <article class="drill-card">
      <div class="dur">${d.duration}</div>
      <h3>${d.title}</h3>
      <p>${d.desc}</p>
    </article>
  `
  ).join("");
}

function renderLibrary() {
  $("#libraryList").innerHTML = READING_LIST.map(
    (r) => `
    <article class="lib-item">
      <div>
        <h3>${r.title}</h3>
        <div class="author">${r.author}</div>
        <p>${r.note}</p>
      </div>
      <span class="lib-level">${r.level}</span>
    </article>
  `
  ).join("");
}

function renderCheats() {
  $("#cheatGrid").innerHTML = CHEATS.map(
    (c) => `
    <article class="cheat-card">
      ${c.svg ? `<div class="cheat-demo">${c.svg}</div>` : `<div class="cheat-icon">${ICONS[c.icon] || ICONS.grid}</div>`}
      <h3>${c.title}</h3>
      <p>${c.desc}</p>
      <span class="mono">${c.tag}</span>
    </article>
  `
  ).join("");
}

/* ========== Journal ========== */
function loadJournal() {
  return loadJSON(STORE_KEYS.journal, []);
}

function saveJournalEntry(entry) {
  const list = loadJournal();
  list.unshift(entry);
  // keep thumbs smaller: only last 20
  saveJSON(STORE_KEYS.journal, list.slice(0, 20));
  renderJournal();
}

function updateJournalWeeks() {
  const el = $("#jWeeks");
  if (!el) return;
  const doneCount = STAGES.flatMap((s) => s.weeks).filter((w) => planState[w.week]).length;
  el.textContent = String(doneCount);
}

function renderJournal() {
  const list = loadJournal();
  const container = $("#journalList");

  $("#jCount").textContent = String(list.length);
  if (list.length) {
    const scores = list.map((x) => x.score);
    $("#jAvg").textContent = String(Math.round(scores.reduce((a, b) => a + b, 0) / scores.length));
    $("#jBest").textContent = String(Math.max(...scores));
    container.innerHTML = list
      .map(
        (item) => `
      <div class="j-item">
        <img class="j-thumb" src="${item.thumb || ""}" alt="" />
        <div class="j-main">
          <h4>${item.name || "未命名"}</h4>
          <p>${item.date || ""} · ${item.grade || ""} · ${(item.topTip || "").replace(/</g, "&lt;")}</p>
        </div>
        <div class="j-score">${item.score ?? "—"}</div>
      </div>
    `
      )
      .join("");
  } else {
    $("#jAvg").textContent = "—";
    $("#jBest").textContent = "—";
    container.innerHTML = `<p class="journal-empty">还没有记录。上传第一张照片开始吧。</p>`;
  }
  updateJournalWeeks();
}

function makeThumb(img) {
  const c = document.createElement("canvas");
  const max = 120;
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  c.width = Math.max(1, Math.round(img.naturalWidth * scale));
  c.height = Math.max(1, Math.round(img.naturalHeight * scale));
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.65);
}

/* ========== Results render ========== */
function renderResults(result) {
  $("#scoreTitle").textContent = result.headline;
  $("#scoreBlurb").textContent = `综合分 ${result.overall} · 等级 ${result.grade}。以下是按优先级整理的技术点评。`;
  $("#scoreGenre").textContent = `题材启发：${result.genre}`;
  $("#scoreGrade").textContent = result.grade;
  $("#scoreGrade").style.color = result.gradeColor;

  const arc = $("#scoreArc");
  const circumference = 2 * Math.PI * 52;
  arc.style.strokeDashoffset = String(circumference * (1 - result.overall / 100));
  arc.style.stroke = result.gradeColor;

  const scoreEl = $("#scoreValue");
  let current = 0;
  const target = result.overall;
  const step = Math.max(1, Math.round(target / 22));
  clearInterval(scoreEl._timer);
  scoreEl._timer = setInterval(() => {
    current = Math.min(target, current + step);
    scoreEl.textContent = String(current);
    if (current >= target) clearInterval(scoreEl._timer);
  }, 28);

  $("#dimList").innerHTML = result.dims
    .map(
      (d) => `
    <div class="dim">
      <span class="dim-name">${d.name}</span>
      <div class="dim-bar"><i data-w="${d.score}" data-key="${d.key}"></i></div>
      <span class="dim-score">${d.score}</span>
      <div class="dim-note">${d.note}</div>
    </div>
  `
    )
    .join("");

  requestAnimationFrame(() => {
    $$("#dimList .dim-bar i").forEach((el) => {
      el.style.width = `${el.dataset.w}%`;
      // color by score
      const v = Number(el.dataset.w);
      if (v >= 80) el.style.background = "#3d8f58";
      else if (v >= 60) el.style.background = "#b07a32";
      else el.style.background = "#c45a3a";
    });
  });

  // histogram
  drawHistogram($("#histCanvas"), result.histogram);
  $("#histNote").textContent = `高光剪切 ${result.meta.overRatio}% · 暗部死黑 ${result.meta.underRatio}% · 有效动态范围 ≈ ${result.meta.dynamicRange}`;

  // palette
  $("#paletteRow").innerHTML = result.palette
    .map((p) => `<div class="swatch" style="background:${p.hex}" title="${p.hex} ${(p.weight * 100).toFixed(1)}%"></div>`)
    .join("");
  $("#paletteNote").textContent = result.palette
    .slice(0, 3)
    .map((p) => `${p.hex}`)
    .join(" · ");

  // tech table
  const m = result.meta;
  $("#techTable").innerHTML = [
    ["分辨率", `${m.width}×${m.height}`],
    ["平均亮度", m.meanL],
    ["对比度 σ", m.contrast],
    ["动态范围", m.dynamicRange],
    ["饱和度", m.sat],
    ["色温倾向", m.warmth > 0.03 ? "偏暖" : m.warmth < -0.03 ? "偏冷" : "中性"],
    ["光线方向", result.light.direction],
    ["题材启发", result.genre],
  ]
    .map(
      ([k, v]) => `
    <div class="tech-cell">
      <span>${k}</span>
      <span>${v}</span>
    </div>
  `
    )
    .join("");

  $("#tipList").innerHTML = result.tips.map((t) => `<li>${t}</li>`).join("");
  $("#resultsEmpty").classList.add("hidden");
  $("#resultsBody").classList.remove("hidden");
}

/* ========== Upload flow ========== */
function setupUpload() {
  const dropZone = $("#dropZone");
  const fileInput = $("#fileInput");
  const uploadEmpty = $("#uploadEmpty");
  const uploadPreview = $("#uploadPreview");
  const photoCanvas = $("#photoCanvas");
  const overlayCanvas = $("#overlayCanvas");
  const overlayMode = $("#overlayMode");

  let analysisMode = "local"; // local | ai | both
  let lastLocalResult = null;
  let lastImage = null;

  $("#analysisMode")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-amode]");
    if (!btn) return;
    $$("#analysisMode .mode-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    analysisMode = btn.dataset.amode;
    $("#aiReview")?.classList.toggle("hidden", analysisMode === "local");
    if ((analysisMode === "ai" || analysisMode === "both") && lastLocalResult && photoCanvas.width) {
      runAIReview();
    }
  });

  function resetView() {
    uploadEmpty.classList.remove("hidden");
    uploadPreview.classList.add("hidden");
    $("#resultsBody").classList.add("hidden");
    $("#resultsEmpty").classList.remove("hidden");
    $("#aiReview")?.classList.add("hidden");
    fileInput.value = "";
    lastLocalResult = null;
    lastImage = null;
  }

  async function runAIReview() {
    if (!lastImage) return;
    if (!llmConfigReady()) {
      alert("尚未配置大模型。请到「调色工作台 → 厂商设置」填写 API Key 后再用 AI 点评。");
      return;
    }
    const box = $("#aiReview");
    box?.classList.remove("hidden");
    const metaEl = $("#aiReviewMeta");
    if (metaEl) metaEl.textContent = "生成中…";
    try {
      // 用原图画布
      const c = document.createElement("canvas");
      const max = 1280;
      const s = Math.min(1, max / Math.max(lastImage.naturalWidth, lastImage.naturalHeight));
      c.width = Math.round(lastImage.naturalWidth * s);
      c.height = Math.round(lastImage.naturalHeight * s);
      c.getContext("2d").drawImage(lastImage, 0, 0, c.width, c.height);
      const ai = await askLLMAnalyze(c, lastLocalResult);
      if (metaEl) metaEl.textContent = `${ai.vendor} · ${ai.model}`;
      $("#aiSummary").textContent = ai.summary || "—";
      $("#aiScores").innerHTML = Object.entries(ai.scores)
        .map(([k, v]) => {
          const name = {
            composition: "构图",
            exposure: "曝光",
            color: "色彩",
            light: "用光",
            story: "叙事",
            technical: "技术",
          }[k] || k;
          return `<div class="ai-score"><span>${name}</span><strong>${v}</strong></div>`;
        })
        .join("");
      $("#aiStrengths").innerHTML = (ai.strengths || []).map((x) => `<li>${x}</li>`).join("") || "<li>—</li>";
      $("#aiImprovements").innerHTML = (ai.improvements || []).map((x) => `<li>${x}</li>`).join("") || "<li>—</li>";
      $("#aiComposition").textContent = ai.composition || "—";
      $("#aiLight").textContent = ai.light || "—";
      $("#aiColor").textContent = ai.color || "—";
      $("#aiNarrative").textContent = ai.narrative || "—";
      $("#aiShoot").textContent = ai.shootingAdvice || "—";
    } catch (err) {
      if (metaEl) metaEl.textContent = "失败";
      $("#aiSummary").textContent = `AI 点评失败：${err.message || err}`;
    }
  }

  function handleFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      alert("请选择图片文件（JPG / PNG / WebP）");
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      photoCanvas.width = img.naturalWidth;
      photoCanvas.height = img.naturalHeight;
      photoCanvas.getContext("2d").drawImage(img, 0, 0);
      overlayCanvas.width = img.naturalWidth;
      overlayCanvas.height = img.naturalHeight;
      drawOverlay(overlayCanvas, overlayMode.value);

      uploadEmpty.classList.add("hidden");
      uploadPreview.classList.remove("hidden");
      $("#fileMeta").textContent = `${file.name.slice(0, 32)} · ${img.naturalWidth}×${img.naturalHeight}`;

      lastImage = img;
      const result = analyzeImage(img);
      lastLocalResult = result;
      renderResults(result);

      if (analysisMode !== "ai") {
        $("#resultsBody").classList.remove("hidden");
      } else {
        $("#resultsBody").classList.remove("hidden");
      }

      saveJournalEntry({
        name: file.name.length > 24 ? file.name.slice(0, 24) + "…" : file.name,
        score: result.overall,
        grade: result.grade,
        topTip: (result.tips[0] || "").slice(0, 28) + "…",
        date: new Date().toLocaleDateString("zh-CN"),
        thumb: makeThumb(img),
      });

      URL.revokeObjectURL(url);
      fileInput.value = "";

      if (analysisMode === "ai" || analysisMode === "both") {
        runAIReview();
      } else {
        $("#aiReview")?.classList.add("hidden");
      }
    };
    img.onerror = () => {
      alert("图片读取失败，请换一张试试");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  $("#pickBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  uploadEmpty.addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files && fileInput.files[0];
    if (file) handleFile(file);
  });

  $("#clearBtn").addEventListener("click", resetView);

  overlayMode.addEventListener("change", () => {
    drawOverlay(overlayCanvas, overlayMode.value);
  });

  ["dragenter", "dragover"].forEach((ev) => {
    dropZone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropZone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach((ev) => {
    dropZone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropZone.classList.remove("dragover");
    });
  });

  dropZone.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleFile(file);
  });
}

/* ========== Color Grading Studio ========== */
const GRADE_SLIDERS = [
  { key: "exposure", name: "曝光", min: -200, max: 200, scale: 100, group: "tone" },
  { key: "contrast", name: "对比度", min: -100, max: 100, scale: 1, group: "tone" },
  { key: "highlights", name: "高光", min: -100, max: 100, scale: 1, group: "tone" },
  { key: "shadows", name: "阴影", min: -100, max: 100, scale: 1, group: "tone" },
  { key: "whites", name: "白色", min: -100, max: 100, scale: 1, group: "tone" },
  { key: "blacks", name: "黑色", min: -100, max: 100, scale: 1, group: "tone" },
  { key: "temp", name: "色温", min: -100, max: 100, scale: 1, group: "color" },
  { key: "tint", name: "色调", min: -100, max: 100, scale: 1, group: "color" },
  { key: "vibrance", name: "自然饱和", min: -100, max: 100, scale: 1, group: "color" },
  { key: "saturation", name: "饱和度", min: -100, max: 100, scale: 1, group: "color" },
  { key: "curveShadows", name: "暗部", min: -100, max: 100, scale: 1, group: "curve" },
  { key: "curveMids", name: "中间调", min: -100, max: 100, scale: 1, group: "curve" },
  { key: "curveHighlights", name: "高光", min: -100, max: 100, scale: 1, group: "curve" },
  { key: "hueOrange", name: "橙·色相", min: -100, max: 100, scale: 1, group: "hsl" },
  { key: "satOrange", name: "橙·饱和", min: -100, max: 100, scale: 1, group: "hsl" },
  { key: "hueBlue", name: "蓝·色相", min: -100, max: 100, scale: 1, group: "hsl" },
  { key: "satBlue", name: "蓝·饱和", min: -100, max: 100, scale: 1, group: "hsl" },
  { key: "splitStrength", name: "强度", min: 0, max: 100, scale: 1, group: "split" },
  { key: "splitHue", name: "高光色相", min: 0, max: 360, scale: 1, group: "split" },
  { key: "splitHueShadow", name: "阴影色相", min: 0, max: 360, scale: 1, group: "split" },
  { key: "clarity", name: "清晰度", min: -100, max: 100, scale: 1, group: "effect" },
  { key: "fade", name: "褪色", min: 0, max: 100, scale: 1, group: "effect" },
  { key: "vignette", name: "暗角", min: 0, max: 100, scale: 1, group: "effect" },
];

const GRADE_GROUP_IDS = {
  tone: "#sliderTone",
  color: "#sliderColor",
  curve: "#sliderCurve",
  hsl: "#sliderHsl",
  split: "#sliderSplit",
  effect: "#sliderEffect",
};

let gradeState = {
  sourceCanvas: null,
  params: { ...DEFAULT_GRADE },
  showingOriginal: false,
  activePreset: null,
  originalBlob: null,
  originalBytes: null,
  originalName: "",
};

function setupGrade() {
  const drop = $("#gradeDrop");
  const fileInput = $("#gradeFile");
  const gradeEmpty = $("#gradeEmpty");
  const gradePreview = $("#gradePreview");
  const gradeCanvas = $("#gradeCanvas");

  // presets
  let activeCat = "全部";

  function allPresets() {
    return [...GRADE_PRESETS, ...loadUserPresets()];
  }

  function renderPresetCats() {
    const cats = ["全部", "基础", "胶片", "电影", "人像", "黑白", "风格", "我的"];
    $("#presetCats").innerHTML = cats
      .map(
        (c) =>
          `<button type="button" class="preset-cat ${c === activeCat ? "active" : ""}" data-cat="${c}">${c}</button>`
      )
      .join("");
  }

  function renderPresets() {
    const list = allPresets().filter((p) => activeCat === "全部" || p.cat === activeCat || (activeCat === "我的" && p.cat === "我的"));
    $("#presetGrid").innerHTML = list
      .map((p) => {
        // 用 temp / saturation 生成小色条，直观一点
        let bar = "background:linear-gradient(90deg,#8a8078,#c4b8a8)";
        if (p.params && p.params !== "AUTO") {
          const t = (p.params.temp || 0) / 100;
          const s = (p.params.saturation || 0) / 100;
          const w = p.params.temp != null ? p.params.temp : 0;
          const c1 = w >= 0 ? "#d4a054" : "#6a9ec4";
          const c2 = w >= 0 ? "#e8c88a" : "#8ec0dc";
          bar = `background:linear-gradient(90deg,${c1},${c2});opacity:${0.45 + Math.min(0.55, Math.abs(s) + 0.2)}`;
        }
        return `
    <button class="preset-btn ${gradeState.activePreset === p.id ? "active" : ""}" type="button" data-preset="${p.id}" title="${(p.desc || "").replace(/"/g, "")}">
      <i class="preset-swatch" style="${bar}"></i>
      <strong>${p.name}</strong>
    </button>
  `;
      })
      .join("");
  }

  renderPresetCats();
  renderPresets();

  $("#presetCats")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-cat]");
    if (!btn) return;
    activeCat = btn.dataset.cat;
    renderPresetCats();
    renderPresets();
  });

  $("#presetGrid").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-preset]");
    if (!btn || !gradeState.sourceCanvas) {
      if (btn && !gradeState.sourceCanvas) alert("请先载入一张照片");
      return;
    }
    const preset = allPresets().find((p) => p.id === btn.dataset.preset);
    if (!preset) return;

    if (preset.params === "AUTO") {
      const meta = estimateMetaFromCanvas(gradeState.sourceCanvas);
      gradeState.params = autoGradeFromHistogram(null, meta);
    } else {
      gradeState.params = { ...DEFAULT_GRADE, ...preset.params };
    }
    gradeState.activePreset = preset.id;
    gradeState.showingOriginal = false;
    renderSliders();
    repaintGrade();
    renderPresets();
  });

  // save / import / export presets
  $("#savePresetBtn")?.addEventListener("click", () => {
    const name = prompt("预设名称（最多 16 字）", "我的预设");
    if (!name) return;
    const item = saveUserPreset(name, gradeState.params);
    activeCat = "我的";
    renderPresetCats();
    renderPresets();
    gradeState.activePreset = item.id;
    renderPresets();
    alert(`已保存「${item.name}」到「我的」预设。`);
  });

  $("#importPresetBtn")?.addEventListener("click", () => {
    $("#presetFile").click();
  });

  $("#presetFile")?.addEventListener("change", async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      const text = await f.text();
      const obj = JSON.parse(text);
      const item = importPresetJSON(obj);
      activeCat = "我的";
      renderPresetCats();
      renderPresets();
      alert(`已导入「${item.name}」`);
    } catch (err) {
      alert("导入失败：" + (err.message || err));
    }
    e.target.value = "";
  });

  $("#exportPresetBtn")?.addEventListener("click", () => {
    const current = {
      name: "光影手帐预设-" + new Date().toISOString().slice(0, 10),
      desc: "自定义调色参数",
      params: gradeState.params,
    };
    const json = exportPresetJSON(current);
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
    downloadBlob(blob, `preset-${Date.now()}.json`);
  });

  // sliders
  renderSliders();
  bindSliders();
  bindGradeTabs();
  $("#resetGradeBtn").addEventListener("click", () => {
    gradeState.params = { ...DEFAULT_GRADE };
    gradeState.activePreset = null;
    $$("#presetGrid .preset-btn").forEach((el) => el.classList.remove("active"));
    renderSliders();
    repaintGrade();
  });

  // file
  $("#gradePickBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    fileInput.click();
  });
  gradeEmpty.addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    fileInput.click();
  });
  fileInput.addEventListener("change", () => {
    const f = fileInput.files && fileInput.files[0];
    if (f) handleGradeFile(f);
  });

  ["dragenter", "dragover"].forEach((ev) =>
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.add("dragover");
    })
  );
  ["dragleave", "drop"].forEach((ev) =>
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.remove("dragover");
    })
  );
  drop.addEventListener("drop", (e) => {
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) handleGradeFile(f);
  });

  $("#gradeResetFileBtn").addEventListener("click", () => {
    gradeEmpty.classList.remove("hidden");
    gradePreview.classList.add("hidden");
    fileInput.value = "";
    gradeState.sourceCanvas = null;
    gradeState.params = { ...DEFAULT_GRADE };
  });

  // compare hold
  const compareBtn = $("#toggleCompareBtn");
  const showOriginal = (on) => {
    if (!gradeState.sourceCanvas) return;
    gradeState.showingOriginal = on;
    $("#compareBadge").textContent = on ? "原图" : "效果预览";
    repaintGrade();
  };
  compareBtn.addEventListener("mousedown", () => showOriginal(true));
  compareBtn.addEventListener("mouseup", () => showOriginal(false));
  compareBtn.addEventListener("mouseleave", () => showOriginal(false));
  compareBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    showOriginal(true);
  });
  compareBtn.addEventListener("touchend", () => showOriginal(false));

  $("#exportBtn").addEventListener("click", async () => {
    if (!gradeState.sourceCanvas) return;
    const full = renderFullGrade() || gradeCanvas;
    const blob = await exportCanvasJPEG(full, 0.95);
    if (blob) downloadBlob(blob, `lightjournal-grade-${Date.now()}.jpg`);
  });

  // PNG：对「当前调色结果」的像素无损；若未调色则直接给原始字节（零重编码）
  $("#exportPngBtn").addEventListener("click", async () => {
    if (!gradeState.sourceCanvas) return;

    if (isNeutralGrade(gradeState.params) && gradeState.originalBlob) {
      // 未调色：直接导出原始文件字节，完全不重编码
      const name = gradeState.originalName || `lightjournal-original-${Date.now()}`;
      downloadBlob(gradeState.originalBlob, name);
      alert("已按「原图」零重编码导出。\n说明：若源文件是 ARW 内嵌 JPEG，那一步在相机内已完成有损压缩；网页无法凭空恢复 RAW 原始像素。");
      return;
    }

    const full = renderFullGrade() || gradeCanvas;
    const blob = await exportCanvasPNG(full);
    if (!blob) {
      alert("PNG 导出失败");
      return;
    }
    if (blob.type !== "image/png") {
      alert("导出格式异常：" + blob.type + "，已按 PNG 重试");
    }
    downloadBlob(blob, `lightjournal-grade-${Date.now()}.png`);
  });

  // 导出原始字节（不调色、不重编码）
  $("#exportOrigBtn").addEventListener("click", () => {
    if (!gradeState.originalBlob) {
      alert("没有保留原始文件");
      return;
    }
    downloadBlob(gradeState.originalBlob, gradeState.originalName || `lightjournal-original-${Date.now()}`);
  });

  // LLM config
  const vendorSel = $("#llmVendor");
  vendorSel.innerHTML = LLM_VENDORS.map((v) => `<option value="${v.id}">${v.name}</option>`).join("");
  const cfg = loadLLMConfig();
  if (cfg.vendorId) vendorSel.value = cfg.vendorId;
  if (cfg.model) $("#llmModel").value = cfg.model;
  if (cfg.baseUrl) $("#llmBaseUrl").value = cfg.baseUrl;
  if (cfg.apiKey) $("#llmApiKey").value = cfg.apiKey;

  function syncModelList() {
    const v = LLM_VENDORS.find((x) => x.id === vendorSel.value) || LLM_VENDORS[0];
    $("#llmModelList").innerHTML = v.models.map((m) => `<option value="${m}">`).join("");
    if (!$("#llmModel").value && v.models[0]) $("#llmModel").value = v.models[0];
    if (v.baseUrl && !$("#llmBaseUrl").value) $("#llmBaseUrl").value = v.baseUrl;
    if (v.id !== "custom") $("#llmBaseUrl").value = v.baseUrl;
  }
  vendorSel.addEventListener("change", syncModelList);
  syncModelList();

  $("#aiToggleCfg").addEventListener("click", () => {
    $("#aiConfig").classList.toggle("hidden");
  });
  $("#aiCfgClose")?.addEventListener("click", () => {
    $("#aiConfig").classList.add("hidden");
  });

  $("#saveLlmBtn").addEventListener("click", () => {
    const conf = {
      vendorId: vendorSel.value,
      model: $("#llmModel").value.trim(),
      baseUrl: $("#llmBaseUrl").value.trim(),
      apiKey: $("#llmApiKey").value.trim(),
    };
    saveLLMConfig(conf);
    $("#llmStatus").textContent = "已保存到本机浏览器。";
    setTimeout(() => {
      $("#llmStatus").textContent = "配置只存在你的浏览器 localStorage，不会上传到本站服务器。";
    }, 2500);
  });

  $("#aiGradeBtn").addEventListener("click", async () => {
    if (!gradeState.sourceCanvas) {
      alert("请先载入一张照片");
      return;
    }
    const intent = $("#aiIntent").value.trim();
    if (!intent) {
      alert("请先描述你想要的效果");
      return;
    }
    // 保存当前配置
    saveLLMConfig({
      vendorId: vendorSel.value,
      model: $("#llmModel").value.trim(),
      baseUrl: $("#llmBaseUrl").value.trim(),
      apiKey: $("#llmApiKey").value.trim(),
    });

    const btn = $("#aiGradeBtn");
    const old = btn.textContent;
    btn.textContent = "生成中…";
    btn.disabled = true;
    try {
      const meta = estimateMetaFromCanvas(gradeState.sourceCanvas);
      const result = await askLLMGrade(gradeState.sourceCanvas, intent, meta);
      gradeState.params = { ...result.params };
      gradeState.activePreset = null;
      gradeState.showingOriginal = false;
      renderSliders();
      repaintGrade();
      $("#aiResult").classList.remove("hidden");
      $("#aiResultText").textContent = `${result.vendor} · ${result.model}：${result.text}`;
      $$("#presetGrid .preset-btn").forEach((el) => el.classList.remove("active"));
    } catch (err) {
      $("#aiResult").classList.remove("hidden");
      $("#aiResultText").textContent = `出错：${err.message || err}`;
      alert("AI 调色失败：" + (err.message || err));
    } finally {
      btn.textContent = old;
      btn.disabled = false;
    }
  });
}

function estimateMetaFromCanvas(canvas) {
  const w = Math.min(120, canvas.width);
  const h = Math.min(120, canvas.height);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.drawImage(canvas, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  let sum = 0, sum2 = 0, over = 0, under = 0, satSum = 0, r = 0, b = 0;
  const n = w * h;
  const hist = new Float64Array(256);
  for (let i = 0; i < d.length; i += 4) {
    const L = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    sum += L;
    sum2 += L * L;
    hist[L | 0]++;
    if (L >= 250) over++;
    if (L <= 5) under++;
    r += d[i];
    b += d[i + 2];
    const mx = Math.max(d[i], d[i + 1], d[i + 2]);
    const mn = Math.min(d[i], d[i + 1], d[i + 2]);
    satSum += mx === 0 ? 0 : (mx - mn) / mx;
  }
  const meanL = sum / n;
  const contrast = Math.sqrt(Math.max(0, sum2 / n - meanL * meanL));
  let acc = 0, p2 = 0, p98 = 255;
  for (let i = 0; i < 256; i++) {
    acc += hist[i];
    if (acc / n >= 0.02) { p2 = i; break; }
  }
  acc = 0;
  for (let i = 255; i >= 0; i--) {
    acc += hist[i];
    if (acc / n >= 0.02) { p98 = i; break; }
  }
  return {
    meanL,
    contrast,
    dynamicRange: p98 - p2,
    overRatio: (over / n) * 100,
    underRatio: (under / n) * 100,
    sat: satSum / n,
    warmth: (r / n - b / n) / 255,
  };
}

function renderSliders() {
  const htmlByGroup = {};
  for (const s of GRADE_SLIDERS) {
    const raw = gradeState.params[s.key];
    const val = Math.round(raw * s.scale);
    const row = `
      <div class="slider-row">
        <label for="sl-${s.key}">${s.name}</label>
        <input type="range" id="sl-${s.key}" data-key="${s.key}" data-scale="${s.scale}"
          min="${s.min}" max="${s.max}" value="${val}" />
        <span class="val" id="val-${s.key}">${(raw).toFixed(s.scale > 1 ? 2 : 0)}</span>
      </div>
    `;
    const g = s.group || "tone";
    if (!htmlByGroup[g]) htmlByGroup[g] = "";
    htmlByGroup[g] += row;
  }
  for (const [g, sel] of Object.entries(GRADE_GROUP_IDS)) {
    const el = $(sel);
    if (el) el.innerHTML = htmlByGroup[g] || "";
  }
}

function bindGradeTabs() {
  const box = $("#gradeTabs");
  if (!box) return;
  box.addEventListener("click", (e) => {
    const tab = e.target.closest("[data-gtab]");
    if (!tab) return;
    $$("#gradeTabs .gp-tab").forEach((t) => t.classList.toggle("active", t === tab));
    $$(".gp-pane").forEach((p) => {
      p.classList.toggle("active", p.dataset.gpane === tab.dataset.gtab);
    });
  });
}

function bindSliders() {
  const body = $(".gp-body");
  if (!body) return;
  body.addEventListener("input", (e) => {
    const input = e.target.closest("[data-key]");
    if (!input) return;
    const key = input.dataset.key;
    const scale = Number(input.dataset.scale);
    const v = Number(input.value) / scale;
    gradeState.params[key] = v;
    const valEl = $("#val-" + key);
    if (valEl) valEl.textContent = v.toFixed(scale > 1 ? 2 : 0);
    gradeState.showingOriginal = false;
    $("#compareBadge").textContent = "效果预览";
    gradeState.activePreset = null;
    $$("#presetGrid .preset-btn").forEach((el) => el.classList.remove("active"));
    repaintGrade();
  });
}

function repaintGrade() {
  if (!gradeState.sourceCanvas) return;
  const target = $("#gradeCanvas");
  const src = gradeState.sourceCanvas;

  if (gradeState.showingOriginal) {
    target.width = src.width;
    target.height = src.height;
    target.getContext("2d").drawImage(src, 0, 0);
    return;
  }

  // 预览可以缩，但导出用 sourceCanvas 全分辨率
  // 这里把 target 画成预览尺寸；导出时单独走 full render
  const maxPreview = 1600;
  let sw = src.width;
  let sh = src.height;
  if (Math.max(sw, sh) > maxPreview) {
    const s = maxPreview / Math.max(sw, sh);
    sw = Math.round(sw * s);
    sh = Math.round(sh * s);
  }

  const work = document.createElement("canvas");
  work.width = sw;
  work.height = sh;
  work.getContext("2d").drawImage(src, 0, 0, sw, sh);

  const graded = applyGrade(work, gradeState.params);
  target.width = graded.width;
  target.height = graded.height;
  target.getContext("2d").drawImage(graded, 0, 0);
}

/** 全分辨率调色渲染（导出用） */
function renderFullGrade() {
  if (!gradeState.sourceCanvas) return null;
  return applyGrade(gradeState.sourceCanvas, gradeState.params);
}

async function handleGradeFile(file) {
  try {
    const loaded = await loadPhotoFile(file);
    const img = loaded.img;

    // 保留 RAW 内嵌预览的原始分辨率，不再强行砍到 2400
    // 仅对超大图做保护（>4000px 时限制，避免浏览器内存压力）
    const maxSide = 4000;
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    let scaled = false;
    if (Math.max(w, h) > maxSide) {
      const s = maxSide / Math.max(w, h);
      w = Math.round(w * s);
      h = Math.round(h * s);
      scaled = true;
    }
    const src = document.createElement("canvas");
    src.width = w;
    src.height = h;
    src.getContext("2d").drawImage(img, 0, 0, w, h);

    gradeState.sourceCanvas = src;
    gradeState.params = { ...DEFAULT_GRADE };
    gradeState.activePreset = null;
    gradeState.showingOriginal = false;
    gradeState.originalBlob = loaded.originalBlob || null;
    gradeState.originalBytes = loaded.originalBytes || null;
    gradeState.originalName = loaded.originalName || file.name;

    $("#gradeEmpty").classList.add("hidden");
    $("#gradePreview").classList.remove("hidden");

    // 更明确的质量说明
    let note = loaded.note || `${file.name} · ${w}×${h}`;
    if (loaded.rawWidth && loaded.rawHeight && (loaded.rawWidth > w || loaded.rawHeight > h)) {
      note += `｜已按预览处理；完整 RAW 像素需厂商软件/LibRaw 解码`;
    }
    if (scaled) note += `｜为性能缩放至 ${w}×${h}`;
    $("#gradeMeta").textContent = note;
    $("#compareBadge").textContent = "效果预览";
    $$("#presetGrid .preset-btn").forEach((el) => el.classList.remove("active"));
    renderSliders();
    repaintGrade();

    // 默认跑一次自动校正
    const meta = estimateMetaFromCanvas(src);
    gradeState.params = autoGradeFromHistogram(null, meta);
    gradeState.activePreset = "auto";
    $$("#presetGrid .preset-btn").forEach((el) => el.classList.toggle("active", el.dataset.preset === "auto"));
    renderSliders();
    repaintGrade();

    if (loaded.cleanup) loaded.cleanup();
  } catch (err) {
    alert(err.message || String(err));
  }
}

/* ========== Photo Organizer ========== */
const orgState = {
  srcDir: null,
  destDir: null,
  items: [], // { file, handle, relPath, category, reason, planned, thumb }
  done: 0,
};

function orgLog(msg, cls) {
  const el = $("#orgLog");
  const line = document.createElement("div");
  if (cls) line.className = cls;
  line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  el.prepend(line);
}

function renderOrgPreview() {
  const box = $("#orgPreview");
  if (!orgState.items.length) {
    box.innerHTML = `<p class="org-empty">预览列表会出现在这里</p>`;
    return;
  }
  box.innerHTML = orgState.items
    .slice(0, 80)
    .map(
      (it) => `
    <div class="org-item">
      <img class="org-thumb" src="${it.thumb || ""}" alt="" />
      <div class="path">
        ${it.planned ? it.planned.path : it.relPath}
        ${it.exifSummary ? `<div class="org-exif mono">${it.exifSummary}</div>` : ""}
      </div>
      <span class="tag">${it.category || "…"}</span>
    </div>
  `
    )
    .join("");
}

async function setupOrganize() {
  if (!supportsFileSystemAccess()) {
    $("#orgStatus").innerHTML =
      "检测到当前浏览器不支持本地文件夹写入。请用 <strong>Chrome / Edge</strong> 打开本站；功能仅在本地读写你授权的文件夹。";
    $("#orgScanBtn").disabled = true;
    $("#orgDestBtn").disabled = true;
    $("#orgRunBtn").disabled = true;
    return;
  }

  $("#orgScanBtn").addEventListener("click", async () => {
    try {
      const dir = await pickDirectory("read");
      orgState.srcDir = dir;
      orgState.items = [];
      orgState.done = 0;
      $("#orgDoneCount").textContent = "0";
      $("#orgStatus").textContent = `已选择来源：${dir.name} 。正在扫描…`;
      orgLog(`扫描 ${dir.name} …`);

      const entries = await listImagesInDirectory(dir, 400);
      $("#orgScanCount").textContent = String(entries.length);
      orgLog(`发现 ${entries.length} 个图片文件`, "ok");

      const todayOnly = $("#orgTodayOnly").checked;
      const items = [];
      for (const entry of entries) {
        try {
          const buf = await readFileAsArrayBuffer(entry.file, 12 * 1024 * 1024);
          const exif = parseExifFromArrayBuffer(buf);
          const date = exif.dateTime || new Date(entry.file.lastModified);
          if (todayOnly && !isToday(date) && !isSameDay(date, new Date())) continue;

          // 缩略图 + 分类（重图用 file 即可）
          let img = null;
          try {
            img = await fileToImage(entry.file);
          } catch {
            /* ignore decode fail */
          }
          const category = img ? classifyImage(img, entry.file.name).category : "未分类";
          let thumb = "";
          if (img) {
            const c = document.createElement("canvas");
            const s = 64 / Math.max(img.naturalWidth, img.naturalHeight);
            c.width = Math.max(1, Math.round(img.naturalWidth * s));
            c.height = Math.max(1, Math.round(img.naturalHeight * s));
            c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
            thumb = c.toDataURL("image/jpeg", 0.6);
            if (img._objectUrl) URL.revokeObjectURL(img._objectUrl);
          }

          items.push({
            file: entry.file,
            handle: entry.handle,
            relPath: entry.relPath,
            category,
            date,
            exif,
            exifSummary: formatExifSummary(exif),
            thumb,
          });
        } catch (e) {
          orgLog(`跳过 ${entry.relPath}: ${e.message || e}`, "err");
        }
      }

      // 按时间排序 + 分配序号 + 生成新名字
      items.sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0));
      const loc = $("#orgLocation").value.trim();
      const seqMap = {};
      for (const it of items) {
        const key = `${it.date?.getFullYear()}-${it.date?.getMonth()}-${it.category}`;
        seqMap[key] = (seqMap[key] || 0) + 1;
        it.planned = buildOrganizedName(
          { name: it.file.name, lastModified: it.file.lastModified },
          { dateTime: it.date, gps: it.exif?.gps },
          it.category,
          loc,
          seqMap[key]
        );
      }

      orgState.items = items;
      $("#orgMatchCount").textContent = String(items.length);
      renderOrgPreview();
      $("#orgStatus").innerHTML = `扫描完成：共 ${entries.length} 张图，匹配 <strong>${items.length}</strong> 张。确认无误后点「一键整理」写入输出位置。`;
      orgLog(`准备整理 ${items.length} 张`, "ok");
    } catch (e) {
      $("#orgStatus").textContent = `扫描失败：${e.message || e}`;
      orgLog(String(e.message || e), "err");
    }
  });

  $("#orgDestBtn").addEventListener("click", async () => {
    try {
      const dir = await pickDirectory("readwrite");
      orgState.destDir = dir;
      $("#orgStatus").innerHTML = `输出位置：<strong>${dir.name}</strong>。文件会按 YYYY-MM/类型/ 写入。`;
      orgLog(`输出目录：${dir.name}`, "ok");
    } catch (e) {
      orgLog(String(e.message || e), "err");
    }
  });

  $("#orgRunBtn").addEventListener("click", async () => {
    if (!orgState.items.length) {
      alert("请先扫描照片文件夹");
      return;
    }
    if (!orgState.destDir) {
      alert("请选择输出位置");
      return;
    }
    const btn = $("#orgRunBtn");
    btn.disabled = true;
    btn.textContent = "整理中…";
    let ok = 0;
    let fail = 0;
    try {
      for (let i = 0; i < orgState.items.length; i++) {
        const it = orgState.items[i];
        try {
          const blob = it.file; // File 本身就是 Blob
          await writeFileToDirectory(orgState.destDir, it.planned.folder, it.planned.fileName, blob);
          ok++;
          $("#orgDoneCount").textContent = String(ok);
          orgLog(`✓ ${it.planned.path}`, "ok");
        } catch (e) {
          fail++;
          orgLog(`✗ ${it.relPath}: ${e.message || e}`, "err");
        }
      }
      $("#orgStatus").innerHTML = `整理完成：<strong>${ok}</strong> 成功` + (fail ? `，${fail} 失败` : "") + `。输出在「${orgState.destDir.name}」。`;
    } finally {
      btn.disabled = false;
      btn.textContent = "3 · 一键整理";
    }
  });

  $("#orgResetBtn").addEventListener("click", () => {
    orgState.srcDir = null;
    orgState.destDir = null;
    orgState.items = [];
    orgState.done = 0;
    $("#orgScanCount").textContent = "0";
    $("#orgMatchCount").textContent = "0";
    $("#orgDoneCount").textContent = "0";
    $("#orgPreview").innerHTML = `<p class="org-empty">预览列表会出现在这里</p>`;
    $("#orgLog").innerHTML = "";
    $("#orgStatus").textContent = "已重置。点「选择照片文件夹」开始。";
  });
}

/* ========== Field Calculators ========== */
function fillSelect(sel, values, selected) {
  sel.innerHTML = values
    .map((v) => `<option value="${v}" ${String(v) === String(selected) ? "selected" : ""}>${v}</option>`)
    .join("");
}

function setupCalculators() {
  // 曝光 selects
  const expRefN = $("#expRefN");
  const expRefT = $("#expRefT");
  const expRefISO = $("#expRefISO");
  const expN = $("#expN");
  const expT = $("#expT");
  const expISO = $("#expISO");
  if (!expRefN) return;

  fillSelect(expRefN, APERTURES, 2.8);
  fillSelect(expRefT, SHUTTERS, "1/125");
  fillSelect(expRefISO, ISOS, 100);
  fillSelect(expN, APERTURES, 2.8);
  fillSelect(expT, SHUTTERS, "1/125");
  fillSelect(expISO, ISOS, 100);
  fillSelect($("#dofN"), APERTURES, 5.6);
  fillSelect($("#ndBase"), SHUTTERS, "1/60");
  fillSelect($("#ndFilter"), Object.keys(ND_STOPS), "ND1000");

  function updateExp() {
    const refN = Number(expRefN.value);
    const refT = expRefT.value;
    const refISO = Number(expRefISO.value);
    $("#expRefEv").textContent = `EV ≈ ${solveExposure({ aperture: refN, shutter: refT, iso: refISO, lock: "iso" }).ev}`;

    const lock = $("#expLock").value;
    const N = Number(expN.value);
    const T = expT.value;
    const ISO = Number(expISO.value);

    let out = "";
    if (lock === "iso") {
      // 改 N 或 T，求 ISO
      const iso = matchISO(N, T, refN, refT, refISO);
      expISO.value = String([...ISOS].sort((a, b) => Math.abs(a - iso) - Math.abs(b - iso))[0]);
      out = `锁 ISO → 光圈 f/${N} 时，快门 ${T} 需要 ISO ≈ <strong>${iso}</strong>`;
    } else if (lock === "shutter") {
      const t = matchShutter(N, ISO, refN, refT, refISO);
      out = `锁快门 → ISO ${ISO} 时，光圈 f/${N} 对应快门 <strong>${t}s</strong>（当前选择 ${T}）`;
    } else {
      const n = matchAperture(T, ISO, refN, refT, refISO);
      out = `锁光圈 → 快门 ${T} / ISO ${ISO} 时，光圈应为 <strong>f/${n}</strong>`;
    }
    $("#expResult").innerHTML = out;
  }

  [expRefN, expRefT, expRefISO, expN, expT, expISO, $("#expLock")].forEach((el) =>
    el.addEventListener("change", updateExp)
  );
  updateExp();

  // DOF
  function updateDof() {
    const r = dofCalc({
      focal: $("#dofFocal").value,
      aperture: $("#dofN").value,
      distance: $("#dofDist").value,
      sensor: $("#dofSensor").value,
    });
    const far = r.far === Infinity ? "∞" : r.far.toFixed(2) + " m";
    const total = r.total === Infinity ? "∞" : r.total.toFixed(2) + " m";
    $("#dofOut").innerHTML = `
      <div class="big">超焦距 ${r.hyperfocal.toFixed(2)} m</div>
      <div>近清晰点：${r.near.toFixed(2)} m</div>
      <div>远清晰点：${far}</div>
      <div>景深范围：${total}</div>
    `;
  }
  ["#dofFocal", "#dofN", "#dofDist", "#dofSensor"].forEach((sel) =>
    $(sel).addEventListener("input", updateDof)
  );
  updateDof();

  // ND
  function updateNd() {
    const r = ndConvert($("#ndBase").value, ND_STOPS[$("#ndFilter").value] ?? 10);
    $("#ndOut").innerHTML = `
      <div class="big">${r.label}</div>
      <div>${r.friendly}</div>
      <div>约 ${r.seconds.toFixed(2)} 秒</div>
    `;
  }
  ["#ndBase", "#ndFilter"].forEach((sel) => $(sel).addEventListener("change", updateNd));
  updateNd();

  // Sun
  const dateInput = $("#sunDate");
  if (!dateInput.value) dateInput.value = new Date().toISOString().slice(0, 10);

  function updateSun() {
    const lat = Number($("#sunLat").value);
    const lon = Number($("#sunLon").value);
    const d = new Date(dateInput.value + "T12:00:00");
    const t = sunTimes(d, lat, lon);
    if (t.polar) {
      $("#sunOut").innerHTML = `<div class="big">${t.polar}</div><div>该纬度当日无正常日出日落</div>`;
      return;
    }
    $("#sunOut").innerHTML = `
      <div class="big">日出 ${fmtTime(t.sunrise)} · 日落 ${fmtTime(t.sunset)}</div>
      <div>黄金时刻（早）${fmtTime(t.goldenMorning.start)} – ${fmtTime(t.goldenMorning.end)}</div>
      <div>黄金时刻（晚）${fmtTime(t.goldenEvening.start)} – ${fmtTime(t.goldenEvening.end)}</div>
      <div>蓝调时刻（早）${fmtTime(t.blueMorning.start)} – ${fmtTime(t.blueMorning.end)}</div>
      <div>蓝调时刻（晚）${fmtTime(t.blueEvening.start)} – ${fmtTime(t.blueEvening.end)}</div>
    `;
  }
  ["#sunLat", "#sunLon", "#sunDate"].forEach((sel) => $(sel).addEventListener("input", updateSun));

  // 自定义常用地点（可保存，含内置城可删）
  const SUN_LOC_KEY = "lightjournal.sunLocs.v2";
  const DEFAULT_SUN_LOCS = [
    { name: "杭州", lat: 30.25, lon: 120.16, builtin: true },
    { name: "北京", lat: 39.9, lon: 116.4, builtin: true },
    { name: "上海", lat: 31.23, lon: 121.47, builtin: true },
    { name: "深圳", lat: 22.54, lon: 114.06, builtin: true },
    { name: "东京", lat: 35.68, lon: 139.69, builtin: true },
  ];

  function loadSunLocs() {
    try {
      const raw = localStorage.getItem(SUN_LOC_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      /* ignore */
    }
    return DEFAULT_SUN_LOCS.map((x) => ({ ...x }));
  }
  function saveSunLocs(list) {
    localStorage.setItem(SUN_LOC_KEY, JSON.stringify(list.slice(0, 20)));
  }

  function renderSunPresets() {
    const box = $("#sunPresets");
    if (!box) return;
    const locs = loadSunLocs();
    if (!locs.length) {
      box.innerHTML = `<span class="calc-note">没有地点了，可在下方添加或「恢复默认」</span>`;
      return;
    }
    box.innerHTML = locs
      .map(
        (c, idx) =>
          `<span class="chip sun-loc-chip">
            <button type="button" class="chip-loc-btn" data-loc="${c.lat},${c.lon}">${c.name}</button>
            <button type="button" class="del" data-del="${idx}" title="删除">×</button>
          </span>`
      )
      .join("") +
      `<button class="chip sun-restore" id="sunRestore" type="button">恢复默认</button>`;
  }

  function bindSunPresets() {
    const box = $("#sunPresets");
    if (!box) return;
    box.addEventListener("click", (e) => {
      if (e.target.closest("#sunRestore")) {
        saveSunLocs(DEFAULT_SUN_LOCS.map((x) => ({ ...x })));
        renderSunPresets();
        return;
      }
      const del = e.target.closest("[data-del]");
      if (del) {
        const idx = Number(del.dataset.del);
        const list = loadSunLocs();
        list.splice(idx, 1);
        saveSunLocs(list);
        renderSunPresets();
        return;
      }
      const locEl = e.target.closest("[data-loc]");
      if (!locEl) return;
      const [la, lo] = locEl.dataset.loc.split(",");
      $("#sunLat").value = la;
      $("#sunLon").value = lo;
      updateSun();
    });
  }

  $("#sunAddBtn")?.addEventListener("click", () => {
    $("#sunAddRow")?.classList.toggle("hidden");
    $("#sunLocName")?.focus();
  });

  $("#sunLocSave")?.addEventListener("click", () => {
    const name = ($("#sunLocName")?.value || "").trim();
    const lat = Number($("#sunLocLat")?.value);
    const lon = Number($("#sunLocLon")?.value);
    if (!name) return alert("请填写地点名称");
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return alert("请填写有效经纬度");
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return alert("经纬度超出范围");
    const list = loadSunLocs();
    list.unshift({ name: name.slice(0, 12), lat, lon, builtin: false });
    saveSunLocs(list);
    renderSunPresets();
    $("#sunLat").value = lat;
    $("#sunLon").value = lon;
    $("#sunLocName").value = "";
    $("#sunLocLat").value = "";
    $("#sunLocLon").value = "";
    $("#sunAddRow").classList.add("hidden");
    updateSun();
  });

  renderSunPresets();
  bindSunPresets();
  updateSun();

  // calc tabs
  $("#calcTabs").addEventListener("click", (e) => {
    const tab = e.target.closest("[data-calc]");
    if (!tab) return;
    $$("#calcTabs .calc-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    $$(".calc-panel").forEach((p) => p.classList.add("hidden"));
    $("#calc-" + tab.dataset.calc).classList.remove("hidden");
  });
}

/* ========== Mode switch ========== */
function setupModeSwitch() {
  const box = $("#modeSwitch");
  if (!box) return;
  box.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-mode]");
    if (!btn) return;
    const mode = btn.dataset.mode;
    $$(".mode-btn").forEach((b) => b.classList.toggle("active", b === btn));
    document.body.classList.remove("mode-learn", "mode-tool");
    if (mode === "learn") document.body.classList.add("mode-learn");
    if (mode === "tool") document.body.classList.add("mode-tool");
  });
}

/* ========== Watermark batch ========== */
function setupWatermark() {
  const drop = $("#wmDrop");
  const input = $("#wmFiles");
  let files = [];
  let wmType = "text";
  let wmStyle = "br";
  let logoImage = null;

  // 文字与常用设置：填过就记住，除非自己改
  const WM_TEXT_KEY = "lightjournal.wmText";
  const wmTextEl = $("#wmText");
  const savedText = localStorage.getItem(WM_TEXT_KEY);
  if (savedText != null && wmTextEl) wmTextEl.value = savedText;
  wmTextEl?.addEventListener("change", () => {
    localStorage.setItem(WM_TEXT_KEY, wmTextEl.value);
  });
  wmTextEl?.addEventListener("blur", () => {
    localStorage.setItem(WM_TEXT_KEY, wmTextEl.value);
  });

  function refreshStatus() {
    $("#wmStatus").textContent = files.length ? `已选 ${files.length} 张` : "未选择文件";
  }

  $("#wmTypeCards")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-wtype]");
    if (!btn) return;
    wmType = btn.dataset.wtype;
    $$("#wmTypeCards .wm-card").forEach((b) => b.classList.toggle("active", b === btn));
    // 样式默认
    if (wmType === "exif") wmStyle = "bar";
    else if (wmType === "frame" || wmType === "tile") wmStyle = "br";
    else if (wmType === "combo") wmStyle = "bl";
    const posSel = $("#wmPos");
    if (posSel) posSel.value = wmStyle === "bar" ? "bar" : wmStyle;
  });

  $("#wmPos")?.addEventListener("change", (e) => {
    wmStyle = e.target.value;
  });

  $("#wmLogoFile")?.addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      logoImage = img;
      const pre = $("#wmLogoPreview");
      pre.src = url;
      pre.classList.remove("hidden");
      $("#wmLogoStatus").textContent = `Logo：${f.name.slice(0, 18)}`;
    };
    img.src = url;
  });

  $("#wmLogoClear")?.addEventListener("click", () => {
    logoImage = null;
    $("#wmLogoPreview").classList.add("hidden");
    $("#wmLogoStatus").textContent = "未上传 Logo（可选）";
    $("#wmLogoFile").value = "";
  });

  $("#wmSavePreset")?.addEventListener("click", () => {
    saveWmPreset({
      type: wmType,
      style: wmStyle,
      text: $("#wmText").value,
      sub: $("#wmSub").value,
      opacity: Number($("#wmOpacity").value),
      size: Number($("#wmSize").value),
      showExif: $("#wmShowExif").checked,
    });
    alert("水印样式已保存到本机");
  });

  $("#wmLoadPreset")?.addEventListener("click", () => {
    const p = loadWmPreset();
    if (!p) return alert("还没有保存过水印样式");
    wmType = p.type || "text";
    wmStyle = p.style || "br";
    $("#wmText").value = p.text || "";
    $("#wmSub").value = p.sub || "";
    $("#wmOpacity").value = p.opacity ?? 65;
    $("#wmSize").value = p.size ?? 36;
    $("#wmShowExif").checked = !!p.showExif;
    $$("#wmTypeCards .wm-card").forEach((b) => b.classList.toggle("active", b.dataset.wtype === wmType));
    const posSel = $("#wmPos");
    if (posSel) posSel.value = wmStyle === "bar" ? "bar" : wmStyle;
    alert("已套用");
  });

  $("#wmPickBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    input.click();
  });
  drop.addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    input.click();
  });
  input.addEventListener("change", () => {
    files = [...input.files];
    refreshStatus();
  });

  ["dragenter", "dragover"].forEach((ev) =>
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.add("dragover");
    })
  );
  ["dragleave", "drop"].forEach((ev) =>
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.remove("dragover");
    })
  );
  drop.addEventListener("drop", (e) => {
    files = [...(e.dataTransfer.files || [])];
    refreshStatus();
  });

  $("#wmRunBtn").addEventListener("click", async () => {
    if (!files.length) {
      alert("请先选择图片");
      return;
    }
    const btn = $("#wmRunBtn");
    btn.disabled = true;
    btn.textContent = "处理中…";
    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        try {
          // EXIF
          let exif = null;
          try {
            const buf = await readFileAsArrayBuffer(f, 8 * 1024 * 1024);
            exif = parseExifFromArrayBuffer(buf);
          } catch {
            /* ignore */
          }
          const img = await fileToImage(f);
          const c = document.createElement("canvas");
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          c.getContext("2d").drawImage(img, 0, 0);

          drawWatermark(c, {
            type: wmType,
            style: wmStyle,
            text: $("#wmText").value.trim() || "© 摄影",
            sub: $("#wmSub").value || "",
            opacity: Number($("#wmOpacity").value),
            size: Number($("#wmSize").value),
            showExif: $("#wmShowExif").checked,
            logoImage,
            exif: formatExifWatermark(exif),
          });

          const blob = $("#wmUsePng")?.checked
            ? await exportCanvasPNG(c)
            : await exportCanvasJPEG(c, 0.95);
          if (img._objectUrl) URL.revokeObjectURL(img._objectUrl);
          if (blob) {
            const base = f.name.replace(/\.[^.]+$/, "");
            const ext = blob.type === "image/png" ? "png" : "jpg";
            downloadBlob(blob, `${base}-wm.${ext}`);
            $("#wmStatus").textContent = `已导出 ${i + 1} / ${files.length}（${ext.toUpperCase()}${ext === "png" ? "·无损" : ""}）`;
            await new Promise((r) => setTimeout(r, 160));
          }
        } catch (e) {
          console.warn(e);
        }
      }
      $("#wmStatus").textContent = `完成 ${files.length} 张`;
    } finally {
      btn.disabled = false;
      btn.textContent = "加水印并导出";
    }
  });
}

/* ========== Compare picker ========== */
function setupCompare() {
  const drop = $("#cmpDrop");
  const input = $("#cmpFiles");
  const grid = $("#cmpGrid");
  let items = [];
  let winnerId = null;

  function render() {
    grid.innerHTML = items
      .map(
        (it) => `
      <div class="cmp-card ${it.id === winnerId ? "winner" : ""}" data-id="${it.id}">
        <img src="${it.url}" alt="" />
        <div class="cmp-foot">
          <span>${it.name}</span>
          <input type="number" min="0" max="100" value="${it.score ?? ""}" data-score="${it.id}" placeholder="分" />
          <button class="pick-btn ${it.id === winnerId ? "active" : ""}" data-pick="${it.id}" type="button">选它</button>
        </div>
      </div>
    `
      )
      .join("");
    const best = items.reduce((a, b) => ((b.score ?? -1) > (a.score ?? -1) ? b : a), items[0] || { score: -1 });
    $("#cmpStatus").textContent = items.length
      ? winnerId
        ? `已选中：${items.find((x) => x.id === winnerId)?.name}`
        : best && best.score > 0
          ? `当前最高分：${best.name} (${best.score})`
          : `已载入 ${items.length} 张，可打分或点「选它」`
      : "—";
  }

  function addFiles(fileList) {
    const list = [...fileList].slice(0, 6);
    items = list.map((f, i) => ({
      id: "c" + Date.now() + i,
      name: f.name.length > 12 ? f.name.slice(0, 12) + "…" : f.name,
      url: URL.createObjectURL(f),
      score: null,
      file: f,
    }));
    winnerId = null;
    render();
  }

  $("#cmpPickBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    input.click();
  });
  drop.addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    input.click();
  });
  input.addEventListener("change", () => addFiles(input.files));

  ["dragenter", "dragover"].forEach((ev) =>
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.add("dragover");
    })
  );
  ["dragleave", "drop"].forEach((ev) =>
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.remove("dragover");
    })
  );
  drop.addEventListener("drop", (e) => addFiles(e.dataTransfer.files || []));

  grid.addEventListener("click", (e) => {
    const pick = e.target.closest("[data-pick]");
    if (pick) {
      winnerId = pick.dataset.pick;
      render();
    }
  });
  grid.addEventListener("input", (e) => {
    const inp = e.target.closest("[data-score]");
    if (!inp) return;
    const it = items.find((x) => x.id === inp.dataset.score);
    if (it) {
      it.score = inp.value === "" ? null : Number(inp.value);
      const best = items.reduce((a, b) => ((b.score ?? -1) > (a.score ?? -1) ? b : a), items[0] || { score: -1 });
      $("#cmpStatus").textContent = best && best.score > 0 ? `当前最高分：${best.name} (${best.score})` : `已载入 ${items.length} 张`;
    }
  });

  $("#cmpResetBtn").addEventListener("click", () => {
    items.forEach((it) => URL.revokeObjectURL(it.url));
    items = [];
    winnerId = null;
    grid.innerHTML = "";
    $("#cmpStatus").textContent = "—";
  });
}

/* ========== Ability Assessment ========== */
const assessState = {
  answers: {},
  photos: [], // File[]
  results: [], // analyzeImage results
};

function setupAssessment() {
  const list = $("#quizList");
  if (!list) return;

  function renderQuiz() {
    list.innerHTML = QUIZ_BANK.map(
      (q) => `
      <div class="quiz-card" data-qid="${q.id}">
        <div class="q-meta">Q${q.id} · ${QUIZ_DIMENSIONS[q.dim].name} · ${"★".repeat(q.level)}</div>
        <p class="q-text">${q.q}</p>
        <div class="quiz-opts">
          ${q.options
            .map(
              (opt, i) => `
            <label class="quiz-opt ${assessState.answers[q.id] === i ? "selected" : ""}">
              <input type="radio" name="q${q.id}" value="${i}" ${assessState.answers[q.id] === i ? "checked" : ""} />
              <span>${"ABCD"[i]}. ${opt}</span>
            </label>
          `
            )
            .join("")}
          <label class="quiz-opt quiz-unknown ${assessState.answers[q.id] === -1 ? "selected" : ""}">
            <input type="radio" name="q${q.id}" value="-1" ${assessState.answers[q.id] === -1 ? "checked" : ""} />
            <span>E. 不懂（不要硬猜）</span>
          </label>
        </div>
      </div>
    `
    ).join("");
    updateQuizProgress();
  }

  function updateQuizProgress() {
    const n = Object.keys(assessState.answers).length;
    $("#quizProgress").textContent = `${n} / ${QUIZ_BANK.length}`;
  }

  list.addEventListener("change", (e) => {
    const input = e.target.closest("input[type=radio]");
    if (!input) return;
    const card = input.closest("[data-qid]");
    const qid = Number(card.dataset.qid);
    assessState.answers[qid] = Number(input.value);
    card.querySelectorAll(".quiz-opt").forEach((el) => el.classList.remove("selected"));
    input.closest(".quiz-opt").classList.add("selected");
    updateQuizProgress();
  });

  $("#quizResetBtn").addEventListener("click", () => {
    assessState.answers = {};
    renderQuiz();
    $("#assessReport").classList.add("hidden");
    $("#assessQuizWrap").classList.remove("hidden");
  });

  async function runReport(fromBaseline) {
    const btn = $("#quizSubmitBtn");
    const oldText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "出分中…";
    try {
      // 日常出分：不再分析照片，融合已存的作品基线
      const report = buildAssessment({
        quizAnswers: assessState.answers,
        photoResults: null,
        baseline: loadBaseline(),
      });
      renderReport(report);
      $("#assessReport").classList.remove("hidden");
      $("#assessQuizWrap").classList.add("hidden");
      $("#assessPhotoWrap").classList.add("hidden");
    } finally {
      btn.disabled = false;
      btn.textContent = oldText;
    }
  }

  $("#quizSubmitBtn").addEventListener("click", () => {
    const n = Object.keys(assessState.answers).length;
    if (n < QUIZ_BANK.length) {
      if (!confirm(`还有 ${QUIZ_BANK.length - n} 题未作答（未答按「不懂」计）。仍要出分吗？`)) return;
    }
    runReport(false);
  });

  // Modal open/close
  const overlay = $("#assessOverlay");
  function openAssess() {
    overlay.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    overlay.querySelector(".assess-modal")?.scrollTo?.({ top: 0 });
  }
  function closeAssess() {
    overlay.classList.add("hidden");
    document.body.style.overflow = "";
  }
  $("#openAssessBtn")?.addEventListener("click", openAssess);
  $("#closeAssessBtn")?.addEventListener("click", closeAssess);
  $("#reportClose")?.addEventListener("click", closeAssess);
  overlay?.addEventListener("click", (e) => {
    if (e.target === overlay) closeAssess();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.classList.contains("hidden")) closeAssess();
  });

  // photos
  const drop = $("#assessDrop");
  const fileInput = $("#assessFiles");

  $("#assessPickBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    fileInput.click();
  });
  fileInput.addEventListener("change", () => handleAssessFiles(fileInput.files));

  ["dragenter", "dragover"].forEach((ev) =>
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.add("dragover");
    })
  );
  ["dragleave", "drop"].forEach((ev) =>
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.remove("dragover");
    })
  );
  drop.addEventListener("drop", (e) => handleAssessFiles(e.dataTransfer.files));

  function handleAssessFiles(fileList) {
    const imgs = [...fileList].filter((f) => f.type.startsWith("image/")).slice(0, 20);
    assessState.photos = imgs;
    const n = imgs.length;
    $("#assessPhotoStatus").textContent = n
      ? n < 10
        ? `已选 ${n} 张（建议 10–20 张，仍可继续）`
        : `已选 ${n} 张`
      : "未选择";
    $("#assessThumbs").innerHTML = imgs
      .map((f) => `<img src="${URL.createObjectURL(f)}" alt="" />`)
      .join("");
  }

  async function analyzeAssessPhotos() {
    assessState.results = [];
    const total = assessState.photos.length;
    for (let i = 0; i < total; i++) {
      const f = assessState.photos[i];
      try {
        $("#assessPhotoStatus").textContent = `分析中 ${i + 1} / ${total} …`;
        const loaded = await loadPhotoFile(f);
        const result = analyzeImage(loaded.img);
        assessState.results.push(result);
        if (loaded.cleanup) loaded.cleanup();
      } catch (e) {
        console.warn("assess photo fail", e);
      }
    }
    $("#assessPhotoStatus").textContent = total ? `已分析 ${assessState.results.length} / ${total} 张` : "未选择";
    return assessState.results;
  }

  function renderReport(report) {
    assessState._lastStartWeek = report.startWeek;
    $("#assessReport").classList.remove("hidden");
    $("#reportCombined").textContent = String(report.combined);
    $("#reportLevel").textContent = `水平判断：${report.level}`;
    $("#reportStart").innerHTML =
      report.combined >= 85
        ? `基础很稳，建议直接进入 <strong>Week ${String(report.startWeek).padStart(2, "0")}</strong>（题材/进阶）打磨。`
        : `建议从 <strong>Week ${String(report.startWeek).padStart(2, "0")}</strong> 开始补齐；也可按下面优先级从弱项攻。`;
    $("#reportMeta").textContent =
      `答题 正确 ${report.quizCorrect} · 猜错 ${report.quizWrong} · 不懂 ${report.quizUnknown}（满分 ${report.quizTotal}）` +
      (report.baselineUsed === "stored"
        ? ` · 已融合作品基线（${report.photoCount} 张均分 ${report.photoAvg}）`
        : report.baselineUsed === "live"
          ? ` · 本次作品 ${report.photoCount} 张均分 ${report.photoAvg}`
          : " · 尚无作品基线（可在上方建立一次）");

    $("#reportDims").innerHTML = Object.entries(report.dimScores)
      .map(([k, v]) => {
        const name = QUIZ_DIMENSIONS[k] ? QUIZ_DIMENSIONS[k].name : k;
        return `
        <div class="report-dim">
          <div class="name">${name}</div>
          <div class="num">${v}</div>
          <div class="bar"><i style="width:${v}%"></i></div>
        </div>
      `;
      })
      .join("");

    $("#reportGaps").innerHTML = report.gaps
      .map(
        (g) => `
      <div class="gap-card">
        <strong>${g.title}</strong>
        <p>${g.advice}</p>
        <span class="weeks">对应课程：${g.weeks}</span>
      </div>
    `
      )
      .join("");

    $("#reportWrong").innerHTML = report.wrong.length
      ? report.wrong
          .map(
            (w) => `
      <div class="wrong-item ${w.type === "unknown" ? "is-unknown" : "is-wrong"}">
        <div class="wq">[${w.dim}] ${w.type === "unknown" ? "知识缺口" : "易错"} · ${w.q}</div>
        <div class="we">${w.explain}</div>
      </div>
    `
          )
          .join("")
      : `<p class="calc-note" style="color:#8a7d6c">全部答对，很稳！</p>`;

    $("#assessReport").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function refreshBaselineBadge() {
    const b = loadBaseline();
    const badge = $("#baselineBadge");
    if (!badge) return;
    if (b && b.photoAvg != null) {
      const when = b.savedAt ? new Date(b.savedAt).toLocaleDateString("zh-CN") : "";
      badge.textContent = `已建立 · ${b.photoCount || "?"} 张 · 均分 ${b.photoAvg}${when ? " · " + when : ""}`;
    } else {
      badge.textContent = "未建立";
    }
  }

  // 作品定性：仅建立/更新基线
  $("#assessRunBtn").addEventListener("click", async () => {
    if (!assessState.photos.length) {
      alert("请先选择 10–20 张照片");
      return;
    }
    const btn = $("#assessRunBtn");
    btn.disabled = true;
    btn.textContent = "分析中…";
    try {
      await analyzeAssessPhotos();
      if (!assessState.results.length) {
        alert("没有成功分析任何照片");
        return;
      }
      // 稳健统计后写入基线
      const tmp = buildAssessment({
        quizAnswers: {},
        photoResults: assessState.results,
        baseline: null,
      });
      saveBaseline({
        photoAgg: tmp.photoAgg,
        photoAvg: tmp.photoAvg,
        photoCount: assessState.results.length,
        savedAt: new Date().toISOString(),
      });
      refreshBaselineBadge();
      alert(`作品基线已建立：${assessState.results.length} 张，均分 ${tmp.photoAvg}。之后再测只跑题目。`);
    } finally {
      btn.disabled = false;
      btn.textContent = "建立作品基线";
    }
  });

  $("#assessSkipBtn").addEventListener("click", () => {
    if (!Object.keys(assessState.answers).length) {
      alert("请先答题，或点「建立作品基线」");
      return;
    }
    runReport(false);
  });

  $("#reportRetry").addEventListener("click", () => {
    assessState.answers = {};
    $("#assessReport").classList.add("hidden");
    $("#assessQuizWrap").classList.remove("hidden");
    $("#assessQuizWrap").scrollIntoView({ behavior: "smooth", block: "start" });
    renderQuiz();
    refreshBaselineBadge();
  });

  $("#reportGoPlan").addEventListener("click", () => {
    closeAssess();
    const week = document.querySelector(`[data-week="${assessState._lastStartWeek || 1}"]`);
    if (week) {
      week.classList.add("open");
      week.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      $("#plan")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  refreshBaselineBadge();
  renderQuiz();
}

/* ========== Sidebar ========== */
function setupSidebar() {
  const sidebar = $("#sidebar");
  const backdrop = $("#sideBackdrop");
  const toggle = $("#sideToggle");
  const close = $("#sideClose");
  if (!sidebar || !toggle) return;

  function openSide() {
    sidebar.classList.add("open");
    if (backdrop) backdrop.classList.remove("hidden");
  }
  function closeSide() {
    sidebar.classList.remove("open");
    if (backdrop) backdrop.classList.add("hidden");
  }
  function toggleSide() {
    if (sidebar.classList.contains("open")) closeSide();
    else openSide();
  }

  toggle.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleSide();
  });
  close?.addEventListener("click", closeSide);
  backdrop?.addEventListener("click", closeSide);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSide();
  });

  // 滚动高亮
  const links = $$(".side-link");
  const map = links
    .map((a) => {
      const id = (a.getAttribute("href") || "").replace("#", "");
      const el = id ? document.getElementById(id) : null;
      return el ? { a, el } : null;
    })
    .filter(Boolean);

  function onScroll() {
    let current = map[0];
    for (const item of map) {
      const top = item.el.getBoundingClientRect().top;
      if (top <= 120) current = item;
    }
    if (!current) return;
    links.forEach((a) => a.classList.toggle("active", a === current.a));
    const title = $("#topbarTitle");
    if (title) title.textContent = current.a.textContent.trim();
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  links.forEach((a) =>
    a.addEventListener("click", () => {
      if (window.innerWidth <= 980) closeSide();
    })
  );

  $("#openAssessSide")?.addEventListener("click", (e) => {
    e.preventDefault();
    closeSide();
    document.querySelector("#openAssessBtn")?.click();
  });
}

/* ========== Boot ========== */
function init() {
  setupSidebar();
  renderPath();
  renderStageFilter();
  renderPlan();
  bindPlan();
  renderDrills();
  renderLibrary();
  renderCheats();
  renderJournal();
  setupUpload();
  setupGrade();
  setupOrganize();
  setupCalculators();
  setupModeSwitch();
  setupWatermark();
  setupCompare();
  setupCull();
  setupAssessment();

  $("#clearJournalBtn").addEventListener("click", () => {
    if (!confirm("确定清空练习记录？")) return;
    saveJSON(STORE_KEYS.journal, []);
    renderJournal();
  });

  $("#genReportBtn")?.addEventListener("click", () => {
    const data = computeLearningReport();
    renderLearningReport($("#learningReportMount"), data);
    $("#learningReportMount")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $("#exportReportBtn")?.addEventListener("click", () => {
    const data = computeLearningReport();
    renderLearningReport($("#learningReportMount"), data);
    downloadLearningReportHTML(data);
  });

  $("#scrollTopBtn").addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

document.addEventListener("DOMContentLoaded", init);
