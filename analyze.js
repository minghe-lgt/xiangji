/* 专业照片分析引擎 — 纯前端 Canvas，照片不离开浏览器 */

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * 完整分析一张图片
 * @returns {{
 *   overall: number,
 *   grade: string,
 *   gradeColor: string,
 *   headline: string,
 *   dims: Array<{key:string,name:string,score:number,note:string}>,
 *   tips: string[],
 *   histogram: {lum:number[], r:number[], g:number[], b:number[], clippedHigh:number, clippedLow:number},
 *   palette: Array<{hex:string, weight:number}>,
 *   meta: object,
 *   composition: object,
 *   light: object
 * }}
 */
function analyzeImage(img) {
  const maxSide = 520;
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(8, Math.round(img.naturalWidth * scale));
  const h = Math.max(8, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const n = w * h;

  // ---------- histograms & global stats ----------
  const histL = new Float64Array(256);
  const histR = new Uint32Array(256);
  const histG = new Uint32Array(256);
  const histB = new Uint32Array(256);
  const lum = new Float32Array(n);

  let sumL = 0, sumL2 = 0;
  let clippedHigh = 0, clippedLow = 0;
  let sumR = 0, sumG = 0, sumB = 0;
  let sumSat = 0;
  let skinVotes = 0, skyVotes = 0, greenVotes = 0;

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const L = luminance(r, g, b);
    lum[p] = L;
    histL[L | 0]++;
    histR[r]++;
    histG[g]++;
    histB[b]++;
    sumL += L;
    sumL2 += L * L;
    if (L >= 250) clippedHigh++;
    if (L <= 5) clippedLow++;
    sumR += r; sumG += g; sumB += b;

    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
    sumSat += sat;

    // rough semantic votes
    if (r > 95 && g > 40 && b > 20 && r > g && g > b && (maxC - minC) > 15 && Math.abs(r - g) > 15) skinVotes++;
    if (b > r && b > g && L > 70 && sat > 0.15) skyVotes++;
    if (g > r && g > b && sat > 0.2) greenVotes++;
  }

  // normalize histograms
  const histLNorm = Array.from(histL, (v) => v / n);
  const histRNorm = Array.from(histR, (v) => v / n);
  const histGNorm = Array.from(histG, (v) => v / n);
  const histBNorm = Array.from(histB, (v) => v / n);

  const meanL = sumL / n;
  const contrast = Math.sqrt(Math.max(0, sumL2 / n - meanL * meanL));
  const overRatio = clippedHigh / n;
  const underRatio = clippedLow / n;
  const avgSat = sumSat / n;
  const avgR = sumR / n, avgG = sumG / n, avgB = sumB / n;
  const warmth = (avgR - avgB) / 255;

  // dynamic range proxy: percentile span of luminance
  let acc = 0, p2 = 0, p98 = 255;
  for (let i = 0; i < 256; i++) {
    acc += histL[i];
    if (acc / n >= 0.02) { p2 = i; break; }
  }
  acc = 0;
  for (let i = 255; i >= 0; i--) {
    acc += histL[i];
    if (acc / n >= 0.02) { p98 = i; break; }
  }
  const dynamicRange = p98 - p2; // 0-255

  // ---------- edges / sharpness ----------
  function edgeAt(x, y) {
    if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) return 0;
    const i = y * w + x;
    const gx = lum[i + 1] - lum[i - 1];
    const gy = lum[i + w] - lum[i - w];
    return Math.abs(gx) + Math.abs(gy);
  }

  let edgeSum = 0, edgeCount = 0;
  // also collect edge map for composition
  const edgeMap = new Float32Array(n);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const e = edgeAt(x, y);
      edgeMap[y * w + x] = e;
      edgeSum += e;
      edgeCount++;
    }
  }
  const edgeMean = edgeCount ? edgeSum / edgeCount : 0;
  const sharpness = clamp(Math.round((edgeMean / 13) * 100), 10, 100);

  // high-frequency energy in center vs corners (focus falloff)
  let centerEdge = 0, cornerEdge = 0, centerN = 0, cornerN = 0;
  const cx = w / 2, cy = h / 2;
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const e = edgeMap[y * w + x];
      const dx = Math.abs(x - cx) / cx;
      const dy = Math.abs(y - cy) / cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 0.28) { centerEdge += e; centerN++; }
      else if (d > 0.85) { cornerEdge += e; cornerN++; }
    }
  }
  const centerAvg = centerN ? centerEdge / centerN : 0;
  const cornerAvg = cornerN ? cornerEdge / cornerN : 0;

  // ---------- composition ----------
  const thirdX = [Math.floor(w / 3), Math.floor((2 * w) / 3)];
  const thirdY = [Math.floor(h / 3), Math.floor((2 * h) / 3)];
  const goldenX = [Math.floor(w * 0.382), Math.floor(w * 0.618)];
  const goldenY = [Math.floor(h * 0.382), Math.floor(h * 0.618)];
  const band = Math.max(3, Math.round(Math.min(w, h) * 0.035));

  let nearThird = 0, nearGolden = 0, totalEdge = 0;
  let massX = 0, massY = 0, mass = 0;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const e = edgeMap[y * w + x];
      if (e < 10) continue;
      totalEdge += e;
      mass += e;
      massX += e * x;
      massY += e * y;

      const dx3 = Math.min(Math.abs(x - thirdX[0]), Math.abs(x - thirdX[1]));
      const dy3 = Math.min(Math.abs(y - thirdY[0]), Math.abs(y - thirdY[1]));
      if (dx3 <= band || dy3 <= band) nearThird += e;

      const dxG = Math.min(Math.abs(x - goldenX[0]), Math.abs(x - goldenX[1]));
      const dyG = Math.min(Math.abs(y - goldenY[0]), Math.abs(y - goldenY[1]));
      if (dxG <= band || dyG <= band) nearGolden += e;
    }
  }

  const thirdRatio = totalEdge > 0 ? nearThird / totalEdge : 0.25;
  const goldenRatio = totalEdge > 0 ? nearGolden / totalEdge : 0.25;

  // peak near 0.40 for thirds
  let thirdsScore = 100 - Math.abs(thirdRatio - 0.40) * 190;
  thirdsScore = clamp(Math.round(thirdsScore), 20, 100);

  let goldenScore = 100 - Math.abs(goldenRatio - 0.38) * 175;
  goldenScore = clamp(Math.round(goldenScore), 25, 100);

  // symmetry (left-right luminance)
  let symDiff = 0, symN = 0;
  const halfW = Math.floor(w / 2);
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < halfW; x += 2) {
      symDiff += Math.abs(lum[y * w + x] - lum[y * w + (w - 1 - x)]);
      symN++;
    }
  }
  const avgSymDiff = symN ? symDiff / symN : 40;
  const symmetryScore = clamp(Math.round(95 - avgSymDiff * 1.15), 25, 100);

  // visual balance (center of mass)
  let balanceScore = 70;
  let dist = 0.3;
  if (mass > 0) {
    const comX = massX / mass;
    const comY = massY / mass;
    const dx = (comX - w / 2) / (w / 2);
    const dy = (comY - h / 2) / (h / 2);
    dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.16) balanceScore = 80;
    else if (dist < 0.40) balanceScore = 94 - dist * 35;
    else balanceScore = 80 - (dist - 0.40) * 75;
    if (symmetryScore > 82 && dist < 0.12) balanceScore = Math.max(balanceScore, 90);
  }
  balanceScore = clamp(Math.round(balanceScore), 28, 100);

  // horizon-ish strong horizontal edge near thirds
  let horizonStrength = 0;
  for (let y = Math.floor(h * 0.25); y < Math.floor(h * 0.75); y += 2) {
    let rowEdge = 0;
    for (let x = 2; x < w - 2; x += 3) {
      rowEdge += edgeMap[y * w + x];
    }
    const dy3 = Math.min(Math.abs(y - thirdY[0]), Math.abs(y - thirdY[1]));
    if (dy3 <= band * 1.5) horizonStrength = Math.max(horizonStrength, rowEdge / (w / 3));
  }

  const compositionScore = clamp(
    Math.round(thirdsScore * 0.42 + goldenScore * 0.18 + symmetryScore * 0.18 + balanceScore * 0.22),
    18,
    100
  );

  // ---------- exposure ----------
  let exposureScore = 100;
  exposureScore -= overRatio * 240;
  exposureScore -= underRatio * 200;
  const meanPenalty = Math.abs(meanL - 112) / 112;
  exposureScore -= meanPenalty * 58;
  if (contrast < 26) exposureScore -= (26 - contrast) * 1.6;
  if (dynamicRange < 80) exposureScore -= (80 - dynamicRange) * 0.15;
  exposureScore = clamp(Math.round(exposureScore), 8, 100);

  // ---------- color ----------
  const satScore = clamp(Math.round(56 + (avgSat - 0.26) * 130), 22, 100);
  const warmthScore = clamp(Math.round(74 - Math.abs(warmth) * 42), 32, 100);
  // color variety: non-zero histogram bins ratio
  let colorBins = 0;
  for (let i = 8; i < 248; i++) if (histR[i] + histG[i] + histB[i] > n * 0.002) colorBins++;
  const varietyScore = clamp(Math.round((colorBins / 80) * 100), 20, 100);
  const colorScore = clamp(
    Math.round(satScore * 0.45 + warmthScore * 0.30 + varietyScore * 0.25),
    18,
    100
  );

  // ---------- light ----------
  // estimate key-light direction from luminance gradient of low-freq blocks
  let leftL = 0, rightL = 0, topL = 0, bottomL = 0;
  let leftN = 0, rightN = 0, topN = 0, bottomN = 0;
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const L = lum[y * w + x];
      if (x < w * 0.33) { leftL += L; leftN++; }
      if (x > w * 0.67) { rightL += L; rightN++; }
      if (y < h * 0.33) { topL += L; topN++; }
      if (y > h * 0.67) { bottomL += L; bottomN++; }
    }
  }
  const leftAvg = leftN ? leftL / leftN : 0;
  const rightAvg = rightN ? rightL / rightN : 0;
  const topAvg = topN ? topL / topN : 0;
  const bottomAvg = bottomN ? bottomL / bottomN : 0;

  const horizDelta = (rightAvg - leftAvg) / 255;
  const vertDelta = (topAvg - bottomAvg) / 255;
  let lightDir = "均匀 / 无明显方向";
  if (Math.abs(horizDelta) > 0.08 || Math.abs(vertDelta) > 0.08) {
    const hPart = horizDelta > 0.08 ? "右" : horizDelta < -0.08 ? "左" : "";
    const vPart = vertDelta > 0.08 ? "上" : vertDelta < -0.08 ? "下" : "";
    lightDir = `光线偏${vPart}${hPart}侧`;
  }

  const lightContrast = clamp(Math.round(contrast * 2.2), 15, 100);
  let lightScore = clamp(
    Math.round(lightContrast * 0.55 + (100 - Math.abs(horizDelta) * 80 - Math.abs(vertDelta) * 60) * 0.2 + exposureScore * 0.25),
    20,
    100
  );

  // ---------- overall ----------
  const dims = [
    { key: "composition", name: "构图", score: compositionScore, note: `三分能量 ${(thirdRatio * 100).toFixed(0)}% · 对称 ${symmetryScore}` },
    { key: "exposure", name: "曝光", score: exposureScore, note: `高光溢出 ${(overRatio * 100).toFixed(1)}% · 暗部死黑 ${(underRatio * 100).toFixed(1)}%` },
    { key: "color", name: "色彩", score: colorScore, note: `饱和 ${(avgSat * 100).toFixed(0)}% · 色温倾向 ${warmth > 0.03 ? "偏暖" : warmth < -0.03 ? "偏冷" : "中性"}` },
    { key: "sharpness", name: "清晰度", score: sharpness, note: `边缘能量 ${edgeMean.toFixed(1)} · 中心/边角 ${(centerAvg / Math.max(cornerAvg, 0.1)).toFixed(2)}` },
    { key: "light", name: "用光", score: lightScore, note: lightDir },
    { key: "balance", name: "平衡", score: balanceScore, note: `重心偏移 ${(dist * 100).toFixed(0)}%` },
  ];

  const overall = clamp(
    Math.round(
      compositionScore * 0.26 +
      exposureScore * 0.22 +
      colorScore * 0.14 +
      sharpness * 0.14 +
      lightScore * 0.12 +
      balanceScore * 0.12
    ),
    8,
    100
  );

  // ---------- genre heuristic ----------
  const skinRatio = skinVotes / n;
  const skyRatio = skyVotes / n;
  const greenRatio = greenVotes / n;
  const aspect = img.naturalWidth / img.naturalHeight;
  let genre = "通用 / 待观察";
  if (skinRatio > 0.08) genre = "疑似人像";
  else if (skyRatio > 0.18 || greenRatio > 0.22) genre = "疑似风光 / 户外";
  else if (aspect < 0.95 && skyRatio < 0.08) genre = "疑似人像 / 静物（竖幅）";
  else if (avgSat < 0.12) genre = "疑似黑白 / 低饱和风格";

  // ---------- palette (quantized) ----------
  const palette = extractPalette(data, w, h);

  // ---------- tips (professional, specific) ----------
  const tips = [];
  if (overRatio > 0.05) {
    tips.push(`高光剪切 ${ (overRatio * 100).toFixed(1) }%，云层/皮肤细节已不可逆。下次用 -0.7EV 或打开高光警告（斑马纹），或对高光点测后再构图。`);
  } else if (overRatio > 0.015) {
    tips.push("高光接近剪切，建议拍摄时向左补偿 1/3–2/3 EV，保留「向右曝光」的余量。");
  }
  if (underRatio > 0.12) {
    tips.push(`暗部死黑占比 ${(underRatio * 100).toFixed(1)}%——若是夜景/低调风格可接受；否则提亮阴影或用包围曝光。`);
  } else if (underRatio > 0.05) {
    tips.push("暗部丢失偏多，可用点测光对暗部测光，或后期拉阴影（注意噪点）。");
  }
  if (contrast < 28) {
    tips.push("对比偏低，画面偏「平」。寻找更强的光比（侧光/硬光），或后期略提对比 + 黑色色阶。");
  }
  if (dynamicRange < 70) {
    tips.push(`有效动态范围偏窄（P2–P98 约 ${dynamicRange} 级）。尝试寻找高反差场景练习「保住高光、暗部可沉」。`);
  }
  if (thirdsScore < 62) {
    tips.push("三分法命中率不高：主体或兴趣点偏离三分交点。拍摄时打开网格线，先刻意练习 20 张。");
  }
  if (goldenScore < 55 && thirdsScore >= 62) {
    tips.push("三分法在用，但可以试试黄金螺旋——把视线「卷」进主体，风光与静物特别有效。");
  }
  if (symmetryScore < 52) {
    tips.push("画面不对称且重心分散。要么寻找对称结构强化稳定感，要么用配重元素稳住失衡的一侧。");
  }
  if (balanceScore < 62) {
    tips.push(`视觉重心偏移约 ${ (dist * 100).toFixed(0) }%。试试移动机位，或在轻的一侧加入前景/人物/色块。`);
  }
  if (sharpness < 52) {
    tips.push("清晰度不足：检查对焦点是否在主体、快门是否够快（安全快门=1/焦距），或镜头是否在最大光圈「软」。");
  } else if (cornerAvg < centerAvg * 0.35 && centerAvg > 12) {
    tips.push("边缘画质衰减明显：收一档光圈（f/5.6–f/8）通常会明显改善边角锐度。");
  }
  if (avgSat < 0.16) {
    tips.push("色彩较寡淡。若非刻意黑白，可寻找更丰富的色块（广告牌、植被、衣物），或后期仅提升关键色的饱和度。");
  }
  if (avgSat > 0.58) {
    tips.push("饱和度偏高，色彩开始「抢戏」。建议 HSL 里只提关键色，整体饱和回落 5–10 点。");
  }
  if (Math.abs(warmth) > 0.18) {
    tips.push(warmth > 0 ? "整体明显偏暖（日落/钨丝灯气氛）。若非刻意，请用阴天/自定义白平衡校正。" : "整体明显偏冷。若是阴影/蓝调时刻属于正常；否则用白炽灯/自定义白平衡找回暖度。");
  }
  if (lightContrast < 40) {
    tips.push("光比太平，立体感弱。改用侧光（45°）或窗光侧打，让影子塑形。");
  }
  if (tips.length === 0) {
    tips.push("技术面非常均衡！下一步练「叙事」：同一主体拍 5 张讲一个小故事，或去挑战组照编辑。");
  }
  if (tips.length > 6) tips.length = 6;

  // ---------- grade ----------
  let grade = "C", gradeColor = "#b07a32", headline = "继续练习";
  if (overall >= 88) { grade = "A+"; gradeColor = "#2f7d4a"; headline = "非常出色"; }
  else if (overall >= 80) { grade = "A"; gradeColor = "#3d8f58"; headline = "相当扎实"; }
  else if (overall >= 70) { grade = "B+"; gradeColor = "#6a9a3c"; headline = "基础不错"; }
  else if (overall >= 60) { grade = "B"; gradeColor = "#b07a32"; headline = "方向正确"; }
  else if (overall >= 50) { grade = "C+"; gradeColor = "#c47a3a"; headline = "有提升空间"; }

  return {
    overall,
    grade,
    gradeColor,
    headline,
    dims,
    tips,
    genre,
    histogram: {
      lum: histLNorm,
      r: histRNorm,
      g: histGNorm,
      b: histBNorm,
      clippedHigh: overRatio,
      clippedLow: underRatio,
    },
    palette,
    composition: {
      thirdsScore,
      goldenScore,
      symmetryScore,
      balanceScore,
      thirdRatio,
      goldenRatio,
      dist,
      horizonStrength,
    },
    light: {
      direction: lightDir,
      horizDelta,
      vertDelta,
      contrast: lightContrast,
    },
    meta: {
      width: img.naturalWidth,
      height: img.naturalHeight,
      meanL: Math.round(meanL),
      contrast: Math.round(contrast),
      dynamicRange: Math.round(dynamicRange),
      sat: +(avgSat).toFixed(3),
      warmth: +(warmth).toFixed(3),
      overRatio: +(overRatio * 100).toFixed(2),
      underRatio: +(underRatio * 100).toFixed(2),
    },
  };
}

