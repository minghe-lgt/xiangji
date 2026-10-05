/**
 * 选片台 — 千张级快筛
 * 本地文件夹导入、懒加载缩略图、键盘拣选、导出已选。
 * 支持 File System Access（Chrome/Edge）与 directory input 回退。
 */

const CULL_STORE_KEY = "lightjournal.cullPrefs";

function loadCullPrefs() {
  try {
    return JSON.parse(localStorage.getItem(CULL_STORE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveCullPrefs(p) {
  localStorage.setItem(CULL_STORE_KEY, JSON.stringify(p));
}

/**
 * item: {
 *   id, name, file?, handle?,
 *   thumbUrl, w, h, size, lastModified,
 *   status: 'new'|'pick'|'reject',
 *   stars: 0-5
 * }
 */
const cullState = {
  items: [],
  filtered: [],
  index: 0,
  filter: "all", // all | new | pick | reject | star | candidate
  minStars: 0,
  sort: "score", // score | time | name
  nameQuery: "",
  autoAdvance: true,
  zoom: "fit", // fit | 100
  undoStack: [],
  srcHandle: null,
  destHandle: null,
  observer: null,
};

function cullLog(msg, cls) {
  const el = $("#cullLog");
  if (!el) return;
  const d = document.createElement("div");
  if (cls) d.className = cls;
  d.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  el.prepend(d);
}

function cullStats() {
  const t = cullState.items.length;
  const pick = cullState.items.filter((x) => x.status === "pick").length;
  const reject = cullState.items.filter((x) => x.status === "reject").length;
  const rated = cullState.items.filter((x) => x.stars >= 3).length;
  $("#cullCount").textContent = String(t);
  $("#cullPickCount").textContent = String(pick);
  $("#cullRejectCount").textContent = String(reject);
  $("#cullStarCount").textContent = String(rated);
}

function cullSortList(list) {
  const s = cullState.sort;
  const arr = [...list];
  if (s === "time") {
    arr.sort((a, b) => (a.lastModified || 0) - (b.lastModified || 0) || a.name.localeCompare(b.name));
  } else if (s === "name") {
    arr.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    arr.sort((a, b) => {
      const sa = (a.aiScore != null ? a.aiScore : a.localScore) ?? -1;
      const sb = (b.aiScore != null ? b.aiScore : b.localScore) ?? -1;
      return sb - sa || (a.lastModified || 0) - (b.lastModified || 0);
    });
  }
  return arr;
}

function applyCullFilter() {
  const f = cullState.filter;
  let list = cullState.items;
  if (f === "new") list = list.filter((x) => x.status === "new");
  else if (f === "pick") list = list.filter((x) => x.status === "pick");
  else if (f === "reject") list = list.filter((x) => x.status === "reject");
  else if (f === "star") list = list.filter((x) => x.stars >= (cullState.minStars || 3));
  else if (f === "candidate") list = list.filter((x) => x.status === "pick" || (x.stars || 0) >= 3);

  const q = (cullState.nameQuery || "").trim().toLowerCase();
  if (q) list = list.filter((x) => x.name.toLowerCase().includes(q));

  cullState.filtered = cullSortList(list);
  if (cullState.index >= cullState.filtered.length) cullState.index = 0;
  renderCullGrid();
  renderCullFocus();
  $("#cullFiltered").textContent = `${cullState.filtered.length} / ${cullState.items.length}`;
}

function starsHtml(n) {
  let s = "";
  for (let i = 1; i <= 5; i++) s += `<span class="${i <= n ? "on" : ""}">★</span>`;
  return s;
}

/** 卡片说明文字（星标 + 分数 + 文件名），重建与原地更新共用 */
function cullCardCaption(it) {
  const score =
    it.aiScore != null
      ? `<em class="cull-score ai">${it.aiScore}</em>`
      : it.localScore != null
        ? `<em class="cull-score">${it.localScore}</em>`
        : "";
  return `<span class="cull-stars">${starsHtml(it.stars)}${score}</span>
      <span class="cull-name">${esc(it.name.slice(0, 14))}${it.autoNote ? " · " + esc(it.autoNote) : ""}</span>`;
}

/** 状态变化只更新受影响的那张卡，避免千张级全量重建 */
function syncCullCard(it) {
  const idx = cullState.filtered.indexOf(it);
  if (idx < 0) return;
  const cell = $(`#cullGrid .cull-cell[data-idx="${idx}"]`);
  if (!cell) return;
  cell.classList.toggle("is-pick", it.status === "pick");
  cell.classList.toggle("is-reject", it.status === "reject");
  const flag = cell.querySelector(".cull-flag");
  if (flag) flag.textContent = it.status === "pick" ? "入选" : it.status === "reject" ? "否" : "";
  const cap = cell.querySelector("figcaption");
  if (cap) cap.innerHTML = cullCardCaption(it);
}

/** 当前过滤条件下该项是否应在列（用于判断按键后名单是否变化） */
function cullInFilter(x) {
  const f = cullState.filter;
  if (f === "new") return x.status === "new";
  if (f === "pick") return x.status === "pick";
  if (f === "reject") return x.status === "reject";
  if (f === "star") return (x.stars || 0) >= (cullState.minStars || 3);
  if (f === "candidate") return x.status === "pick" || (x.stars || 0) >= 3;
  return true;
}

/** 焦点切换：只动上一格和当前格，不做全网格遍历 */
function setActiveCullCell() {
  const el = $(`#cullGrid .cull-cell[data-idx="${cullState.index}"]`);
  const prev = cullState._activeCell;
  if (prev !== el) {
    prev?.classList.remove("is-active");
    el?.classList.add("is-active");
    cullState._activeCell = el;
  }
  el?.scrollIntoView({ block: "nearest" });
}

function renderCullGrid() {
  const box = $("#cullGrid");
  if (!box) return;
  cullState._activeCell = null;
  if (!cullState.filtered.length) {
    box.innerHTML = `<p class="cull-empty">没有符合条件的照片</p>`;
    return;
  }
  // 一次只渲染可视区域附近的 DOM（简单窗口，约 120 张一屏）
  const list = cullState.filtered;
  box.innerHTML = list
    .map((it, idx) => {
      const mark =
        it.status === "pick" ? "is-pick" : it.status === "reject" ? "is-reject" : "";
      return `
      <figure class="cull-cell ${mark} ${idx === cullState.index ? "is-active" : ""}" data-idx="${idx}" title="${esc(it.name)}">
        <div class="cull-thumb-wrap">
          <img data-src="${it.thumbUrl || ""}" alt="" loading="lazy" />
          <span class="cull-flag">${it.status === "pick" ? "入选" : it.status === "reject" ? "否" : ""}</span>
        </div>
        <figcaption>${cullCardCaption(it)}</figcaption>
      </figure>`;
    })
    .join("");
  cullState._activeCell = $(`#cullGrid .cull-cell[data-idx="${cullState.index}"]`);
  // lazy load via observer
  if (cullState.observer) cullState.observer.disconnect();
  cullState.observer = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (en.isIntersecting) {
          const img = en.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute("data-src");
          }
          cullState.observer.unobserve(img);
        }
      }
    },
    { root: box, rootMargin: "400px 0px" }
  );
  box.querySelectorAll("img[data-src]").forEach((img) => cullState.observer.observe(img));
}

