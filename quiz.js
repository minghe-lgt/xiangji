/**
 * 能力诊断 — 题库 + 照片能力结合 + 起点推荐
 * 16 题 × 6 维度，配合 2–3 张作品分析，定位该从哪周开始补。
 */

const QUIZ_DIMENSIONS = {
  exposure: { name: "曝光", stages: ["s1", "s2"], weeks: [1, 2, 5, 8] },
  depth: { name: "镜头景深", stages: ["s1", "s2"], weeks: [3, 6] },
  composition: { name: "构图", stages: ["s3"], weeks: [9, 10, 11, 12] },
  light: { name: "用光", stages: ["s4"], weeks: [13, 14, 15, 16] },
  color: { name: "色彩后期", stages: ["s2", "s6"], weeks: [7, 21, 22] },
  method: { name: "方法题材", stages: ["s5", "s6"], weeks: [17, 18, 19, 23, 24] },
};

/**
 * 16 题，覆盖 6 维度。难度 1=入门 2=基础 3=进阶
 * 映射到课程周，方便推荐「从哪补」
 */
const QUIZ_BANK = [
  {
    id: 1,
    dim: "exposure",
    week: 1,
    level: 1,
    q: "光圈从 f/2.8 调到 f/5.6，其他不变，画面会？",
    options: ["变亮约 2 档", "变暗约 2 档", "变暗约 1 档", "亮度不变"],
    answer: 1,
    explain: "f/2.8→f/5.6 是两档光圈，进光量变为 1/4，画面变暗约 2 档。",
  },
  {
    id: 2,
    dim: "exposure",
    week: 2,
    level: 1,
    q: "大面积雪景用评价测光，相机通常会把雪拍成？",
    options: ["正确曝光的白", "偏灰", "过曝", "严重欠曝"],
    answer: 1,
    explain: "相机想把画面平均成中灰，雪会被压灰——需要 +1~+2EV（白加黑减）。",
  },
  {
    id: 3,
    dim: "exposure",
    week: 5,
    level: 2,
    q: "直方图右侧「顶死」表示？",
    options: ["高光剪切，细节不可逆", "阴影丢失", "对比度刚好", "白平衡偏冷"],
    answer: 0,
    explain: "右侧顶死 = 高光溢出，像素信息已丢，后期拉不回。",
  },
  {
    id: 4,
    dim: "exposure",
    week: 8,
    level: 2,
    q: "想拍流水拉丝、车轨，优先用什么模式？",
    options: ["A/Av 光圈优先", "S/Tv 快门优先", "全自动", "夜景人像模式"],
    answer: 1,
    explain: "控制动态模糊 = 控制快门，S/Tv 最直接；再用三脚架稳住。",
  },
  {
    id: 5,
    dim: "depth",
    week: 6,
    level: 1,
    q: "想让背景更虚，最有效的做法是？",
    options: ["提高 ISO", "开大光圈 + 靠近主体", "缩小光圈", "用广角拉远"],
    answer: 1,
    explain: "景深三要素里「距离」影响往往最大：靠近主体 + 大光圈，虚化最明显。",
  },
  {
    id: 6,
    dim: "depth",
    week: 6,
    level: 2,
    q: "「超焦距」对焦法的收益是？",
    options: ["背景更虚", "从约一半超焦距到无穷远都清晰", "曝光更准", "色彩更浓"],
    answer: 1,
    explain: "对在超焦距上，清晰范围大约从 H/2 延伸到无穷远，风光常用。",
  },
  {
    id: 7,
    dim: "depth",
    week: 3,
    level: 1,
    q: "50mm 镜头手持拍静止人像，安全快门大约不低于？",
    options: ["1/15s", "1/50s", "1/250s", "1/1000s"],
    answer: 1,
    explain: "安全快门 ≈ 1/焦距，50mm 约 1/50s。",
  },
  {
    id: 8,
    dim: "composition",
    week: 9,
    level: 1,
    q: "三分法把主体放在九宫格的哪里最稳？",
    options: ["正中心", "三分线交点", "右上角最边缘", "画面正下方 1/2"],
    answer: 1,
    explain: "交点或线上最常用；正中心有时也对，但三分法更通用。",
  },
  {
    id: 9,
    dim: "composition",
    week: 11,
    level: 2,
    q: "「视觉重量」描述正确的是？",
    options: ["暗的比亮的重", "亮的、大的、清晰的更重", "只有人物才有重量", "构图与重量无关"],
    answer: 1,
    explain: "亮 > 暗、大 > 小、清晰 > 模糊、人脸/文字最强，可用来做画面配重。",
  },
  {
    id: 10,
    dim: "composition",
    week: 10,
    level: 2,
    q: "画面里的道路、栏杆、河流通常用来？",
    options: ["填满画面", "引导视线到主体", "增加噪点", "校正白平衡"],
    answer: 1,
    explain: "引导线把观众视线带向主体，线条越明确越有力。",
  },
  {
    id: 11,
    dim: "composition",
    week: 12,
    level: 3,
    q: "开放式构图（主体被裁切）暗示的是？",
    options: ["失误裁歪了", "画外仍有故事/空间", "必须重拍", "只能用于人像"],
    answer: 1,
    explain: "故意裁切可以暗示画外空间，是有意识的选择，不是错误。",
  },
  {
    id: 12,
    dim: "light",
    week: 13,
    level: 1,
    q: "侧光相比顺光，最大优势是？",
    options: ["更亮", "立体感强、影子塑形", "不会过曝", "色彩更艳"],
    answer: 1,
    explain: "顺光平、侧光塑形；侧光/侧逆光能交代体积与质感。",
  },
  {
    id: 13,
    dim: "light",
    week: 14,
    level: 2,
    q: "黄金时刻大约是？",
    options: ["正午前后", "日出后 / 日落前约 1 小时", "半夜 12 点", "阴天全天"],
    answer: 1,
    explain: "光线低、色温暖、阴影长，是风光与人像的黄金时段。",
  },
  {
    id: 14,
    dim: "light",
    week: 15,
    level: 2,
    q: "室内用闪光灯拍人，哪种最不「硬」？",
    options: ["直闪", "跳闪（打天花板/墙）", "全功率裸灯", "硬反光板正对"],
    answer: 1,
    explain: "跳闪把点光变成大面积柔和光，皮肤质感最好。",
  },
  {
    id: 15,
    dim: "color",
    week: 7,
    level: 1,
    q: "在钨丝灯环境下用「日光白平衡」，照片会偏？",
    options: ["偏蓝冷", "偏黄暖", "纯黑白", "无影响"],
    answer: 1,
    explain: "钨丝灯偏暖，日光白平衡不校正，画面会更黄。",
  },
  {
    id: 16,
    dim: "color",
    week: 21,
    level: 3,
    q: "后期调色时最稳妥的 HSL 用法是？",
    options: ["全局饱和度拉满", "只调关键色相/饱和", "只加对比度", "疯狂加清晰度"],
    answer: 1,
    explain: "只动关键色，避免整体饱和失控，色彩才「干净」。",
  },
  {
    id: 17,
    dim: "method",
    week: 19,
    level: 2,
    q: "布列松「决定性瞬间」强调的是？",
    options: ["像素越高越好", "几何与事件同时对齐的瞬间", "必须用胶片", "只拍黑白"],
    answer: 1,
    explain: "等待形式与事件在同一刻成立，才是决定性瞬间。",
  },
  {
    id: 18,
    dim: "method",
    week: 23,
    level: 3,
    q: "组照（9 张）最重要的编辑原则是？",
    options: ["张数越多越好", "统一色调/画幅/叙事", "全是特写", "只用大光圈"],
    answer: 1,
    explain: "组照靠「统一」成立：色调、画幅、叙事一致，节奏有变化。",
  },
];

