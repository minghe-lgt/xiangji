/**
 * 能力诊断 — 题库 + 照片能力结合 + 起点推荐
 * 18 题 × 6 维度，配合 10–20 张作品分析，定位该从哪周开始补。
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
 * 18 题，覆盖 6 维度。难度 1=入门 2=基础 3=进阶
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
  // ===== 扩充题库（每维 8 题，答案位置刻意打散；加载时仍会整体洗牌） =====
  {
    id: 19, dim: "exposure", week: 1, level: 1,
    q: "同场景同光圈同 ISO，哪个快门曝光最亮？",
    options: ["1/1000s", "1/500s", "1/250s", "1/2000s"],
    answer: 2,
    explain: "快门越慢进光越多：1/250 比 1/500 亮一档、比 1/1000 亮两档。",
  },
  {
    id: 20, dim: "exposure", week: 2, level: 1,
    q: "点测光最适合的场景是？",
    options: ["光比均匀的顺光风景", "光比大、要精确控制某一小区域的曝光（如逆光人脸）", "连拍运动主体", "大景深风光"],
    answer: 1,
    explain: "点测光只对极小区域负责，光比大时用它锁定关键亮度（如人脸）。",
  },
  {
    id: 21, dim: "exposure", week: 5, level: 2,
    q: "ETTR（向右曝光）的正确做法是？",
    options: ["在高光不剪切的前提下尽量提亮曝光，后期再压回来", "无脑 +5EV", "故意欠曝保住暗部", "靠提高对比度让直方图右移"],
    answer: 0,
    explain: "向右曝光 = 在不丢失高光的前提下多收光子，信噪比最高，暗部噪点最少。",
  },
  {
    id: 22, dim: "exposure", week: 5, level: 2,
    q: "f/4 · 1/250 · ISO 100 正确曝光；改用 f/2.8、ISO 不变，快门应为？",
    options: ["1/125s", "1/500s", "1/1000s", "1/250s"],
    answer: 1,
    explain: "光圈开大一档进光翻倍，快门就要快一档补偿。",
  },
  {
    id: 23, dim: "exposure", week: 8, level: 2,
    q: "拍瀑布丝绢水流，最合适的组合是？",
    options: ["高速快门 + 大光圈", "高 ISO + 高速快门", "闪光灯凝固水花", "小光圈 + 低 ISO + ND 减光镜 + 慢门"],
    answer: 3,
    explain: "丝绢感来自长曝；白天要慢门就得 ND 压光，同时用小光圈低 ISO 控制曝光。",
  },
  {
    id: 24, dim: "exposure", week: 1, level: 2,
    q: "f/4 · 1/500 · ISO 400 的等价曝光是？",
    options: ["f/8 · 1/125 · ISO 400", "f/8 · 1/500 · ISO 400", "f/5.6 · 1/500 · ISO 400", "f/8 · 1/250 · ISO 100"],
    answer: 0,
    explain: "f/4→f/8 收两档，1/500→1/125 慢两档，曝光量不变。",
  },
  {
    id: 25, dim: "exposure", week: 2, level: 1,
    q: "拍黑色物体特写，相机测光会怎么判，该怎么补？",
    options: ["判得过暗，应加 EV", "判得过亮，应减 EV", "把它提亮成灰，应减 EV（黑减）", "测光永远准确，无需补偿"],
    answer: 2,
    explain: "相机把画面平均成中灰：黑物体被提亮成灰，要负补偿；白物体被压灰，要正补偿。",
  },
  {
    id: 26, dim: "exposure", week: 8, level: 3,
    q: "白天室外想用 f/1.8 虚化，快门已到 1/8000 仍过曝，最有效的办法？",
    options: ["继续提高快门", "上 ND 减光镜", "缩小光圈妥协景深", "开闪光灯"],
    answer: 1,
    explain: "快门与光圈都到头时，ND 镜是唯一不牺牲拍摄意图的手段。",
  },
  {
    id: 27, dim: "depth", week: 3, level: 2,
    q: "拍赛车横穿画面，对焦设置应选？",
    options: ["AF-S + 中心单点", "AF-C + 区域/动态对焦", "手动对焦超焦距", "眼部对焦"],
    answer: 1,
    explain: "持续运动要连续对焦，配区域/追踪扩大容错；AF-S 会脱焦。",
  },
  {
    id: 28, dim: "depth", week: 3, level: 1,
    q: "RAW 相比 JPEG 的核心优势是？",
    options: ["12–14 bit 原始信息，白平衡/曝光后期容错大", "文件更小", "直出色彩更好", "对焦更快"],
    answer: 0,
    explain: "RAW 是传感器原始数据，后期调曝光/白平衡几乎无损；JPEG 已被相机固化处理。",
  },
  {
    id: 29, dim: "depth", week: 6, level: 2,
    q: "同样是 f/2.8、2m 对焦，从 50mm 换到 100mm，景深会？",
    options: ["变深", "不变", "变浅", "取决于 ISO"],
    answer: 2,
    explain: "焦距越长景深越浅，虚化更明显。",
  },
  {
    id: 30, dim: "depth", week: 6, level: 2,
    q: "对焦在超焦距 H 上时，清晰范围大约是？",
    options: ["从相机到无穷远", "从约 H/2 到无穷远", "只在 H 附近清晰", "从 H 到 2H"],
    answer: 1,
    explain: "超焦距对焦把后景深「送」到无穷远，前景深覆盖 H/2 起，风光常用。",
  },
  {
    id: 31, dim: "depth", week: 6, level: 1,
    q: "哪组参数景深最深？",
    options: ["f/1.8 · 24mm · 近距离", "f/4 · 85mm · 近距离", "f/2.8 · 200mm · 远距离", "f/16 · 24mm · 远距离"],
    answer: 3,
    explain: "小光圈 + 广角 + 远距离，三个加深景深的因素同时满足。",
  },
  {
    id: 32, dim: "depth", week: 3, level: 1,
    q: "眼部对焦最有价值的题材是？",
    options: ["风光", "移动车辆", "人像", "建筑静物"],
    answer: 2,
    explain: "人像合焦要求在眼睛，眼部对焦把成功率提满，尤其是大光圈浅景深时。",
  },
  {
    id: 33, dim: "depth", week: 6, level: 3,
    q: "「光圈越大画面越锐」的说法？",
    options: ["完全正确", "错误：多数镜头最佳画质在 f/5.6–f/11 附近", "只对定焦镜头成立", "只对微距镜头成立"],
    answer: 1,
    explain: "最大光圈通常画质下降（像差），最小光圈又有衍射；中间档最锐。",
  },
  {
    id: 34, dim: "depth", week: 3, level: 2,
    q: "拍静物发现焦点偏后，最稳的补救是？",
    options: ["靠后期裁切", "提高 ISO 重拍", "三脚架 + 实时取景放大手动对焦", "改用自动挡"],
    answer: 2,
    explain: "实时取景放大 + 手动对焦是静物合焦的金标准，比反复赌自动对焦可靠。",
  },
  {
    id: 35, dim: "composition", week: 9, level: 2,
    q: "主体放正中央什么时候最有效？",
    options: ["任何时候都行", "街头抓拍", "对称、仪式感、极简场景", "群像合影"],
    answer: 2,
    explain: "中央构图的力量来自对称与稳定；一般场景下会显得呆板。",
  },
  {
    id: 36, dim: "composition", week: 10, level: 1,
    q: "前景在风光构图里的主要作用是？",
    options: ["挡住地面杂物", "增加纵深与层次，把观众「带进」画面", "提高整体清晰度", "减小画面光比"],
    answer: 1,
    explain: "近景—中景—远景的层次靠前景建立，广角风光尤其依赖。",
  },
  {
    id: 37, dim: "composition", week: 11, level: 2,
    q: "负空间（大面积留白）的作用是？",
    options: ["突出主体、给画面呼吸感", "显得画面很空", "增加信息量", "提高锐度"],
    answer: 0,
    explain: "留白让主体更醒目，也是情绪（孤独/安静）的语言。",
  },
  {
    id: 38, dim: "composition", week: 12, level: 1,
    q: "竖构图最适合表达？",
    options: ["广阔的地平线", "纵向延伸：全身人像、瀑布、建筑高度", "多人群像", "桌面俯拍"],
    answer: 1,
    explain: "画幅方向跟着主体的走向走：横就横，竖就竖。",
  },
  {
    id: 39, dim: "composition", week: 9, level: 3,
    q: "画面「配重」的合理做法是？",
    options: ["两侧元素必须一样大", "用小而亮/强的元素平衡大而暗的区域", "全部元素放同一侧", "裁掉所有多余元素"],
    answer: 1,
    explain: "视觉重量看亮暗、大小、清晰度、人脸与文字，不必面积对等。",
  },
  {
    id: 40, dim: "composition", week: 10, level: 2,
    q: "重复图案构图的张力来自哪里？",
    options: ["图案绝对规则", "色彩最乱的一块", "规则中被打破的那一个元素", "对比度最高处"],
    answer: 2,
    explain: "大面积重复 + 一个「异类」，视线自然被锁定——是节奏感的来源。",
  },
  {
    id: 41, dim: "composition", week: 11, level: 2,
    q: "组照拍摄中重复机位、重复景别的后果是？",
    options: ["风格更统一", "信息冗余，编辑时只能弃用", "更有冲击力", "方便排版"],
    answer: 1,
    explain: "系列靠信息量递进；重复=浪费快门，编辑时是最先被淘汰的一批。",
  },
  {
    id: 42, dim: "composition", week: 12, level: 2,
    q: "极简构图的要点是？",
    options: ["元素多而均衡", "一个主体 + 大面积简洁空间", "高饱和色彩", "广角变形夸张"],
    answer: 1,
    explain: "做减法：画面里每个元素都要回答「为什么在」。",
  },
  {
    id: 43, dim: "light", week: 13, level: 1,
    q: "正午顶光拍人像的主要问题？",
    options: ["色温太低", "对不上焦", "眼窝鼻下阴影重，显疲惫", "噪点变高"],
    answer: 2,
    explain: "顶光在脸上打出「熊猫影」；要么躲阴影、要么反光板/跳闪补、要么改时段。",
  },
  {
    id: 44, dim: "light", week: 14, level: 2,
    q: "逆光人像头发边缘那圈亮边是？",
    options: ["溢出失误", "白平衡错误", "镜头眩光", "轮廓光，可用来把主体从背景里分离出来"],
    answer: 3,
    explain: "轮廓光是逆光的礼物；配合点测光/补光把面部亮度找回来。",
  },
  {
    id: 45, dim: "light", week: 15, level: 1,
    q: "阴天的光线特点？",
    options: ["巨大柔光箱：柔和、均匀、低对比", "硬光强对比", "色温偏冷到无法拍摄", "只适合拍黑白"],
    answer: 0,
    explain: "云层把太阳变成面光源，是人像友好的天然柔光，只是方向感弱。",
  },
  {
    id: 46, dim: "light", week: 16, level: 2,
    q: "闪光同步速度指的是？",
    options: ["闪光灯回电时间", "闪光能配合的最高快门速度", "ISO 上限", "连拍速度"],
    answer: 1,
    explain: "快门快过同步速度时快门帘会挡住闪光；要更高快门同步需高速同步（HSS）。",
  },
  {
    id: 47, dim: "light", week: 13, level: 1,
    q: "黄金时刻之后、天全黑之前的那段光叫？",
    options: ["蓝调时刻", "魔鬼时刻", "白平衡时刻", "绿调时刻"],
    answer: 0,
    explain: "蓝调时刻天空呈深蓝，配城市灯光是夜景蓝金的来源。",
  },
  {
    id: 48, dim: "light", week: 15, level: 2,
    q: "窗口光拍人像，人离窗越远会？",
    options: ["光越柔越亮", "光越硬越暗", "没有变化", "色温越冷"],
    answer: 1,
    explain: "点光源化程度随距离增加：光衰减且方向性变强（相对变小）。",
  },
  {
    id: 49, dim: "light", week: 14, level: 2,
    q: "反光板银面与白面的区别？",
    options: ["银面反射更强、方向性明显；白面更柔和", "银面更柔和，白面更强", "两者一样", "只差一点色温"],
    answer: 0,
    explain: "银面「硬」，补光远且亮；白面接近皮肤本色的柔补。",
  },
  {
    id: 50, dim: "light", week: 16, level: 3,
    q: "「压光」（闪光压日光）的核心思路？",
    options: ["提高 ISO 提亮人物", "用连拍抓瞬间", "关闭闪光改用反光板", "闪光把人物打亮，快门/光圈按背景测光把环境压暗"],
    answer: 3,
    explain: "环境由快门控制，人物由闪光控制——两套曝光各管各的。",
  },
  {
    id: 51, dim: "color", week: 7, level: 1,
    q: "白平衡本质上校正的是？",
    options: ["画面构图", "光源色温带来的色偏", "噪点分布", "曝光亮度"],
    answer: 1,
    explain: "把「光是什么颜色」拉回中性；创作时也可以故意不校，保留氛围。",
  },
  {
    id: 52, dim: "color", week: 21, level: 2,
    q: "后期大幅提亮阴影最容易引入？",
    options: ["色散", "噪点与色斑", "紫边", "摩尔纹"],
    answer: 1,
    explain: "暗部信噪比最低，拉亮=放大噪点；ETTR 拍对，后期就不用硬拉。",
  },
  {
    id: 53, dim: "color", week: 21, level: 2,
    q: "HSL 里把「橙色」亮度提高，通常直接影响？",
    options: ["人物肤色变亮", "天空变亮", "草地变亮", "白墙变亮"],
    answer: 0,
    explain: "肤色主要落在橙/黄区，动橙色亮度是最常用的提亮肤色手段。",
  },
  {
    id: 54, dim: "color", week: 22, level: 2,
    q: "sRGB 与 AdobeRGB 的关系？",
    options: ["AdobeRGB 色域更广；网络发布一般仍导出 sRGB", "sRGB 色域更广", "两者没有区别", "AdobeRGB 是一种压缩格式"],
    answer: 0,
    explain: "广色域用于印刷/后期空间；网页不解广色域，乱发会发灰。",
  },
  {
    id: 55, dim: "color", week: 7, level: 2,
    q: "日落直出照片常偏暖，想保留氛围该怎么做白平衡？",
    options: ["大力校正成中性", "全转黑白回避问题", "保留一定暖调，只把肤色校正常", "再加饱和度"],
    answer: 2,
    explain: "色温是情绪工具：环境保留暖调，人脸单独校正，两全。",
  },
  {
    id: 56, dim: "color", week: 21, level: 3,
    q: "「先定曝光再调色」的顺序原因是？",
    options: ["软件流程要求", "曝光决定各通道分布，基调不对时调色全歪", "色彩无关紧要", "其实顺序无所谓"],
    answer: 1,
    explain: "曝光移动直方图，色相/饱和建立在亮度之上；先正后美。",
  },
  {
    id: 57, dim: "color", week: 22, level: 2,
    q: "网络分享用 JPEG 的合理输出规格？",
    options: ["固定 800px 长边", "必须 100% 原尺寸", "越大越好", "视用途一般 2000–4000px 长边 + 输出锐化"],
    answer: 3,
    explain: "尺寸跟着用途走：社媒 2000px 级足够，留展签/印刷再上原尺寸。",
  },
  {
    id: 58, dim: "color", week: 21, level: 1,
    q: "分离色调（高光/阴影分别染色）常用来做什么？",
    options: ["修正镜头畸变", "提高清晰度", "降噪", "营造统一的整体色调（电影感）"],
    answer: 3,
    explain: "高光暖阴影冷等经典套路，靠分离色调把全片色彩「焊」在一起。",
  },
  {
    id: 59, dim: "method", week: 17, level: 2,
    q: "街头摄影的「狩猎」与「钓鱼」分别指？",
    options: ["主动游走找画面 / 守着好背景等人物入画", "白天拍 / 晚上拍", "彩色 / 黑白", "单张 / 连拍"],
    answer: 0,
    explain: "两种工作方式各有场景：狩猎靠脚力，钓鱼靠预判和耐心。",
  },
  {
    id: 60, dim: "method", week: 18, level: 2,
    q: "开始一个拍摄专题（项目）最先要定的是？",
    options: ["器材清单", "发布平台", "主题与边界：拍什么、不拍什么", "预算"],
    answer: 2,
    explain: "边界越清楚，选片越果断，专题才不会散掉。",
  },
  {
    id: 61, dim: "method", week: 19, level: 2,
    q: "对「决定性瞬间」，连拍的正确用法是？",
    options: ["替代思考，见啥拍啥", "保底捕捉动作峰值，但仍靠预判按下关键那张", "为了省存储", "提高像素"],
    answer: 1,
    explain: "连拍是保险丝不是引擎；先预判，再用连拍兜住峰值。",
  },
  {
    id: 62, dim: "method", week: 23, level: 3,
    q: "9 张组照的排序应该？",
    options: ["有节奏：开场定调—展开—收尾", "随机排", "最强的全放前面", "按拍摄时间乱排"],
    answer: 0,
    explain: "组照是编辑出来的叙事，不是幻灯片堆；节奏感就是顺序设计。",
  },
  {
    id: 63, dim: "method", week: 23, level: 2,
    q: "作品集选片最该避免的是？",
    options: ["风格统一", "少而精", "「再放一张凑数」的重复片", "有明确主题"],
    answer: 2,
    explain: "一张弱片拉低整组的印象分；宁缺毋滥是选片铁律。",
  },
  {
    id: 64, dim: "method", week: 24, level: 2,
    q: "建立个人风格最有效的路径？",
    options: ["追热门滤镜", "大量刻意练习 + 稳定重复的视觉语言", "器材堆料", "只拍别人拍过的机位"],
    answer: 1,
    explain: "风格=一致的选择。反复回答「我看重什么」，并让它在作品里重复出现。",
  },
  {
    id: 65, dim: "method", week: 17, level: 1,
    q: "街头拍陌生人的礼貌做法？",
    options: ["主动微笑示意、必要时征得同意，尊重拒绝", "拍完就跑", "偷拍不告知", "一律长焦远处偷拍"],
    answer: 0,
    explain: "街头有街头的伦理：公开场合拍摄合法，但尊重让人拍得到更好的照片。",
  },
  {
    id: 66, dim: "method", week: 24, level: 3,
    q: "定期复盘作品时最该关注？",
    options: ["社交媒体点赞数", "文件大小与数量", "自己的重复错误与进步轨迹", "快门次数"],
    answer: 2,
    explain: "复盘找的是模式：反复犯的错=下一个训练项；反复做对的=风格雏形。",
  },
];

// 每次加载洗牌选项顺序并同步重排 answer 索引。
// 原先正确答案 17/18 集中在 B，全选 B 即可得高分，诊断失真。
// 洗牌只在加载时做一次，弹层渲染与计分读的是同一份顺序，会话内保持一致。
(function shuffleQuizOptions() {
  for (const q of QUIZ_BANK) {
    const order = q.options.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const correct = q.options[q.answer];
    q.options = order.map((i) => q.options[i]);
    q.answer = q.options.indexOf(correct);
  }
})();

/**
 * 能力诊断 — 题库 + 作品基线 + 起点推荐
 * 作品只做「首次定性基线」；日常再测只跑题库，分数与已存基线融合。
 * answer 约定：0-3 = 选项 A-D；-1 = 不懂（知识缺口，不算猜错）
 */