function renderCullFocus() {
  const it = cullState.filtered[cullState.index];
  const stage = $("#cullStage");
  if (!stage) return;
  if (!it) {
    stage.innerHTML = `<p class="cull-empty">选择缩略图，或按方向键浏览</p>`;
    $("#cullMeta").textContent = "—";
    return;
  }
  const zoomCls = cullState.zoom === "100" ? "is-100" : "is-fit";
  const scoreLine = [];
  if (it.aiScore != null) scoreLine.push(`AI ${it.aiScore}`);
  if (it.localScore != null) scoreLine.push(`本地 ${it.localScore}`);
  if (it.autoNote) scoreLine.push(it.autoNote);
  stage.innerHTML = `
    <img src="${it.thumbUrl || it.objectUrl || ""}" alt="${esc(it.name)}" id="cullBigImg" class="${zoomCls}" />
    <div class="cull-big-flag ${it.status}">${it.status === "pick" ? "已入选" : it.status === "reject" ? "已否决" : "未评"}</div>
  `;
  $("#cullMeta").innerHTML = `<div>${esc(it.name)} · ${it.w || "?"}×${it.h || "?"} · ${(it.size / 1024 / 1024).toFixed(1)}MB · ★${it.stars}</div>
    <div>${esc(scoreLine.join(" · ")) || "—"}</div>
    <div>位置 ${cullState.index + 1} / ${cullState.filtered.length}</div>`;
  setActiveCullCell();
}

