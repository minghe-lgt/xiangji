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
  filter: "all", // all | new | pick | reject | star
  minStars: 0,
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

function applyCullFilter() {
  const f = cullState.filter;
  let list = cullState.items;
  if (f === "new") list = list.filter((x) => x.status === "new");
  else if (f === "pick") list = list.filter((x) => x.status === "pick");
  else if (f === "reject") list = list.filter((x) => x.status === "reject");
  else if (f === "star") list = list.filter((x) => x.stars >= (cullState.minStars || 3));
  cullState.filtered = list;
  if (cullState.index >= list.length) cullState.index = 0;
  renderCullGrid();
  renderCullFocus();
  $("#cullFiltered").textContent = `${list.length} / ${cullState.items.length}`;
}

function starsHtml(n) {
  let s = "";
  for (let i = 1; i <= 5; i++) s += `<span class="${i <= n ? "on" : ""}">★</span>`;
  return s;
}

function renderCullGrid() {
  const box = $("#cullGrid");
  if (!box) return;
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
      <figure class="cull-cell ${mark} ${idx === cullState.index ? "is-active" : ""}" data-idx="${idx}" title="${it.name}">
        <div class="cull-thumb-wrap">
          <img data-src="${it.thumbUrl || ""}" alt="" loading="lazy" />
          <span class="cull-flag">${it.status === "pick" ? "入选" : it.status === "reject" ? "否" : ""}</span>
        </div>
        <figcaption>
          <span class="cull-stars">${starsHtml(it.stars)}${it.localScore != null ? `<em class="cull-score">${it.localScore}</em>` : ""}</span>
          <span class="cull-name">${it.name.slice(0, 14)}${it.autoNote ? " · " + it.autoNote : ""}</span>
        </figcaption>
      </figure>`;
    })
    .join("");
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
    stage.innerHTML = `<p class="cull-empty">选择左侧缩略图，或按方向键浏览</p>`;
    $("#cullMeta").textContent = "—";
    return;
  }
  stage.innerHTML = `
    <img src="${it.thumbUrl || it.objectUrl || ""}" alt="${it.name}" id="cullBigImg" />
    <div class="cull-big-flag ${it.status}">${it.status === "pick" ? "已入选" : it.status === "reject" ? "已否决" : "未评"}</div>
  `;
  $("#cullMeta").textContent = `${it.name} · ${it.w || "?"}×${it.h || "?"} · ${(it.size / 1024 / 1024).toFixed(1)}MB · ★${it.stars}`;
  // sync active cell
  $$("#cullGrid .cull-cell").forEach((el) => {
    el.classList.toggle("is-active", Number(el.dataset.idx) === cullState.index);
  });
}

function cullAct(action) {
  const it = cullState.filtered[cullState.index];
  if (!it) return;
  if (action === "pick") {
    it.status = it.status === "pick" ? "new" : "pick";
    if (it.status === "pick" && it.stars < 1) it.stars = 3;
  } else if (action === "reject") {
    it.status = it.status === "reject" ? "new" : "reject";
    if (it.status === "reject") it.stars = 0;
  } else if (action.startsWith("star")) {
    const n = Number(action.slice(4));
    it.stars = it.stars === n ? 0 : n;
    if (it.stars >= 3) it.status = "pick";
    else if (it.status === "pick" && it.stars === 0) it.status = "new";
  } else if (action === "next") {
    if (cullState.index < cullState.filtered.length - 1) cullState.index++;
  } else if (action === "prev") {
    if (cullState.index > 0) cullState.index--;
  }
  // update single cell + focus
  renderCullGrid();
  renderCullFocus();
  cullStats();
  applyCullFilter();
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
      cullLog(`跳过 ${f.name}: ${e.message || e}`, "err");
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

/** 本地质检：清晰度、曝光、连拍相似度 —— 不联网 */
async function cullLocalScoreItem(item, cache) {
  if (item._scoredLocal && item.localScore != null) return item;
  let img = cache && cache.get(item.id);
  try {
    if (!img) {
      const url = item.thumbUrl || URL.createObjectURL(item.file);
      img = await loadImage(url);
      if (cache) cache.set(item.id, img);
    }
    const max = 160;
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
    let sum = 0;
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      const L = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      lum[p] = L;
      sum += L;
    }
    const mean = sum / (w * h);
    // 边缘能量（清晰度）
    let edge = 0;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        edge += Math.abs(lum[i + 1] - lum[i - 1]) + Math.abs(lum[i + w] - lum[i - w]);
      }
    }
    const edgeMean = edge / Math.max(1, (w - 2) * (h - 2));
    // 更严：提高清晰度门槛，拉低“还行”的分数
    const sharpScore = clampNum(edgeMean / 18 * 100, 0, 100);
    // 曝光：对偏亮/偏暗更苛刻
    const expScore = clampNum(100 - Math.abs(mean - 118) / 118 * 130, 0, 100);
    // 高光/暗部死黑惩罚
    let clipped = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] + d[i + 1] + d[i + 2] < 12 || d[i] + d[i + 1] + d[i + 2] > 750) clipped++;
    }
    const clipRatio = clipped / Math.max(1, w * h);
    const clipScore = clampNum(100 - clipRatio * 220, 0, 100);

    item.sharpScore = Math.round(sharpScore);
    item.expScore = Math.round(expScore);
    item.clipScore = Math.round(clipScore);
    // 综合分更严：任一短板拉总分
    item.localScore = Math.round(
      Math.min(sharpScore, expScore) * 0.45 + (sharpScore * 0.3 + expScore * 0.3 + clipScore * 0.4) * 0.55
    );
    item._scoredLocal = true;
  } catch {
    item.localScore = item.localScore ?? 35;
    item._scoredLocal = true;
  }
  return item;
}

function clampNum(n, a, b) {
  return Math.min(b, Math.max(a, n));
}

/**
 * 一键智能初筛：本地质检 + 连拍相似去重 + 自动标否/标星
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
    // 按分数排序；连续相似（分数与尺寸接近）只保留最高
    cullState.items.sort((a, b) => (b.localScore || 0) - (a.localScore || 0));
    const kept = [];
    for (const it of cullState.items) {
      let similar = false;
      for (const k of kept.slice(-40)) {
        if (
          k.name &&
          it.name &&
          Math.abs((it.lastModified || 0) - (k.lastModified || 0)) < 4000 &&
          Math.abs((it.localScore || 0) - (k.localScore || 0)) < 5
        ) {
          similar = true;
          break;
        }
      }
      // 更严：连拍相似一律否决（只留排序后最优）；入选线 90；否决线 62
      if (similar) {
        it.status = "reject";
        it.stars = 0;
        it.autoNote = "连拍相似，仅留最优";
      } else if ((it.localScore || 0) >= 90) {
        if (it.status === "new") {
          it.status = "pick";
          it.stars = it.localScore >= 96 ? 5 : 4;
        }
      } else if ((it.localScore || 0) < 62) {
        it.status = "reject";
        it.autoNote = "清晰度/曝光/死黑偏多";
      }
      kept.push(it);
    }
    cullLog(`智能初筛完成：入选 ${cullState.items.filter((x) => x.status === "pick").length} · 否决 ${cullState.items.filter((x) => x.status === "reject").length}`, "ok");
    $("#cullStatus").textContent = "智能初筛完成，可按分数浏览";
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
 * AI 精评：把缩略图发给已配置的大模型，批量给分（建议 ≤40 张）
 */
async function cullAIScore() {
  if (!cullState.items.length) return alert("请先导入照片");
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
  if (btn) {
    btn.disabled = true;
    btn.textContent = "AI 评分中…";
  }
  try {
    for (let i = 0; i < pool.length; i++) {
      const it = pool[i];
      $("#cullStatus").textContent = `AI 评分 ${i + 1} / ${pool.length}`;
      try {
        const img = await loadImage(it.thumbUrl || URL.createObjectURL(it.file));
        const c = document.createElement("canvas");
        const s = Math.min(1, 512 / Math.max(img.naturalWidth, img.naturalHeight));
        c.width = Math.round(img.naturalWidth * s);
        c.height = Math.round(img.naturalHeight * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);

        const system = `你是极其严格的人像/商业选片师，宁缺毋滥，只给客户成片级别的照片高分。只输出 JSON：{"score":0-100,"reject":true|false,"reason":"15字内"}。
评分维度：表情神态、构图、光线、清晰度、穿帮杂物。以下任一问题必须 reject true：闭眼/半闭眼、虚焦、表情僵硬或怪、肢体穿帮、明显杂物/垃圾桶/电线、严重过曝或欠曝、构图切割关节。
分数参考：90+ 仅限可直接交片；80-89 可用但有瑕疵；70 以下默认不合格；拿不准就给低分或 reject。`;
        const res = await callLLMVision({
          system,
          userText: "评价这张照片是否值得入选客户成片。标准要严。",
          canvas: c,
          maxTokens: 160,
        });
        const m = res.content.match(/\{[\s\S]*\}/);
        if (m) {
          const j = JSON.parse(m[0]);
          it.aiScore = clampNum(Number(j.score) || it.localScore || 45, 0, 100);
          // 更严：AI 不推荐或分数 < 85 一律否决；仅 ≥ 88 才标入
          if (j.reject || it.aiScore < 85) {
            it.status = "reject";
            it.autoNote = j.reason || (it.aiScore < 85 ? "AI 分数未达标" : "AI 不推荐");
            it.stars = 0;
          } else if (it.aiScore >= 88 && it.status !== "reject") {
            it.status = "pick";
            it.stars = it.aiScore >= 95 ? 5 : 4;
          }
          it.localScore = Math.round(it.aiScore);
        }
      } catch (e) {
        cullLog(`${it.name}: ${e.message || e}`, "err");
      }
    }
    cullState.items.sort((a, b) => (b.aiScore || b.localScore || 0) - (a.aiScore || a.localScore || 0));
    cullLog(`AI 评分完成 ${pool.length} 张`, "ok");
    $("#cullStatus").textContent = `AI 评分完成（${pool.length} 张）`;
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "AI 精评";
    }
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
  $("#cullSmartBtn")?.addEventListener("click", () => cullSmartPrescan());
  $("#cullAIBtn")?.addEventListener("click", () => cullAIScore());
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
    if (e.key === "ArrowRight" || e.key === "d") {
      e.preventDefault();
      cullAct("next");
    } else if (e.key === "ArrowLeft" || e.key === "a") {
      e.preventDefault();
      cullAct("prev");
    } else if (e.key === "p" || e.key === "Enter") {
      e.preventDefault();
      cullAct("pick");
    } else if (e.key === "x" || e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      cullAct("reject");
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