/** 诊断报告：结合答题 + 照片分析 */
function buildAssessment({ quizAnswers, photoResults }) {
  // quiz: { [questionId]: optionIndex }
  // photoResults: [{ overall, dims: [{key,score}], genre }]
  const dimStats = {};
  for (const key of Object.keys(QUIZ_DIMENSIONS)) {
    dimStats[key] = { correct: 0, total: 0, name: QUIZ_DIMENSIONS[key].name };
  }

  let correct = 0;
  for (const q of QUIZ_BANK) {
    const pick = quizAnswers[q.id];
    const d = dimStats[q.dim];
    d.total++;
    if (pick === q.answer) {
      d.correct++;
      correct++;
    }
  }

  const dimScores = {};
  for (const [k, v] of Object.entries(dimStats)) {
    dimScores[k] = v.total ? Math.round((v.correct / v.total) * 100) : 0;
  }

  // 照片维度合并：analyzeImage 的 dims key
  // composition/exposure/color/sharpness/light/balance
  const photoAgg = {
    composition: 0,
    exposure: 0,
    color: 0,
    light: 0,
    sharpness: 0,
    balance: 0,
  };
  if (photoResults && photoResults.length) {
    for (const p of photoResults) {
      for (const d of p.dims || []) {
        if (photoAgg[d.key] !== undefined) photoAgg[d.key] += d.score;
      }
    }
    for (const k of Object.keys(photoAgg)) {
      photoAgg[k] = Math.round(photoAgg[k] / photoResults.length);
    }
  }

  // 综合能力：题 55% + 照片 45%（有照片时）
  const hasPhotos = photoResults && photoResults.length > 0;
  function blend(quizScore, photoScore) {
    if (!hasPhotos) return quizScore;
    return Math.round(quizScore * 0.55 + photoScore * 0.45);
  }

  const overallMap = {
    exposure: blend(dimScores.exposure, photoAgg.exposure),
    depth: dimScores.depth, // 照片里没有专门景深维，用清晰度近似一半
    composition: blend(dimScores.composition, photoAgg.composition),
    light: blend(dimScores.light, photoAgg.light),
    color: blend(dimScores.color, photoAgg.color),
    method: blend(dimScores.method, Math.round((photoAgg.composition + photoAgg.balance) / 2)),
  };
  // depth：题 60% + 清晰度 40%
  if (hasPhotos) {
    overallMap.depth = Math.round(dimScores.depth * 0.6 + photoAgg.sharpness * 0.4);
  }

  // 起点周：找最弱维度对应周
  const ranked = Object.entries(overallMap).sort((a, b) => a[1] - b[1]);
  const weakest = ranked.slice(0, 3).map(([k, score]) => ({
    key: k,
    name: QUIZ_DIMENSIONS[k].name,
    score,
    weeks: QUIZ_DIMENSIONS[k].weeks,
  }));

  // 起点周
  let startWeek = weakest[0] && weakest[0].weeks ? weakest[0].weeks[0] : 1;
  const quizAvg = Math.round((correct / QUIZ_BANK.length) * 100);
  const photoAvg = hasPhotos
    ? Math.round(photoResults.reduce((s, p) => s + p.overall, 0) / photoResults.length)
    : null;
  const combined = hasPhotos ? Math.round(quizAvg * 0.55 + photoAvg * 0.45) : quizAvg;

  const weakestScore = weakest[0] ? weakest[0].score : 100;

  if (combined < 35) {
    startWeek = 1;
  } else if (weakestScore >= 80) {
    // 各维都不弱 → 直接进题材/进阶
    startWeek = 17;
  } else if (weakestScore >= 65) {
    // 中等：从弱项周开始
    startWeek = weakest[0].weeks[0];
  } else {
    // 明显短板：再往前借一周打底
    startWeek = Math.max(1, (weakest[0].weeks[0] || 1) - 1);
  }

  // 补齐清单
  const gaps = weakest.map((w) => {
    const weeks = w.weeks.map((n) => `W${String(n).padStart(2, "0")}`).join("、");
    return {
      title: `${w.name} · 现 ${w.score} 分`,
      advice: gapAdvice[w.key] || "按训练计划对应周次练习即可",
      weeks,
    };
  });

  // 错题
  const wrong = QUIZ_BANK.filter((q) => quizAnswers[q.id] !== q.answer).map((q) => ({
    q: q.q,
    explain: q.explain,
    dim: QUIZ_DIMENSIONS[q.dim].name,
  }));

  return {
    quizCorrect: correct,
    quizTotal: QUIZ_BANK.length,
    quizAvg,
    photoAvg,
    combined,
    dimScores: overallMap,
    photoAgg,
    hasPhotos,
    startWeek,
    gaps,
    wrong,
    level:
      combined >= 85
        ? "进阶"
        : combined >= 70
          ? "基础扎实"
          : combined >= 50
            ? "需系统补强"
            : "建议从入门开始",
  };
}

const gapAdvice = {
  exposure: "先练曝光三角与测光：同场景包围曝光，学会看直方图判断高光/暗部。",
  depth: "练习景深控制：同一主体改距离与光圈各拍一组，验证虚实变化。",
  composition: "每天 15 分钟三分法/引导线专项；拍完画出线再看是否成立。",
  light: "固定一个静物，在早/中/晚各拍一张，记录光位与影调。",
  color: "练白平衡与 HSL：同场景四种白平衡，再只调关键色后期一次。",
  method: "做一次 9 张组照选题（统一色调/画幅），或完成一次街头 30 张选 5。",
};