function cullAct(action) {
  const it = cullState.filtered[cullState.index];
  if (!it) return;

  const snapshot = { id: it.id, status: it.status, stars: it.stars, autoNote: it.autoNote };
  const pushUndo = () => {
    cullState.undoStack.push(snapshot);
    if (cullState.undoStack.length > 50) cullState.undoStack.shift();
  };
  // 评分类操作先记录「是否在当前过滤名单里」，结束后对比决定要不要重建名单
  let membershipBefore = null;
  if (action === "pick" || action === "reject" || action.startsWith("star")) {
    membershipBefore = cullInFilter(it);
  }

  if (action === "pick") {
    pushUndo();
    it.status = it.status === "pick" ? "new" : "pick";
    if (it.status === "pick" && it.stars < 1) it.stars = 3;
    if (cullState.autoAdvance && it.status === "pick") cullState.index++;
  } else if (action === "reject") {
    pushUndo();
    it.status = it.status === "reject" ? "new" : "reject";
    if (it.status === "reject") it.stars = 0;
    if (cullState.autoAdvance && it.status === "reject") cullState.index++;
  } else if (action.startsWith("star")) {
    const n = Number(action.slice(4));
    pushUndo();
    it.stars = it.stars === n ? 0 : n;
    if (it.stars >= 3) it.status = "pick";
    else if (it.status === "pick" && it.stars === 0) it.status = "new";
  } else if (action === "next") {
    if (cullState.index < cullState.filtered.length - 1) cullState.index++;
  } else if (action === "prev") {
    if (cullState.index > 0) cullState.index--;
  } else if (action === "undo") {
    const snap = cullState.undoStack.pop();
    if (!snap) {
      cullLog("没有可撤销的操作");
      return;
    }
    const target = cullState.items.find((x) => x.id === snap.id);
    if (target) {
      target.status = snap.status;
      target.stars = snap.stars;
      target.autoNote = snap.autoNote;
    }
    cullLog("已撤销一步", "ok");
  } else if (action === "zoom") {
    cullState.zoom = cullState.zoom === "fit" ? "100" : "fit";
    renderCullFocus();
    return;
  }

  if (cullState.index >= cullState.filtered.length) {
    cullState.index = Math.max(0, cullState.filtered.length - 1);
  }
  // 名单没变的评分/翻页走快速路径，只有名单进出才全量重建
  if (membershipBefore !== null && membershipBefore !== cullInFilter(it)) {
    applyCullFilter();
  } else if (action === "pick" || action === "reject" || action.startsWith("star")) {
    syncCullCard(it);
    renderCullFocus();
  } else if (action !== "undo") {
    renderCullFocus();
  } else {
    applyCullFilter();
  }
  cullStats();
}

async function cullAddFiles(fileList, handleMap) {
  const files = [...fileList].filter((f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp|arw|cr2|nef|dng|tiff?)$/i.test(f.name));
  cullLog(`读取 ${files.length} 张…`);
  const base = cullState.items.length;
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    try {
      let thumbUrl = "";
      let w = 0, h = 0;
      // RAW 取内嵌预览
      let loadFile = f;
      if (isRawFile(f) && typeof extractRawPreview === "function") {
        try {
          const buf = await f.arrayBuffer();
          const prev = await extractRawPreview(buf);
          loadFile = prev.blob;
        } catch {
          /* fall through */
        }
      }
      const url = URL.createObjectURL(loadFile);
      const img = await loadImage(url);
      w = img.naturalWidth;
      h = img.naturalHeight;
      // 小缩略
      const c = document.createElement("canvas");
      const s = Math.min(1, 320 / Math.max(w, h, 1));
      c.width = Math.max(1, Math.round(w * s));
      c.height = Math.max(1, Math.round(h * s));
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      thumbUrl = c.toDataURL("image/jpeg", 0.72);
      URL.revokeObjectURL(url);

      const item = {
        id: "c" + Date.now().toString(36) + "_" + i,
        name: f.name,
        file: f,
        handle: handleMap && handleMap.get(f),
        thumbUrl,
        objectUrl: null,
        w, h,
        size: f.size,
        lastModified: f.lastModified,
        status: "new",
        stars: 0,
      };
      cullState.items.push(item);
    } catch (e) {
      if (/\.(cr3|heic|avif)$/i.test(f.name)) {
        cullLog(`跳过 ${f.name}：CR3/HEIC/AVIF 暂不支持解析，请用相机 RAW+JPEG 或先转成 JPG`, "err");
      } else {
        cullLog(`跳过 ${f.name}: ${e.message || e}`, "err");
      }
    }
    if (i % 50 === 0) {
      $("#cullStatus").textContent = `生成缩略图 ${i + 1} / ${files.length}`;
    }
  }
  $("#cullStatus").textContent = `已载入 ${cullState.items.length} 张`;
  cullLog(`完成，共 ${cullState.items.length} 张`, "ok");
  cullStats();
  applyCullFilter();
}