/** 简易主色调提取：4x4x4 量化 + 权重排序 */
function extractPalette(data, w, h) {
  const bins = new Map();
  const step = Math.max(1, Math.floor(Math.min(w, h) / 80));
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const qr = r >> 5, qg = g >> 5, qb = b >> 5;
      const key = (qr << 6) | (qg << 3) | qb;
      const cur = bins.get(key) || { n: 0, r: 0, g: 0, b: 0 };
      cur.n++; cur.r += r; cur.g += g; cur.b += b;
      bins.set(key, cur);
    }
  }
  const total = [...bins.values()].reduce((s, v) => s + v.n, 0) || 1;
  return [...bins.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, 6)
    .map((v) => ({
      hex: rgbToHex(Math.round(v.r / v.n), Math.round(v.g / v.n), Math.round(v.b / v.n)),
      weight: +(v.n / total).toFixed(3),
    }));
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/** 画直方图 */
function drawHistogram(canvas, histogram) {
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || 280;
  const cssH = 140;
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, cssW, cssH);
  ctx.fillStyle = "#1a1816";
  ctx.fillRect(0, 0, cssW, cssH);

  // grid
  ctx.strokeStyle = "rgba(240,233,222,0.08)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const x = (cssW * i) / 4;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, cssH);
    ctx.stroke();
  }

  // channels as additive-ish overlays
  const channels = [
    { data: histogram.r, color: "rgba(220,80,80,0.45)" },
    { data: histogram.g, color: "rgba(80,200,100,0.40)" },
    { data: histogram.b, color: "rgba(80,120,230,0.45)" },
    { data: histogram.lum, color: "rgba(240,233,222,0.75)" },
  ];

  let maxV = 0.0001;
  for (const ch of channels) {
    for (let i = 0; i < ch.data.length; i++) if (ch.data[i] > maxV) maxV = ch.data[i];
  }

  for (const ch of channels) {
    ctx.beginPath();
    ctx.moveTo(0, cssH);
    for (let i = 0; i < 256; i++) {
      const x = (i / 255) * cssW;
      const v = Math.min(1, ch.data[i] / (maxV * 0.55)); // compress peaks
      const y = cssH - v * (cssH - 8);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(cssW, cssH);
    ctx.closePath();
    ctx.fillStyle = ch.color;
    ctx.fill();
  }

  // clipping markers
  if (histogram.clippedHigh > 0.01) {
    ctx.fillStyle = "rgba(220,80,80,0.85)";
    ctx.fillRect(cssW - 6, 0, 6, 10);
  }
  if (histogram.clippedLow > 0.01) {
    ctx.fillStyle = "rgba(80,80,220,0.85)";
    ctx.fillRect(0, 0, 6, 10);
  }

  // labels
  ctx.fillStyle = "rgba(240,233,222,0.45)";
  ctx.font = "10px JetBrains Mono, monospace";
  ctx.fillText("0", 4, cssH - 4);
  ctx.fillText("128", cssW / 2 - 10, cssH - 4);
  ctx.fillText("255", cssW - 22, cssH - 4);
}