const BASELINE_STORE_KEY = "lightjournal.baseline";

/** 诊断抽题：每维均衡抽取，题目顺序交错打乱。题库扩到 66 题后避免一次答 66 题。 */
function pickDiagnosticSet(perDim = 3) {
  const dims = Object.keys(QUIZ_DIMENSIONS);
  const picked = [];
  for (const dim of dims) {
    const pool = QUIZ_BANK.filter((q) => q.dim === dim);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    picked.push(...pool.slice(0, Math.min(perDim, pool.length)));
  }
  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [picked[i], picked[j]] = [picked[j], picked[i]];
  }
  return picked;
}

function loadBaseline() {
  try {
    return JSON.parse(localStorage.getItem(BASELINE_STORE_KEY) || "null");
  } catch {
    return null;
  }
}

function saveBaseline(data) {
  localStorage.setItem(
    BASELINE_STORE_KEY,
    JSON.stringify({ ...data, savedAt: new Date().toISOString() })
  );
}

function clearBaseline() {
  localStorage.removeItem(BASELINE_STORE_KEY);
}

function buildAssessment({ quizAnswers, photoResults, baseline, questions = QUIZ_BANK }) {
  const UNKNOWN = -1;
  const livePhotos = photoResults && photoResults.length ? photoResults : null;
  const useBaseline = baseline || (livePhotos ? null : loadBaseline());

  // 若本次传了新照片（建基线），优先用本次；否则用历史基线
  const photoSource = livePhotos ? { type: "live", results: livePhotos } : useBaseline ? { type: "stored", baseline: useBaseline } : null;

  const dimStats = {};
  for (const key of Object.keys(QUIZ_DIMENSIONS)) {
    dimStats[key] = { correct: 0, wrong: 0, unknown: 0, total: 0, name: QUIZ_DIMENSIONS[key].name };
  }

  let correct = 0;
  let wrong = 0;
  let unknown = 0;
  for (const q of questions) {
    const pick = quizAnswers[q.id];
    const d = dimStats[q.dim];
    d.total++;
    if (pick === undefined || pick === null || pick === UNKNOWN) {
      d.unknown++;
      unknown++;
    } else if (pick === q.answer) {
      d.correct++;
      correct++;
    } else {
      d.wrong++;
      wrong++;
    }
  }

  const dimScores = {};
  for (const [k, v] of Object.entries(dimStats)) {
    if (!v.total) {
      dimScores[k] = 0;
      continue;
    }
    const score = (v.correct + v.unknown * 0.4) / v.total;
    dimScores[k] = Math.round(score * 100);
  }

  // 照片维度
  const photoAgg = {
    composition: 0,
    exposure: 0,
    color: 0,
    light: 0,
    sharpness: 0,
    balance: 0,
  };
  let photoAvg = null;

  if (photoSource && photoSource.type === "live") {
    const results = photoSource.results;
    for (const key of Object.keys(photoAgg)) {
      const vals = results
        .map((p) => {
          const d = (p.dims || []).find((x) => x.key === key);
          return d ? d.score : null;
        })
        .filter((v) => typeof v === "number")
        .sort((a, b) => a - b);
      photoAgg[key] = trimmedMean(vals);
    }
    photoAvg = trimmedMean(results.map((p) => p.overall).sort((a, b) => a - b));
  } else if (photoSource && photoSource.type === "stored") {
    Object.assign(photoAgg, photoSource.baseline.photoAgg || {});
    photoAvg = photoSource.baseline.photoAvg ?? null;
  }

  const hasPhotos = photoSource != null;

  // 综合能力：题 55% + 照片 45%（有照片时）
  function blend(quizScore, photoScore) {
    if (!hasPhotos) return quizScore;
    return Math.round(quizScore * 0.55 + photoScore * 0.45);
  }

  const overallMap = {
    exposure: blend(dimScores.exposure, photoAgg.exposure),
    depth: dimScores.depth, // 照片里没有专门景深维，下方按 题60% + 清晰度40% 融合
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
  // 得分：正确 1 分，不懂 0.4 分，猜错 0 分
  const quizAvg = Math.round(((correct + unknown * 0.4) / questions.length) * 100);
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

  // 错题 + 知识缺口
  const wrongList = questions.filter((q) => {
    const pick = quizAnswers[q.id];
    return pick !== undefined && pick !== null && pick !== UNKNOWN && pick !== q.answer;
  }).map((q) => ({
    type: "wrong",
    q: q.q,
    explain: q.explain,
    dim: QUIZ_DIMENSIONS[q.dim].name,
  }));

  const unknownList = questions.filter((q) => {
    const pick = quizAnswers[q.id];
    return pick === undefined || pick === null || pick === UNKNOWN;
  }).map((q) => ({
    type: "unknown",
    q: q.q,
    explain: q.explain,
    dim: QUIZ_DIMENSIONS[q.dim].name,
  }));

  return {
    quizCorrect: correct,
    quizWrong: wrong,
    quizUnknown: unknown,
    quizTotal: questions.length,
    quizAvg,
    photoAvg,
    combined,
    dimScores: overallMap,
    photoAgg,
    hasPhotos,
    baselineUsed: photoSource ? photoSource.type : null, // live | stored | null
    photoCount: livePhotos ? livePhotos.length : useBaseline ? useBaseline.photoCount || 0 : 0,
    startWeek,
    gaps,
    wrong: [...wrongList, ...unknownList],
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

/** 保存一次测验记录（最多 20 条） */
function saveQuizAttempt(result) {
  try {
    const key = "lightjournal.quizHistory";
    const list = JSON.parse(localStorage.getItem(key) || "[]");
    list.unshift({
      at: new Date().toISOString(),
      combined: result.combined,
      quizAvg: result.quizAvg,
      level: result.level,
      startWeek: result.startWeek,
      dims: result.dimScores,
    });
    localStorage.setItem(key, JSON.stringify(list.slice(0, 20)));
  } catch {
    /* ignore */
  }
}

function loadQuizAttempts() {
  try {
    return JSON.parse(localStorage.getItem("lightjournal.quizHistory") || "[]");
  } catch {
    return [];
  }
}

const gapAdvice = {
  exposure: "先练曝光三角与测光：同场景包围曝光，学会看直方图判断高光/暗部。",
  depth: "练习景深控制：同一主体改距离与光圈各拍一组，验证虚实变化。",
  composition: "每天 15 分钟三分法/引导线专项；拍完画出线再看是否成立。",
  light: "固定一个静物，在早/中/晚各拍一张，记录光位与影调。",
  color: "练白平衡与 HSL：同场景四种白平衡，再只调关键色后期一次。",
  method: "做一次 9 张组照选题（统一色调/画幅），或完成一次街头 30 张选 5。",
};

/** 去掉两端 15% 后的均值，用于 10–20 张作品的稳健统计 */
function trimmedMean(sortedAsc) {
  if (!sortedAsc || !sortedAsc.length) return 0;
  const n = sortedAsc.length;
  if (n <= 3) return Math.round(sortedAsc.reduce((a, b) => a + b, 0) / n);
  const cut = Math.max(0, Math.floor(n * 0.15));
  const slice = sortedAsc.slice(cut, n - cut);
  return Math.round(slice.reduce((a, b) => a + b, 0) / slice.length);
}