/* ========== AI / 智能初筛 ========== */

/**
 * 本地质检：只判断「技术废片」（糊/爆/死黑/灰平），
 * 不判断审美。审美交给 AI 精评。
 */
async function cullLocalScoreItem(item, cache) {
  if (item._scoredLocal && item.localScore != null) return item;
  let img = cache && cache.get(item.id);
  try {
    if (!img) {
      const url = item.thumbUrl || URL.createObjectURL(item.file);
      img = await loadImage(url);
      if (cache) cache.set(item.id, img);
    }
    const max = 180;
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight, 1));
    const w = Math.max(8, Math.round(img.naturalWidth * s));
    const h = Math.max(8, Math.round(img.naturalHeight * s));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data;
    const lum = new Float32Array(w * h);
    let sum = 0, sum2 = 0;
    let satSum = 0;
    let skinN = 0; // 皮肤色像素占比：判断画面是否人像（决定眼部带检查是否适用）
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      lum[p] = L;
      sum += L;
      sum2 += L * L;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      satSum += mx === 0 ? 0 : (mx - mn) / mx;
      if (r > 95 && g > 40 && b > 20 && mx - mn > 15 && Math.abs(r - g) > 15 && r > g && r > b) skinN++;
    }
    const n = w * h;
    const mean = sum / n;
    const contrast = Math.sqrt(Math.max(0, sum2 / n - mean * mean));
    const sat = satSum / n;

    // 清晰度（锐度）+ 中心/肤色区加权（人像主体常在中间）
    let edge = 0, edgeC = 0, edgeCN = 0;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const e = Math.abs(lum[i + 1] - lum[i - 1]) + Math.abs(lum[i + w] - lum[i - w]);
        edge += e;
        const dx = Math.abs(x / w - 0.5);
        const dy = Math.abs(y / h - 0.5);
        if (dx < 0.32 && dy < 0.36) {
          edgeC += e;
          edgeCN++;
        }
      }
    }
    const edgeMean = edge / Math.max(1, (w - 2) * (h - 2));
    const edgeCenter = edgeCN ? edgeC / edgeCN : edgeMean;
    const sharpScore = clampNum(edgeMean / 16 * 100, 0, 100);
    const sharpCenter = clampNum(edgeCenter / 16 * 100, 0, 100);
    // 主体区更糊则更可疑
    const sharpFinal = clampNum(sharpScore * 0.55 + Math.min(sharpScore, sharpCenter) * 0.45, 0, 100);

    // 曝光：目标亮度按图片自身的影调分布自适应。
    // 旧版硬编码 118，雪景被判过曝、夜景被判欠曝；现取直方图 5%/95% 分位的中点
    // 作为「理想中间调」，典型场景结果 ≈118 与旧值兼容，雪景/夜景不再冤枉。
    const hist = new Uint32Array(256);
    for (let p = 0; p < n; p++) hist[lum[p] | 0]++;
    const pctOf = (frac) => {
      let acc = 0;
      const limit = n * frac;
      for (let v = 0; v < 256; v++) {
        acc += hist[v];
        if (acc >= limit) return v;
      }
      return 255;
    };
    const expTarget = (pctOf(0.05) + pctOf(0.95)) / 2;
    const expScore = clampNum(100 - Math.abs(mean - expTarget) / Math.max(30, expTarget) * 140, 0, 100);

    // 剪裁（死黑/死白）
    let clipped = 0;
    for (let i = 0; i < d.length; i += 4) {
      const t = d[i] + d[i + 1] + d[i + 2];
      if (t < 10 || t > 755) clipped++;
    }
    const clipScore = clampNum(100 - (clipped / n) * 280, 0, 100);

    // 对比：灰平一片也很假“清楚”
    const contrastScore = clampNum(contrast / 55 * 100, 0, 100);

    // 色彩丰富度：全灰/全黑的「合格」照不应入选
    const colorScore = clampNum(40 + sat * 120, 0, 100);

    item.sharpScore = Math.round(sharpFinal);
    item.expScore = Math.round(expScore);
    item.clipScore = Math.round(clipScore);
    item.contrastScore = Math.round(contrastScore);
    item.colorScore = Math.round(colorScore);

    // 4x4 色块签名，用于连拍去重
    const sig = new Array(16).fill(0);
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const i = (y * w + x) * 4;
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const qx = x < w / 2 ? 0 : 1;
        const qy = y < h / 2 ? 0 : 1;
        const q = qy * 2 + qx; // 0..3
        sig[q * 4 + 0] += r;
        sig[q * 4 + 1] += g;
        sig[q * 4 + 2] += b;
        sig[q * 4 + 3] += 1;
      }
    }
    const avgSig = [];
    for (let q = 0; q < 4; q++) {
      const n = sig[q * 4 + 3] || 1;
      avgSig.push(sig[q * 4] / n, sig[q * 4 + 1] / n, sig[q * 4 + 2] / n);
    }
    // 眼部带细节：仅当画面像人像（皮肤色占比够高）才有意义。
    // 风光/静物此前也被算出 85 分上下的「面部基线」并计入总分，属于误伤，现跳过。
    const skinRatio = skinN / n;
    let faceScore;
    if (skinRatio > 0.12) {
      let eyeBand = 0, eyeN = 0;
      const y0 = Math.floor(h * 0.28);
      const y1 = Math.floor(h * 0.52);
      const x0 = Math.floor(w * 0.28);
      const x1 = Math.floor(w * 0.72);
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = y * w + x;
          eyeBand += Math.abs(lum[i + 1] - lum[i - 1]) + Math.abs(lum[i + w] - lum[i - w]);
          eyeN++;
        }
      }
      const eyeEdge = eyeN ? eyeBand / eyeN : 0;
      // 相对全身锐度：眼睛区应更锐
      const eyeRatio = edgeMean > 0.5 ? eyeEdge / edgeMean : 1;
      faceScore = clampNum(40 + eyeRatio * 45, 0, 100);
      item.eyeScore = Math.round(faceScore);
    } else {
      faceScore = 75; // 中性值：不为人像时眼部项不倾斜总分
      item.eyeScore = null;
    }

    item.sig = avgSig;

    const floor = Math.min(sharpFinal, expScore, clipScore, contrastScore);
    item.localScore = Math.round(
      floor * 0.42 +
      (sharpFinal * 0.24 + expScore * 0.18 + clipScore * 0.16 + contrastScore * 0.12 + colorScore * 0.1 + faceScore * 0.2) * 0.58
    );
    item._scoredLocal = true;
  } catch (e) {
    console.warn("cullLocalScoreItem failed:", item.name, e);
    item.localScore = 0;
    item._scoredLocal = true;
  }
  return item;
}

