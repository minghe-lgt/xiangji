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
        <div class="num">STAGE ${idx + 1}</div>
        <div class="name">${st.name}</div>
        <div class="sub">${st.subtitle}</div>
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
        <img class="j-thumb" src="${item.thumb}" alt="" />
        <div>
          <h4>${item.name}</h4>
          <p>${item.date} · ${item.grade} · ${item.topTip}</p>
        </div>
        <div class="j-score">${item.score}</div>
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

  function resetView() {
    uploadEmpty.classList.remove("hidden");
    uploadPreview.classList.add("hidden");
    $("#resultsBody").classList.add("hidden");
    $("#resultsEmpty").classList.remove("hidden");
    fileInput.value = "";
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

      const result = analyzeImage(img);
      renderResults(result);

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
  { key: "exposure", name: "曝光", min: -200, max: 200, scale: 100 },
  { key: "contrast", name: "对比度", min: -100, max: 100, scale: 1 },
  { key: "highlights", name: "高光", min: -100, max: 100, scale: 1 },
  { key: "shadows", name: "阴影", min: -100, max: 100, scale: 1 },
  { key: "whites", name: "白色", min: -100, max: 100, scale: 1 },
  { key: "blacks", name: "黑色", min: -100, max: 100, scale: 1 },
  { key: "temp", name: "色温", min: -100, max: 100, scale: 1 },
  { key: "tint", name: "色调", min: -100, max: 100, scale: 1 },
  { key: "vibrance", name: "自然饱和", min: -100, max: 100, scale: 1 },
  { key: "saturation", name: "饱和度", min: -100, max: 100, scale: 1 },
  { key: "clarity", name: "清晰度", min: -100, max: 100, scale: 1 },
  { key: "fade", name: "褪色", min: 0, max: 100, scale: 1 },
  { key: "vignette", name: "暗角", min: 0, max: 100, scale: 1 },
];

let gradeState = {
  sourceCanvas: null,
  params: { ...DEFAULT_GRADE },
  showingOriginal: false,
  activePreset: null,
};

function setupGrade() {
  const drop = $("#gradeDrop");
  const fileInput = $("#gradeFile");
  const gradeEmpty = $("#gradeEmpty");
  const gradePreview = $("#gradePreview");
  const gradeCanvas = $("#gradeCanvas");

  // presets
  $("#presetGrid").innerHTML = GRADE_PRESETS.map(
    (p) => `
    <button class="preset-btn" type="button" data-preset="${p.id}">
      <strong>${p.name}</strong>
      <span>${p.desc}</span>
    </button>
  `
  ).join("");

  $("#presetGrid").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-preset]");
    if (!btn || !gradeState.sourceCanvas) {
      if (btn && !gradeState.sourceCanvas) alert("请先载入一张照片");
      return;
    }
    const preset = GRADE_PRESETS.find((p) => p.id === btn.dataset.preset);
    if (!preset) return;

    if (preset.params === "AUTO") {
      const meta = estimateMetaFromCanvas(gradeState.sourceCanvas);
      gradeState.params = autoGradeFromHistogram(null, meta);
    } else {
      gradeState.params = { ...preset.params };
    }
    gradeState.activePreset = preset.id;
    gradeState.showingOriginal = false;
    renderSliders();
    repaintGrade();
    $$("#presetGrid .preset-btn").forEach((el) => {
      el.classList.toggle("active", el.dataset.preset === preset.id);
    });
  });

  // sliders
  renderSliders();
  bindSliders();
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
    const blob = await exportCanvasJPEG(gradeCanvas, 0.92);
    if (blob) downloadBlob(blob, `lightjournal-grade-${Date.now()}.jpg`);
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
  $("#sliderList").innerHTML = GRADE_SLIDERS.map((s) => {
    const raw = gradeState.params[s.key];
    const val = Math.round(raw * s.scale);
    return `
      <div class="slider-row">
        <label for="sl-${s.key}">${s.name}</label>
        <input type="range" id="sl-${s.key}" data-key="${s.key}" data-scale="${s.scale}"
          min="${s.min}" max="${s.max}" value="${val}" />
        <span class="val" id="val-${s.key}">${(raw).toFixed(s.scale > 1 ? 2 : 0)}</span>
      </div>
    `;
  }).join("");
}

function bindSliders() {
  $("#sliderList").addEventListener("input", (e) => {
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

  // 限制预览尺寸，保证流畅
  const maxSide = 1400;
  let sw = src.width;
  let sh = src.height;
  if (Math.max(sw, sh) > maxSide) {
    const s = maxSide / Math.max(sw, sh);
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

async function handleGradeFile(file) {
  try {
    const loaded = await loadPhotoFile(file);
    const img = loaded.img;

    // 全分辨率源（限制最长边 2400 以免内存爆）
    const maxSide = 2400;
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if (Math.max(w, h) > maxSide) {
      const s = maxSide / Math.max(w, h);
      w = Math.round(w * s);
      h = Math.round(h * s);
    }
    const src = document.createElement("canvas");
    src.width = w;
    src.height = h;
    src.getContext("2d").drawImage(img, 0, 0, w, h);

    gradeState.sourceCanvas = src;
    gradeState.params = { ...DEFAULT_GRADE };
    gradeState.activePreset = null;
    gradeState.showingOriginal = false;

    $("#gradeEmpty").classList.add("hidden");
    $("#gradePreview").classList.remove("hidden");
    $("#gradeMeta").textContent = loaded.note || `${file.name}`;
    $("#compareBadge").textContent = "效果预览";
    $$("#presetGrid .preset-btn").forEach((el) => el.classList.remove("active"));
    renderSliders();
    repaintGrade();

    // 默认跑一次自动校正，方便上手
    const meta = estimateMetaFromCanvas(src);
    gradeState.params = autoGradeFromHistogram(null, meta);
    gradeState.activePreset = "auto";
    $$("#presetGrid .preset-btn").forEach((el) => el.classList.toggle("active", el.dataset.preset === "auto"));
    renderSliders();
    repaintGrade();

    if (loaded.cleanup) {
      // 保留 img 引用已绘制，可释放 blob URL
      loaded.cleanup();
    }
  } catch (err) {
    alert(err.message || String(err));
  }
}

/* ========== Boot ========== */
function init() {
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

  $("#clearJournalBtn").addEventListener("click", () => {
    if (!confirm("确定清空练习记录？")) return;
    saveJSON(STORE_KEYS.journal, []);
    renderJournal();
  });

  $("#scrollTopBtn").addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

document.addEventListener("DOMContentLoaded", init);
