/**
 * 自测模式：index.html?selftest=1 时在真实页面上运行回归断言。
 * 用途：推送前的固定动作（见 progress.md）。全部通过才建议上线。
 * 也可在控制台手动 window.runSelfTest()。
 */
(function () {
  if (!/[?&]selftest=1/.test(location.search)) return;

  const results = [];

  function test(name, fn) {
    results.push({ name, fn });
  }

  /* ---------- 用例 ---------- */

  test("语法：11 个脚本可编译", async () => {
    if (location.protocol === "file:") return { ok: true, info: "file:// 跳过（无 fetch），请经 http 服务访问" };
    const files = ["data.js", "raw.js", "colorgrade.js", "filmrecipes.js", "organize.js", "cull.js", "tools.js", "quiz.js", "analyze.js", "report.js", "app.js"];
    for (const f of files) {
      const r = await fetch(f + "?nocache=" + Date.now(), { cache: "no-store" });
      const src = await r.text();
      if (src.startsWith("<")) throw new Error(f + " 返回了 HTML");
      new Function(src);
    }
    return { ok: true, info: files.length + " 个文件" };
  });

  test("锚点：侧栏链接目标存在", () => {
    const missing = [];
    for (const a of document.querySelectorAll('a[href^="#"]')) {
      const id = a.getAttribute("href").slice(1);
      if (id && !document.getElementById(id)) missing.push(id);
    }
    if (missing.length) throw new Error("缺失: " + missing.join(","));
    return { ok: true };
  });

  test("计划：24 周 + 展开 + 互斥 + 例图 52", () => {
    const weeks = STAGES.flatMap((s) => s.weeks);
    if (weeks.length !== 24) throw new Error("周数 " + weeks.length);
    const cards = document.querySelectorAll(".plan-card").length;
    if (cards !== 24) throw new Error("卡片 " + cards);
    toggleWeekCard(1, true);
    const c1 = document.querySelector('.plan-card[data-week="1"]');
    if (!c1.classList.contains("open")) throw new Error("W1 未展开");
    toggleWeekCard(5, true);
    if (c1.classList.contains("open")) throw new Error("互斥失效");
    const imgs = document.querySelectorAll(".plan-card .week-example img").length;
    if (imgs !== 52) throw new Error("例图 " + imgs);
    const blocks = document.querySelectorAll(".plan-card .examples-block").length;
    if (blocks !== 24) throw new Error("例图块 " + blocks);
    toggleWeekCard(5, false);
    return { ok: true, info: "52 图 / 24 块" };
  });

  test("例图可加载（抽查已展开周）", async () => {
    toggleWeekCard(1, true);
    document.querySelector('.plan-card[data-week="1"]').scrollIntoView({ block: "center", behavior: "instant" });
    await new Promise((r) => setTimeout(r, 1200));
    const imgs = [...document.querySelectorAll('.plan-card[data-week="1"] .week-example img')];
    if (!imgs.length) throw new Error("无图");
    const broken = imgs.filter((i) => !i.naturalWidth);
    if (broken.length) throw new Error(broken.length + " 张未加载");
    toggleWeekCard(1, false);
    return { ok: true, info: imgs.length + " 张" };
  });

  test("诊断：18 题 · 六维各 3 · 换批", () => {
    const s1 = pickDiagnosticSet();
    const s2 = pickDiagnosticSet();
    if (s1.length !== 18) throw new Error("题数 " + s1.length);
    const dims = {};
    s1.forEach((q) => (dims[q.dim] = (dims[q.dim] || 0) + 1));
    if (Object.values(dims).some((n) => n !== 3)) throw new Error("维度不均: " + JSON.stringify(dims));
    if (JSON.stringify(s1.map((q) => q.id)) === JSON.stringify(s2.map((q) => q.id))) throw new Error("未换批");
    const a = buildAssessment({ quizAnswers: Object.fromEntries(s1.map((q) => [q.id, 0])) });
    if (!a || a.quizTotal == null) throw new Error("buildAssessment 异常");
    return { ok: true };
  });

  test("学习报告：可生成可序列化", () => {
    const rep = computeLearningReport();
    JSON.stringify(rep);
    // ability 在没有诊断基线时是合法的 null，只断言键存在
    if (!rep.generatedAt || !("ability" in rep) || !rep.stageProgress) throw new Error("结构缺失");
    return { ok: true };
  });

  test("计算器：EV / ND / DOF / 黄金时刻", () => {
    const ev = solveExposure({ aperture: 2.8, shutter: "1/125", iso: 400, lock: null });
    if (Math.abs(Number(ev.ev) - 11.94) > 0.01) throw new Error("EV " + ev.ev);
    const nd = ndConvert("1/125", 10);
    if (Math.abs(nd.seconds - 8.192) > 0.01) throw new Error("ND " + nd.seconds);
    const dof = dofCalc({ focal: 50, aperture: 2.8, distance: 5, sensor: "ff" });
    if (!(dof.total > 0)) throw new Error("DOF");
    const t = sunTimes(new Date(), 31.2, 121.5);
    if (!t.sunrise || !t.sunset) throw new Error("sunTimes");
    return { ok: true, info: "EV " + ev.ev + " · ND " + nd.label };
  });

  test("调色：AUTO + fade 系预设 + 蒙版 + 撤销 + 导出", async () => {
    const c = document.createElement("canvas");
    c.width = 320; c.height = 213;
    const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 0, 213);
    g.addColorStop(0, "#7aa8d8"); g.addColorStop(1, "#d8c8a8");
    x.fillStyle = g; x.fillRect(0, 0, 320, 213);
    x.fillStyle = "#c89878"; x.fillRect(40, 60, 80, 100);
    x.fillStyle = "#222"; x.fillRect(140, 130, 40, 40);
    const keep = {
      sourceCanvas: gradeState.sourceCanvas,
      params: { ...gradeState.params },
      masks: JSON.parse(JSON.stringify(gradeState.masks)),
      activePreset: gradeState.activePreset,
      undo: gradeState.undo.length,
    };
    gradeState.sourceCanvas = c;
    gradeState.masks = [];
    document.getElementById("gradeEmpty").classList.add("hidden");
    document.getElementById("gradePreview").classList.remove("hidden");
    try {
      document.querySelector('#presetGrid .preset-btn[data-preset="auto"]').click();
      repaintGradeNow();
      if (gradeState.params.exposure === 0) throw new Error("AUTO 未生效");
      const avg = (id) => {
        const p = GRADE_PRESETS.find((q) => q.id === id);
        gradeState.params = { ...DEFAULT_GRADE, ...p.params };
        repaintGradeNow();
        const cv = document.getElementById("gradeCanvas");
        const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
        let s = 0;
        for (let i = 0; i < d.length; i += 4) s += (d[i] + d[i + 1] + d[i + 2]) / 3;
        return s / (d.length / 4);
      };
      for (const id of ["polaroid", "matte", "trix"]) {
        const v = avg(id);
        if (v < 60) throw new Error(id + " 均值 " + Math.round(v) + "（疑似黑图回归）");
      }
      // 渐变蒙版提亮
      document.querySelector('#gradeTabs [data-gtab="mask"]').click();
      document.getElementById("maskAddGrad").click();
      gradeState.masks[0].params.brightness = 40;
      repaintGradeNow();
      const up = document.getElementById("gradeCanvas").getContext("2d").getImageData(160, 3, 1, 1).data[0];
      gradeState.masks[0].params.brightness = 0;
      repaintGradeNow();
      const down = document.getElementById("gradeCanvas").getContext("2d").getImageData(160, 3, 1, 1).data[0];
      if (!(up > down)) throw new Error("蒙版无效果");
      // 导出
      const full = await renderFullGradeAsync(() => {});
      const blob = await exportCanvasJPEG(full, 0.95);
      if (!(blob && blob.size > 1000)) throw new Error("导出失败");
      return { ok: true, info: "fade 系均值正常 · 导出 " + Math.round(blob.size / 1024) + "KB" };
    } finally {
      gradeState.sourceCanvas = keep.sourceCanvas;
      gradeState.params = keep.params;
      gradeState.masks = keep.masks;
      gradeState.activePreset = keep.activePreset;
      gradeState.undo.length = Math.min(gradeState.undo.length, keep.undo);
      renderSliders();
      if (typeof renderMaskUI === "function") renderMaskUI();
      repaintGradeNow();
    }
  });

  test("选片：键盘链 + 连拍分桶 + 整批撤销", async () => {
    const keep = { items: cullState.items, filtered: cullState.filtered, index: cullState.index, filter: cullState.filter, undo: cullState.undoStack, sort: cullState.sort };
    try {
      const mk = (r, g2, b) => {
        const c = document.createElement("canvas");
        c.width = 160; c.height = 107;
        const x = c.getContext("2d");
        x.fillStyle = "rgb(" + r + "," + g2 + "," + b + ")"; x.fillRect(0, 0, 160, 107);
        x.fillStyle = "rgb(" + Math.min(255, r + 50) + "," + g2 + "," + b + ")"; x.fillRect(60, 30, 40, 40);
        return c;
      };
      const toFile = (cv, name, t) => new Promise((res) => cv.toBlob((b) => res(new File([b], name, { type: "image/jpeg", lastModified: t })), "image/jpeg", 0.9));
      const files = [];
      const base = Date.now() - 100000;
      for (let f = 0; f < 4; f++) files.push(await toFile(mk(200, 120, 60), "b0-" + f + ".jpg", base + f * 1000));
      for (let f = 0; f < 4; f++) files.push(await toFile(mk(190, 150, 80), "b1-" + f + ".jpg", base + 60000 + f * 1000));
      files.push(await toFile(mk(60, 60, 220), "solo.jpg", base + 300000));
      await cullAddFiles(files, null);
      if (cullState.items.length !== 9) throw new Error("载入 " + cullState.items.length);
      await cullSmartPrescan();
      const dupes = cullState.items.filter((x) => x.autoNote === "连拍重复").length;
      if (dupes !== 6) throw new Error("连拍重复 " + dupes + "（期望 6）");
      const rejected = cullState.items.filter((x) => x.status === "reject").length;
      cullAct("undo");
      const restored = cullState.items.every((x) => x.status === "new" && !x.autoNote);
      if (!restored) throw new Error("整批撤销失败");
      // 单步键盘链
      cullState.filtered = [...cullState.items];
      cullState.index = 0;
      cullAct("pick");
      cullAct("undo");
      if (cullState.items[0].status !== "new") throw new Error("单步撤销失败");
      return { ok: true, info: "9 张 · 重复 " + dupes + " · 否决 " + rejected + " → 撤销还原" };
    } finally {
      cullState.items = keep.items;
      cullState.filtered = keep.filtered;
      cullState.index = keep.index;
      cullState.filter = keep.filter;
      cullState.undoStack = keep.undo;
      cullState.sort = keep.sort;
      cullStats();
      applyCullFilter();
    }
  });

  test("管家：改名方案 + GPS 半球提示", () => {
    const p = buildOrganizedName(
      { name: "DSC01234.ARW", lastModified: 0 },
      { dateTime: new Date("2026-10-05T10:30:00") },
      "照片", "测试", 7
    );
    if (!/^2026-10\/照片\/20261005_1030_照片_测试_007\.arw$/.test(p.path)) throw new Error(p.path);
    if (!formatGpsLine({ lat: 1, lon: 2, refKnown: false }).includes("半球")) throw new Error("缺半球提示");
    if (!formatGpsLine({ lat: -3, lon: 151, refKnown: true }).includes("S")) throw new Error("南纬未标注");
    return { ok: true };
  });

  test("水印：画布有绘制", () => {
    const c = document.createElement("canvas");
    c.width = 400; c.height = 300;
    c.getContext("2d").fillRect(0, 0, 400, 300);
    drawWatermark(c, { style: "corner", name: "自测", showParams: false, fontSize: 0.03, opacity: 0.8 });
    const d = c.getContext("2d").getImageData(0, 280, 400, 20).data;
    let s = 0;
    for (let i = 0; i < d.length; i += 4) s += d[i];
    if (s === 0) throw new Error("无绘制");
    return { ok: true };
  });

  /* ---------- 运行器 ---------- */

  function panel() {
    let el = document.getElementById("selftestPanel");
    if (el) return el;
    el = document.createElement("div");
    el.id = "selftestPanel";
    el.style.cssText =
      "position:fixed;right:14px;bottom:14px;z-index:99999;width:460px;max-height:72vh;overflow:auto;" +
      "background:#1a1512;border:1px solid #d4a054;border-radius:12px;padding:14px 16px;" +
      "font:12px/1.7 ui-monospace,Consolas,monospace;color:#f0e6d6;box-shadow:0 18px 50px rgba(0,0,0,.5)";
    document.body.appendChild(el);
    return el;
  }

  async function run() {
    const el = panel();
    el.innerHTML = "<strong style='color:#d4a054'>自测运行中…</strong>";
    let pass = 0;
    const lines = [];
    for (const t of results) {
      let entry;
      try {
        const r = await t.fn();
        entry = { name: t.name, ok: true, info: r && r.info };
        pass++;
      } catch (e) {
        entry = { name: t.name, ok: false, info: e && e.message || String(e) };
      }
      lines.push(entry);
      el.innerHTML =
        "<div style='display:flex;justify-content:space-between'><strong style='color:#d4a054'>自测 " +
        (pass) + "/" + results.length +
        "</strong><span style='cursor:pointer' onclick='this.closest(\"#selftestPanel\").remove()'>[关闭]</span></div>" +
        lines.map((l) => "<div style='color:" + (l.ok ? "#9dbb8f" : "#e08a6a") + "'>" + (l.ok ? "✓" : "✗") + " " + l.name + (l.info ? " — " + l.info : "") + "</div>").join("");
    }
    const fails = results.length - pass;
    el.innerHTML =
      "<div style='display:flex;justify-content:space-between'><strong style='color:" + (fails ? "#e08a6a" : "#9dbb8f") + "'>自测完成 " + pass + "/" + results.length + (fails ? " · 有失败" : " · 全部通过") +
      "</strong><span style='cursor:pointer' onclick='this.closest(\"#selftestPanel\").remove()'>[关闭]</span></div>" +
      lines.map((l) => "<div style='color:" + (l.ok ? "#9dbb8f" : "#e08a6a") + "'>" + (l.ok ? "✓" : "✗") + " " + l.name + (l.info ? " — " + l.info : "") + "</div>").join("");
    console.log("[selftest] " + pass + "/" + results.length);
  }

  window.runSelfTest = run;
  setTimeout(run, 300); // 等首屏渲染稳定
})();