function clampNum(n, a, b) {
  return Math.min(b, Math.max(a, n));
}

/**
 * 智能初筛（保守策略）
 * - 明确废片 → 否决
 * - 连拍重复 → 否决
 * - 只把「批次里最前一小撮」标为候选，绝不靠本地分大选特选
 * - 审美（好不好看）必须 AI 精评
 */
async function cullSmartPrescan() {
  if (!cullState.items.length) return alert("请先导入照片");
  const btn = $("#cullSmartBtn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "分析中…";
  }
  const cache = new Map();
  const n = cullState.items.length;
  try {
    for (let i = 0; i < n; i++) {
      await cullLocalScoreItem(cullState.items[i], cache);
      if (i % 20 === 0) {
        $("#cullStatus").textContent = `智能初筛 ${i + 1} / ${n}`;
      }
    }

    const scores = cullState.items.map((x) => x.localScore || 0).sort((a, b) => a - b);
    const pct = (p) => scores[clampNum(Math.floor(scores.length * p), 0, scores.length - 1)] || 0;
    const p75 = pct(0.75);
    const p40 = pct(0.4);
    const p88 = pct(0.88);

    cullState.items.sort((a, b) => (b.localScore || 0) - (a.localScore || 0));

    // 连拍：时间窗 + 色块签名接近 → 只留队首
    const kept = [];
    for (const it of cullState.items) {
      let similar = false;
      for (const k of kept.slice(-40)) {
        const dt = Math.abs((it.lastModified || 0) - (k.lastModified || 0));
        if (dt > 8000) continue;
        if (it.sig && k.sig) {
          let dist = 0;
          for (let i = 0; i < it.sig.length; i++) dist += Math.abs(it.sig[i] - k.sig[i]);
          dist /= it.sig.length;
          if (dist < 18) {
            similar = true;
            break;
          }
        } else if (Math.abs((it.localScore || 0) - (k.localScore || 0)) < 7) {
          similar = true;
          break;
        }
      }
      if (similar) {
        it.status = "reject";
        it.stars = 0;
        it.autoNote = "连拍重复";
      } else if ((it.localScore || 0) < Math.max(42, p40 * 0.85)) {
        it.status = "reject";
        it.autoNote = "糊/爆/灰，技术废片";
      } else if ((it.localScore || 0) >= Math.max(86, p88) && (it.contrastScore || 0) >= 55) {
        if (it.status === "new") {
          it.status = "pick";
          it.stars = 3;
          it.autoNote = "本地候选 · 建议 AI 精评";
        }
      }
      kept.push(it);
    }

    const pickN = cullState.items.filter((x) => x.status === "pick").length;
    const rejN = cullState.items.filter((x) => x.status === "reject").length;
    cullLog(`初筛：候选 ${pickN} · 否决 ${rejN}（本地只筛废片，好不好看请 AI 精评）`, "ok");
    $("#cullStatus").textContent = `初筛完成 · 候选 ${pickN} / ${n} · 请用 AI 精评把关`;
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "智能初筛";
    }
    cullStats();
    applyCullFilter();
  }
}

