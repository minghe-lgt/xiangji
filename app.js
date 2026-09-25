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