/** 构图叠加层 */
function drawOverlay(canvas, mode) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (!mode || mode === "none") return;

  const line = (x1, y1, x2, y2, dash) => {
    ctx.beginPath();
    if (dash) ctx.setLineDash(dash);
    else ctx.setLineDash([]);
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  const lw = Math.max(1.2, Math.round(Math.min(w, h) * 0.0035));

  if (mode === "thirds") {
    ctx.strokeStyle = "rgba(212,160,84,0.9)";
    ctx.lineWidth = lw;
    for (let i = 1; i <= 2; i++) {
      line((w * i) / 3, 0, (w * i) / 3, h);
      line(0, (h * i) / 3, w, (h * i) / 3);
    }
    ctx.fillStyle = "rgba(212,160,84,0.95)";
    const r = Math.max(3, Math.min(w, h) * 0.009);
    for (const x of [w / 3, (2 * w) / 3]) {
      for (const y of [h / 3, (2 * h) / 3]) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  if (mode === "golden") {
    ctx.strokeStyle = "rgba(212,160,84,0.85)";
    ctx.lineWidth = lw;
    const gx = [w * 0.382, w * 0.618];
    const gy = [h * 0.382, h * 0.618];
    for (const x of gx) line(x, 0, x, h, [8, 6]);
    for (const y of gy) line(0, y, w, y, [8, 6]);
    // spiral approximation
    ctx.strokeStyle = "rgba(212,160,84,0.55)";
    ctx.lineWidth = lw * 1.4;
    ctx.beginPath();
    // logarithmic-ish spiral from one corner toward golden point
    const cx = w * 0.618, cy = h * 0.382;
    const maxR = Math.min(w, h) * 0.85;
    for (let t = 0; t < Math.PI * 2.4; t += 0.08) {
      const r = maxR * Math.exp(-0.22 * t);
      const x = cx + r * Math.cos(t + Math.PI);
      const y = cy + r * Math.sin(t + Math.PI);
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  if (mode === "symmetry") {
    ctx.strokeStyle = "rgba(127,168,138,0.9)";
    ctx.lineWidth = lw;
    line(w / 2, 0, w / 2, h);
    line(0, h / 2, w, h / 2, [10, 8]);
    // vertical mirror guides
    ctx.strokeStyle = "rgba(127,168,138,0.35)";
    line(w * 0.25, 0, w * 0.25, h, [4, 6]);
    line(w * 0.75, 0, w * 0.75, h, [4, 6]);
  }

  if (mode === "diagonal") {
    ctx.strokeStyle = "rgba(217,122,92,0.85)";
    ctx.lineWidth = lw;
    line(0, 0, w, h);
    line(w, 0, 0, h);
  }

  if (mode === "center") {
    ctx.strokeStyle = "rgba(212,160,84,0.7)";
    ctx.lineWidth = lw;
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(w * 0.15, h * 0.15, w * 0.7, h * 0.7);
    ctx.setLineDash([]);
    // center cross
    line(w / 2 - 12, h / 2, w / 2 + 12, h / 2);
    line(w / 2, h / 2 - 12, w / 2, h / 2 + 12);
  }
}