/**
 * AI 精评：把缩略图发给已配置的大模型，批量给分（建议 ≤40 张）。
 * 3 路并发 + 每张失败自动重试 1 次；运行中再点按钮 = 停止（已完成的不回滚）。
 */
let cullAIRunning = false;

async function cullAIScore() {
  if (!cullState.items.length) return alert("请先导入照片");
  if (cullAIRunning) {
    cullState.aiAbort = true; // 运行中点击 → 请求停止
    return;
  }
  if (typeof llmConfigReady === "function" && !llmConfigReady()) {
    return alert("请先在「调色工作台 → 厂商设置」配置 API Key");
  }
  // 只评当前筛选结果的前 40 张（或已 pick 优先）
  const pool = [
    ...cullState.items.filter((x) => x.status === "pick"),
    ...cullState.items.filter((x) => x.status !== "pick" && x.status !== "reject"),
  ].slice(0, 40);
  if (!pool.length) return alert("没有可评的照片");

  const btn = $("#cullAIBtn");
  cullAIRunning = true;
  cullState.aiAbort = false;
  if (btn) btn.textContent = "停止";

  const scoreOne = async (it) => {
    // 返回 true=成功（含中止）/ false=最终失败
    const system = `你是极其严格的人像/商业选片师，宁缺毋滥，只给客户成片级别的照片高分。
只输出 JSON：{"score":0-100,"reject":true|false,"reason":"12字内"}

评分权重：
1. 表情神态 30%：自然、眼神亮；闭眼/半闭眼/怪表情/僵硬 → 低分且 reject
2. 构图 25%：主体完整、肢体不切、头不顶框
3. 光线 20%：面部曝光正确、不阴阳脸；眼神光加分
4. 清晰度 15%：面部锐利；虚焦/抖动 → reject
5. 穿帮杂物 10%：垃圾桶/电线/路人头/衣物穿帮 → reject

判定极严：
- 90+ = 可直接交片
- 80–89 = 备选（有瑕疵）
- <80 或任一硬伤 → reject true
拿不准就低分或 reject。`;
    for (let attempt = 1; attempt <= 2; attempt++) {
      if (cullState.aiAbort) return true;
      try {
        const url = it.thumbUrl || URL.createObjectURL(it.file);
        let img;
        try {
          img = await loadImage(url);
        } finally {
          if (!it.thumbUrl) URL.revokeObjectURL(url);
        }
        const c = document.createElement("canvas");
        const s = Math.min(1, 512 / Math.max(img.naturalWidth, img.naturalHeight));
        c.width = Math.round(img.naturalWidth * s);
        c.height = Math.round(img.naturalHeight * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);

        const res = await callLLMVision({
          system,
          userText: "评价这张是否值得进客户成片。先看脸，再看构图与穿帮。标准要严。",
          canvas: c,
          maxTokens: 180,
        });
        const m = res.content.match(/\{[\s\S]*\}/);
        if (m) {
          const j = JSON.parse(m[0]);
          it.aiScore = clampNum(Number(j.score) || it.localScore || 45, 0, 100);
          it.aiReason = j.reason || "";
          if (j.reject || it.aiScore < 85) {
            it.status = "reject";
            it.autoNote = j.reason || "AI 未达标";
            it.stars = 0;
          } else if (it.aiScore >= 88 && it.status !== "reject") {
            it.status = "pick";
            it.stars = it.aiScore >= 95 ? 5 : 4;
            it.autoNote = j.reason || "AI 推荐";
          } else {
            it.autoNote = j.reason || "AI 备选";
          }
          it.localScore = Math.round(it.aiScore);
        }
        return true;
      } catch (e) {
        if (cullState.aiAbort) return true;
        if (attempt === 2) {
          cullLog(`${it.name}: ${e.message || e}`, "err");
          return false;
        } else {
          await new Promise((r) => setTimeout(r, 900)); // 退避后重试一次
        }
      }
    }
    return false;
  };

  let done = 0;
  let failed = 0;
  const failedNames = [];
  const prog = $("#cullAIProg");
  const setProg = () => {
    if (!prog) return;
    prog.classList.remove("hidden");
    prog.firstElementChild.style.width = Math.round((done / pool.length) * 100) + "%";
  };
  setProg();
  try {
    const queue = [...pool];
    const worker = async () => {
      while (queue.length && !cullState.aiAbort) {
        const it = queue.shift();
        const ok = await scoreOne(it);
        done++;
        if (!ok) {
          failed++;
          if (failedNames.length < 6) failedNames.push(it.name);
        }
        setProg();
        $("#cullStatus").textContent = cullState.aiAbort
          ? `AI 评分已停止（${done} / ${pool.length}）`
          : `AI 评分 ${done} / ${pool.length}`;
      }
    };
    await Promise.all([worker(), worker(), worker()]);

    cullState.items.sort((a, b) => (b.aiScore || b.localScore || 0) - (a.aiScore || a.localScore || 0));
    const failSummary = failed
      ? `未成功 ${failed} 张：${failedNames.join("、")}${failed > failedNames.length ? " 等" : ""}（可再点一次 AI 精评重试）`
      : "";
    if (cullState.aiAbort) {
      cullLog(`AI 评分已停止：完成 ${done} / ${pool.length} 张${failed ? ` · ${failSummary}` : ""}`, "err");
      $("#cullStatus").textContent = `AI 评分已停止（${done} / ${pool.length}）`;
    } else {
      cullLog(
        `AI 评分完成 ${done} / ${pool.length} 张${failed ? ` · ${failSummary}` : ""}`,
        failed ? "err" : "ok"
      );
      $("#cullStatus").textContent = `AI 评分完成（${done} / ${pool.length}）${failed ? ` · 未成功 ${failed}` : ""}`;
    }
  } finally {
    cullAIRunning = false;
    cullState.aiAbort = false;
    if (btn) btn.textContent = "AI 精评";
    if (prog) setTimeout(() => prog.classList.add("hidden"), 1200);
    cullStats();
    applyCullFilter();
  }
}

