/**
 * 学习报告 — 汇总训练进度、能力基线、练习记录，可导出 HTML
 */

function computeLearningReport() {
  const planState = loadJSON(STORE_KEYS.plan, {});
  const journal = loadJSON(STORE_KEYS.journal, []);
  const baseline = loadBaseline ? loadBaseline() : null;

  const allWeeks = STAGES.flatMap((s) => s.weeks.map((w) => ({ ...w, stage: s.name, stageId: s.id })));
  const doneWeeks = allWeeks.filter((w) => planState[w.week]);
  const total = allWeeks.length;
  const done = doneWeeks.length;

  // 阶段进度
  const stageProgress = STAGES.map((s) => {
    const d = s.weeks.filter((w) => planState[w.week]).length;
    return { name: s.name, done: d, total: s.weeks.length, pct: Math.round((d / s.weeks.length) * 100) };
  });

  // 作品统计
  const scores = journal.map((j) => j.score).filter((x) => typeof x === "number");
  const photoStats = {
    count: journal.length,
    avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    best: scores.length ? Math.max(...scores) : null,
    worst: scores.length ? Math.min(...scores) : null,
  };

  // 能力维度（基线）
  const ability = baseline && baseline.photoAgg ? baseline.photoAgg : null;

  // 已完成主题列表
  const doneTitles = doneWeeks.map((w) => `W${String(w.week).padStart(2, "0")} ${w.stage} · ${w.title}`);

  // 下一步建议
  const next = allWeeks.find((w) => !planState[w.week]);

  // 训练完成度
  const completion = Math.round((done / total) * 100);

  // 学习路径评级
  let stage = "起步";
  if (completion >= 80) stage = "接近出师";
  else if (completion >= 50) stage = "稳步进阶";
  else if (completion >= 20) stage = "正在建立基础";

  return {
    generatedAt: new Date().toLocaleString("zh-CN"),
    completion,
    done,
    total,
    stage,
    stageProgress,
    photoStats,
    ability,
    doneTitles,
    nextWeek: next
      ? { week: next.week, title: next.title, stage: next.stage }
      : null,
    baseline,
    journalSample: journal.slice(0, 8),
  };
}

function renderLearningReport(container, data) {
  const photoAvg = data.photoStats.avg ?? "—";
  const abilityHtml = data.ability
    ? Object.entries(data.ability)
        .map(([k, v]) => {
          const name = {
            composition: "构图",
            exposure: "曝光",
            color: "色彩",
            light: "用光",
            sharpness: "清晰度",
            balance: "平衡",
          }[k] || k;
          return `
            <div class="lr-bar">
              <span>${name}</span>
              <div class="bar"><i style="width:${v}%"></i></div>
              <strong>${v}</strong>
            </div>`;
        })
        .join("")
    : `<p class="lr-list">尚未建立作品基线。到「能力诊断 → 作品定性」上传 10–20 张即可。</p>`;

  container.innerHTML = `
    <div class="learning-report" id="learningReportPaper">
      <h3>光影手帐 · 学习报告</h3>
      <div class="lr-meta">生成时间 ${data.generatedAt} · 阶段「${data.stage}」</div>

      <div class="lr-grid">
        <div class="lr-stat"><strong>${data.completion}%</strong><span>训练完成度</span></div>
        <div class="lr-stat"><strong>${data.done}/${data.total}</strong><span>已完成周数</span></div>
        <div class="lr-stat"><strong>${data.photoStats.count}</strong><span>分析作品数</span></div>
        <div class="lr-stat"><strong>${photoAvg}</strong><span>作品均分</span></div>
      </div>

      <div class="lr-section">
        <h4>六阶段进度</h4>
        <div class="lr-bars">
          ${data.stageProgress
            .map(
              (s) => `
            <div class="lr-bar">
              <span>${s.name}</span>
              <div class="bar"><i style="width:${s.pct}%"></i></div>
              <strong>${s.pct}%</strong>
            </div>`
            )
            .join("")}
        </div>
      </div>

      <div class="lr-section">
        <h4>作品能力维度（基线定性）</h4>
        <div class="lr-bars">${abilityHtml}</div>
      </div>

      <div class="lr-section">
        <h4>本周/下一步</h4>
        <ul class="lr-list">
          ${
            data.nextWeek
              ? `<li>建议继续：<strong>Week ${String(data.nextWeek.week).padStart(2, "0")}</strong> · ${data.nextWeek.stage} · ${data.nextWeek.title}</li>`
              : `<li>24 周已全部打卡。下一步做组照与长期项目。</li>`
          }
          <li>作品分析：${data.photoStats.count ? `已累计 ${data.photoStats.count} 张，最高 ${data.photoStats.best}，最低 ${data.photoStats.worst}` : "尚未开始，上传照片分析构图与曝光"}</li>
          ${
            data.baseline && data.baseline.photoAvg != null
              ? `<li>首次定性基线：${data.baseline.photoCount || "?"} 张 · 均分 ${data.baseline.photoAvg}</li>`
              : `<li>建议做一次「作品定性」，让分数结合真实出片水平</li>`
          }
        </ul>
      </div>

      <div class="lr-section">
        <h4>已完成主题（最近）</h4>
        <ul class="lr-list">
          ${
            data.doneTitles.length
              ? data.doneTitles
                  .slice(0, 10)
                  .map((t) => `<li>${t}</li>`)
                  .join("")
              : `<li>还没有打卡记录。打开训练计划，勾选已完成的周次。</li>`
          }
        </ul>
      </div>

      ${
        data.journalSample.length
          ? `<div class="lr-section">
        <h4>最近分析</h4>
        <ul class="lr-list">
          ${data.journalSample
            .map((j) => `<li>${j.date} · ${j.name} · ${j.score} 分（${j.grade || ""}）</li>`)
            .join("")}
        </ul>
      </div>`
          : ""
      }
    </div>
  `;
}

function downloadLearningReportHTML(data) {
  const paper = $("#learningReportPaper");
  if (!paper) return;
  const css = document.querySelector('link[href="styles.css"]')
    ? ""
    : "";
  const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>光影手帐学习报告</title>
<style>
body{font-family:"Noto Serif SC","PingFang SC",serif;background:#f3ede3;color:#2a241c;margin:0;padding:32px}
.learning-report{max-width:760px;margin:0 auto;background:#f3ede3}
h3{margin:0 0 6px;font-size:1.45rem}
.lr-meta{color:#8a7d6c;font-size:.84rem;margin-bottom:18px}
.lr-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:18px 0}
.lr-stat{background:rgba(42,36,28,.06);border-radius:10px;padding:14px;text-align:center}
.lr-stat strong{display:block;font-size:1.55rem;color:#b07a32}
.lr-stat span{font-size:.75rem;color:#8a7d6c}
.lr-section{margin-top:18px;padding-top:14px;border-top:1px solid rgba(42,36,28,.12)}
.lr-section h4{margin:0 0 10px;font-size:1.05rem}
.lr-bars{display:flex;flex-direction:column;gap:8px}
.lr-bar{display:grid;grid-template-columns:72px 1fr 36px;gap:10px;align-items:center;font-size:.82rem}
.lr-bar .bar{height:8px;border-radius:99px;background:rgba(42,36,28,.1);overflow:hidden}
.lr-bar .bar i{display:block;height:100%;background:#b07a32;border-radius:inherit}
.lr-list{margin:0;padding-left:1.15em;font-size:.88rem;line-height:1.75;color:#5c5244}
</style></head><body>${paper.outerHTML}</body></html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  downloadBlob(blob, `光影手帐-学习报告-${Date.now()}.html`);
}