function setupCull() {
  const drop = $("#cullDrop");
  const folderInput = $("#cullFolderInput");
  const fileInput = $("#cullFileInput");
  if (!drop) return;

  $("#cullPickFolder")?.addEventListener("click", async () => {
    if (supportsFileSystemAccess()) {
      try {
        const dir = await showDirectoryPicker({ mode: "read", id: "lightjournal-cull" });
        cullState.srcHandle = dir;
        const handleMap = new Map();
        const files = [];
        async function walk(h, prefix = "") {
          for await (const [name, ent] of h.entries()) {
            if (files.length >= 3000) return;
            if (ent.kind === "directory") {
              await walk(ent, prefix + name + "/");
            } else if (/\.(jpe?g|png|webp|gif|arw|cr2|cr3|nef|dng|tiff?|heic|avif)$/i.test(name)) {
              try {
                const file = await ent.getFile();
                handleMap.set(file, ent);
                files.push(file);
              } catch {
                /* skip */
              }
            }
          }
        }
        await walk(dir);
        await cullAddFiles(files, handleMap);
      } catch (e) {
        if (e && e.name !== "AbortError") cullLog(String(e.message || e), "err");
      }
    } else {
      folderInput?.click();
    }
  });

  $("#cullPickFiles")?.addEventListener("click", () => fileInput.click());
  folderInput?.addEventListener("change", () => cullAddFiles(folderInput.files || []));
  fileInput?.addEventListener("change", () => cullAddFiles(fileInput.files || []));

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
    const fs = e.dataTransfer.files;
    if (fs && fs.length) cullAddFiles(fs);
  });

  // grid click
  $("#cullGrid")?.addEventListener("click", (e) => {
    const cell = e.target.closest("[data-idx]");
    if (!cell) return;
    cullState.index = Number(cell.dataset.idx);
    renderCullFocus();
  });
  $("#cullGrid")?.addEventListener("dblclick", (e) => {
    const cell = e.target.closest("[data-idx]");
    if (!cell) return;
    cullState.index = Number(cell.dataset.idx);
    cullState.zoom = "100";
    renderCullFocus();
  });

  // filters
  $("#cullFilter")?.addEventListener("change", (e) => {
    cullState.filter = e.target.value;
    applyCullFilter();
  });
  $("#cullMinStars")?.addEventListener("change", (e) => {
    cullState.minStars = Number(e.target.value) || 3;
    if (cullState.filter === "star") applyCullFilter();
  });

  // actions
  $("#cullBtnPick")?.addEventListener("click", () => cullAct("pick"));
  $("#cullBtnReject")?.addEventListener("click", () => cullAct("reject"));
  $("#cullBtnPrev")?.addEventListener("click", () => cullAct("prev"));
  $("#cullBtnNext")?.addEventListener("click", () => cullAct("next"));
  $("#cullBtnUndo")?.addEventListener("click", () => cullAct("undo"));
  $$(".cull-undo-btn").forEach((b) => b.addEventListener("click", () => cullAct("undo")));
  $("#cullBtnZoom")?.addEventListener("click", () => cullAct("zoom"));
  $("#cullSmartBtn")?.addEventListener("click", () => cullSmartPrescan());
  $("#cullAIBtn")?.addEventListener("click", () => cullAIScore());

  $("#cullSort")?.addEventListener("change", (e) => {
    cullState.sort = e.target.value;
    applyCullFilter();
  });
  $("#cullNameQuery")?.addEventListener("input", (e) => {
    cullState.nameQuery = e.target.value;
    applyCullFilter();
  });
  $("#cullAutoAdvance")?.addEventListener("change", (e) => {
    cullState.autoAdvance = e.target.checked;
    saveCullPrefs({ autoAdvance: cullState.autoAdvance });
  });
  // 载入偏好
  const prefs = loadCullPrefs();
  if (prefs.autoAdvance != null) {
    cullState.autoAdvance = !!prefs.autoAdvance;
    const box = $("#cullAutoAdvance");
    if (box) box.checked = cullState.autoAdvance;
  }

  $("#cullBtnReset")?.addEventListener("click", () => {
    cullState.items = [];
    cullState.filtered = [];
    cullState.index = 0;
    cullState.srcHandle = null;
    cullStats();
    applyCullFilter();
    $("#cullStatus").textContent = "已清空";
  });

  // keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    const sec = document.getElementById("cull");
    if (!sec) return;
    const rect = sec.getBoundingClientRect();
    const visible = rect.top < window.innerHeight && rect.bottom > 0;
    if (!visible) return;
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "l") {
      e.preventDefault();
      cullAct("next");
    } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "j") {
      e.preventDefault();
      cullAct("prev");
    } else if (e.key === "p" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      cullAct("pick");
    } else if (e.key === "x" || e.key === "Delete" || e.key === "Backspace" || e.key === "n") {
      e.preventDefault();
      cullAct("reject");
    } else if (e.key === "u" || (e.ctrlKey && e.key.toLowerCase() === "z")) {
      e.preventDefault();
      cullAct("undo");
    } else if (e.key === "z") {
      e.preventDefault();
      cullAct("zoom");
    } else if (e.key >= "1" && e.key <= "5") {
      e.preventDefault();
      cullAct("star" + e.key);
    } else if (e.key === "0") {
      e.preventDefault();
      cullAct("star0");
    }
  });

  // export picked
  $("#cullExportBtn")?.addEventListener("click", async () => {
    const picks = cullState.items.filter((x) => x.status === "pick" || x.stars >= 3);
    if (!picks.length) return alert("还没有「入选」的照片（按 P 标记）");
    if (!supportsFileSystemAccess()) {
      // 回退：逐个下载
      for (const it of picks) {
        if (it.file) downloadBlob(it.file, "选片_" + it.name);
        await new Promise((r) => setTimeout(r, 120));
      }
      $("#cullStatus").textContent = `已下载 ${picks.length} 张`;
      return;
    }
    try {
      const dir = await showDirectoryPicker({ mode: "readwrite", id: "lightjournal-cull-out" });
      let n = 0;
      for (const it of picks) {
        try {
          const fh = await dir.getFileHandle(it.name, { create: true });
          const w = await fh.createWritable();
          await w.write(it.file);
          await w.close();
          n++;
          $("#cullStatus").textContent = `导出 ${n} / ${picks.length}`;
        } catch (e) {
          cullLog(`导出失败 ${it.name}: ${e.message || e}`, "err");
        }
      }
      $("#cullStatus").textContent = `已导出 ${n} 张到「${dir.name}」`;
      cullLog(`导出完成 ${n} 张`, "ok");
    } catch (e) {
      if (e && e.name !== "AbortError") cullLog(String(e.message || e), "err");
    }
  });
}
