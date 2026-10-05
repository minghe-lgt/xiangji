/* 课程与知识库数据 — 整合自纽摄教材 / Freeman《摄影师之眼》/ Peterson《理解曝光》/ B 站系统课结构 */

const STAGES = [
  {
    id: "s1",
    name: "入门",
    subtitle: "把相机从自动挡解放出来",
    weeks: [
      {
        week: 1,
        examples: [
            { src: "examples/w01-1.jpg", caption: "大光圈把背景串灯融成一团团光斑，孩子的眼睛依旧锐利——请看焦内与焦外的分界" },
            { src: "examples/w01-2.jpg", caption: "高速快门把倒下的红色液柱与四溅的液滴全部钉在半空——每一滴都清晰可数" },
            { src: "examples/w01-3.jpg", caption: "夜晚城市光线微弱，靠提高感光度才能手持成片——观察楼群灯光与暗部噪点的平衡" },
        ],
        title: "认识相机与曝光三角",
        theory: [
          "光圈：控制进光量与景深。f 值越小光圈越大，背景越虚。",
          "快门：控制进光时间与动态。1/60s 以下是手震高风险区。",
          "ISO：控制感光度。每升一档噪点增加，但弱光可用性提高。",
          "曝光三角：任一参数变化，其余至少一个必须补偿。",
        ],
        task: "同一静物，A 档拍一组光圈从 f/1.8 到 f/16；S 档拍一组快门从 1/1000 到 1/15；记录每张画面差异。",
        checkpoint: "能不看说明书说出三者各自改变什么，并在 10 秒内给出一组正确曝光组合。",
        reading: "纽摄教材 Unit 1 · Peterson《理解曝光》第 1 章",
        readPoints: [
          "带着问题读：为什么 f 值越小、光圈反而越大？",
          "把各档位『×2 进光』的等量关系表抄一遍——它是后面所有周的骨架",
          "Peterson 的思维顺序先记住：先决定要什么效果，再倒推参数",
        ],
        hours: "约 4–6 小时",
        quiz: [
          "不看相机，口算：室内窗边 f/2.8 时，ISO 400 该配多快的快门才算安全？",
          "把光圈从 f/4 调到 f/8，另外两个参数不变，画面亮度会怎样？需要谁来补偿？",
          "说出「大光圈」在画面上带来的两个可见变化。",
        ],
      },
      {
        week: 2,
        examples: [
            { src: "examples/w02-1.jpg", caption: "人物背对明亮窗户呈半剪影——正好演示点测光与逆光人像的+EV补偿思路" },
            { src: "examples/w02-2.jpg", caption: "白雪占满画面时相机会自动拍灰——白加黑减，需要+1到+2EV才能把雪拍白" },
            { src: "examples/w02-3.jpg", caption: "大面积深黑背景衬托一朵浅色大丽花——黑减，收-EV才能保住背景的深邃" },
        ],
        title: "测光模式与曝光补偿",
        theory: [
          "评价测光/矩阵测光：适合场景光比均匀时。",
          "点测光：只对小区域测光，逆光人像救星。",
          "曝光补偿（±EV）：告诉相机「你测错了，再亮/暗一点」。",
          "白加黑减：拍大面积雪/白墙要 +EV，拍黑色物体要 -EV。",
        ],
        task: "找一个逆光场景，用点测光对人脸测光连拍；再用评价测光 + 不同补偿值各拍 3 张对比。",
        checkpoint: "面对逆光人像，能从测光模式 + 补偿值得到面部正确曝光。",
        reading: "纽摄教材 Unit 2 · 测光与曝光控制",
        readPoints: [
          "测光表只有一个信条：把画面平均成中灰——理解这句，白加黑减就是自然推论",
          "点测光的取景范围示意图是重点，其他测光模式都是它的加权变体",
          "曝光补偿的每一格，都是对测光结论的一次人工纠正",
        ],
        hours: "约 4–6 小时",
        quiz: [
          "逆光拍人脸发黑，你只带机身出门，现场先改哪一个设置最有效？",
          "拍一片雪地，相机测光会偏亮还是偏暗？你该加 EV 还是减 EV？",
          "点测光测在人脸、评价测光整画面，两者在逆光下结果差多少档？",
        ],
      },
      {
        week: 3,
        examples: [
            { src: "examples/w03-1.jpg", caption: "AF-C连续对焦跟住迎面骑来的车手，人与车完全凝固清晰，背景被甩成模糊色块" },
            { src: "examples/w03-2.jpg", caption: "单点对焦精准落在虹膜上，瞳孔与睫毛纤毫毕现——请放大检查虹膜纹理的锐度" },
        ],
        title: "对焦系统与画质设置",
        theory: [
          "AF-S / 单次对焦：静态主体；AF-C / 连续对焦：运动主体。",
          "对焦点选择：单点精准，区域对焦抓运动，眼部对焦是人像利器。",
          "RAW vs JPEG：RAW 保留 12–14 bit 信息，后期容错远大于 JPEG。",
          "画质优先：永远用相机允许的最高分辨率 + 最低压缩。",
        ],
        task: "拍一组运动物体（行人/宠物）用 AF-C 连拍 10 张，统计合焦成功率；再用单点对焦拍静物对比。",
        checkpoint: "知道什么场景该切什么对焦模式，且默认拍摄格式为 RAW。",
        reading: "纽摄教材 Unit 1 · 对焦与画质",
        readPoints: [
          "AF-S 与 AF-C 的区别一句话：要不要『继续追着对』",
          "RAW 与 JPEG 的位深对比图值得放大细看",
          "跳过器材吹嘘，只精读对焦点选择策略那几页",
        ],
        hours: "约 4–5 小时",
        quiz: [
          "拍奔跑的小孩，对焦模式选 AF-S 还是 AF-C？为什么？",
          "为什么专业摄影师默认拍 RAW？给出两个具体理由。",
          "单点对焦、区域对焦、眼部对焦，各最适合什么场景？",
        ],
      },
      {
        week: 4,
        examples: [
            { src: "examples/w04-1.jpg", caption: "三脚架长曝光：车灯拉成红白两条光轨，静止的树木天空依然锐利——看动静对比" },
            { src: "examples/w04-2.jpg", caption: "手持夜景贴着安全快门拍，霓虹招牌与湿地倒影清晰不糊——注意光源没有抖动重影" },
        ],
        title: "持机、稳定与安全快门",
        theory: [
          "安全快门 ≈ 1/焦距（等效）。50mm 镜头手持不低于 1/50s。",
          "三点支撑：左手托镜筒、右手握柄、眼眉贴取景器。",
          "屏息快门：半按对焦 → 吸气 → 呼气初段按下。",
          "三脚架使用：关防抖、用快门线/延时、中轴尽量不升。",
        ],
        task: "室内弱光下手持拍 5 张 1/15s、5 张 1/60s、5 张 1/250s，放大 100% 看清晰度差异。",
        checkpoint: "能在 1/焦距 附近手持拍出 100% 放大可接受的照片。",
        reading: "纽摄教材 Unit 1 · 稳定与支撑",
        readPoints: [
          "安全快门是下限不是保险——书中会建议你再快一档",
          "持机姿势几页照着镜子练，比读十遍有用",
          "三脚架部分先记两条：关防抖；升中轴前先升管腿",
        ],
        hours: "约 4–5 小时",
        quiz: [
          "70mm 端手持拍，安全快门大约不低于多少？",
          "三脚架拍长曝，有哪两件事必须先关掉/改掉？",
          "为什么「半按对焦后屏住呼吸再按快门」有效？",
        ],
      },
    ],
  },
  {
    id: "s2",
    name: "基础",
    subtitle: "曝光、景深、色彩成为肌肉记忆",
    weeks: [
      {
        week: 5,
        examples: [
            { src: "examples/w05-1.jpg", caption: "雾气让大半画面亮成一片，直方图整体靠右但不顶格——高调曝光的典型形态" },
            { src: "examples/w05-2.jpg", caption: "从白色浓雾到黑色树影层层过渡——直方图铺满横轴、明暗层次丰富的理想范本" },
        ],
        title: "直方图与向右曝光",
        theory: [
          "直方图：左侧暗部 / 中间调 / 右侧高光，没有绝对「标准形状」。",
          "高光溢出（剪切）：右侧顶死且无信息，后期无法找回。",
          "ETTR（向右曝光）：在不剪切的前提下尽量多收集光子，噪点最少。",
          "曝光警告（斑马纹/闪烁高光）：拍摄时就该打开。",
        ],
        task: "拍一组 ±2EV 包围曝光 5 张，导入后只允许用曝光滑块救回，观察哪张细节最多。",
        checkpoint: "看直方图 3 秒判断是否需要补偿，且会用高光警告。",
        reading: "Peterson《理解曝光》第 2–3 章",
        readPoints: [
          "直方图只是亮度的『人口普查』，没有标准形状",
          "剪切警告亮起处 = 信息已死——这是唯一不可逆的曝光错误",
          "ETTR 一节多读两遍：向右，但绝不越过悬崖",
        ],
        hours: "约 5–7 小时",
        quiz: [
          "直方图全挤在最右侧且顶死，说明什么？后期还能救回来吗？",
          "什么是 ETTR？它降低噪点的原理是什么？",
          "「白加黑减」的场景举例各一个，并说出该补多少 EV。",
        ],
      },
      {
        week: 6,
        examples: [
            { src: "examples/w06-1.jpg", caption: "f/11小光圈下近处木栏、草地与远处山脊全部清晰——超焦距对焦带来的完整景深" },
            { src: "examples/w06-2.jpg", caption: "花瓣层层叠叠，只有中间一圈落在焦内，前后瞬间化开——微距焦平面薄如纸" },
        ],
        title: "景深与超焦距",
        theory: [
          "景深三要素：光圈、焦距、拍摄距离。距离影响最大。",
          "前景深约 1/3，后景深约 2/3——对焦点不一定是「最清晰处」。",
          "超焦距：对焦在该距离时，景深从一半到无穷远，适合风光。",
          "最大光圈 ≠ 最佳光圈：镜头在 f/5.6–f/11 往往最锐。",
        ],
        task: "同一场景分别改变光圈、焦距、距离各拍 3 组，记录景深变化并用图说明。",
        checkpoint: "能预判「这拍要多少景深」并给出正确的对焦点位置。",
        reading: "纽摄教材 Unit 2 · 镜头与景深",
        readPoints: [
          "记住 1/3–2/3 分割：对焦点永远不在景深正中",
          "超焦距表随画幅变化，查表前先确认自己的传感器尺寸",
          "『最佳光圈』一节专治『越缩越锐』的误区",
        ],
        hours: "约 5–7 小时",
        quiz: [
          "想让前景花和远山都清晰，对焦点该放在哪里？为什么？",
          "同样构图下，50mm f/2 离主体 1m，和 85mm f/2 离主体 2m，哪个景深更浅？",
          "镜头最大光圈常常不是最锐的光圈，一般收几档后最佳？",
        ],
      },
      {
        week: 7,
        examples: [
            { src: "examples/w07-1.jpg", caption: "钨丝灯把铜罩灯泡染成橙黄，整个画面偏暖——这就是低色温光源的烙印" },
            { src: "examples/w07-2.jpg", caption: "雪林被黎明蓝调统一成冷青色，高色温环境下相机若不校正，画面就会整体偏蓝" },
        ],
        title: "白平衡与色温",
        theory: [
          "色温：低色温偏暖（烛光 ~2000K），高色温偏冷（阴影 ~8000K+）。",
          "白平衡的作用：让白色呈白，或刻意制造色彩情绪。",
          "自定义白平衡 / 灰卡：混合光源下的精准方案。",
          "RAW 下白平衡可无损调整，但拍摄时仍建议大致正确以判断气氛。",
        ],
        task: "同一室内场景，用日光/阴天/钨丝灯/自定义白平衡各拍 1 张，感受色彩情绪差异。",
        checkpoint: "知道什么场景该用什么白平衡，以及何时故意「用错」。",
        reading: "纽摄教材 Unit 2 · 色彩与白平衡",
        readPoints: [
          "K 值越高光越蓝，和体感温度相反——先接受这个反直觉",
          "白平衡的本质：告诉相机『哪块是中性色』",
          "RAW 的白平衡只是标注，事后可改——这是 W3 选择的回报",
        ],
        hours: "约 4–6 小时",
        quiz: [
          "日光白平衡下拍钨丝灯环境，照片会偏什么色？",
          "RAW 格式下白平衡可以后期改，为什么拍摄时仍建议设对？",
          "想故意制造「冷暖对比」，可以在哪个环节下手？",
        ],
      },
      {
        week: 8,
        examples: [
            { src: "examples/w08-1.jpg", caption: "A档街头抓拍：光圈管住景深，主体行人清晰、背景店铺可辨，雨天地面反光增添层次" },
            { src: "examples/w08-2.jpg", caption: "拍完回看屏幕：检查曝光、对焦与构图再离开，这是拍摄流程里最关键的一步" },
        ],
        title: "曝光模式与拍摄流程",
        theory: [
          "A/Av：光圈优先——控制景深的首选。",
          "S/Tv：快门优先——控制动态模糊的首选。",
          "M：手动——光比稳定、影棚、夜景长曝。",
          "AUTO ISO + 最低快门：街头与纪实的高效配置。",
        ],
        task: "一次外出拍摄只用一种模式拍完 30 张；下次换另一模式。写 100 字对比感受。",
        checkpoint: "能为三种场景（人像/风光/运动）各选出最合适的拍摄模式并说明原因。",
        reading: "Peterson《理解曝光》第 2–3 章 · 光圈优先/快门优先的创造性使用",
        readPoints: [
          "A/S/M/P 只差『你亲手负责哪个变量』",
          "书里的实战顺序：光圈定景深 → 快门保安全 → ISO 兜底",
          "手动挡不是高手徽章，是稳定光位下的效率工具",
        ],
        hours: "约 5–7 小时",
        quiz: [
          "拍瀑布想「拉丝」，你优先锁哪个参数？用什么拍摄模式？",
          "街头抓拍常用 AUTO ISO + 最低快门，好处是什么？",
          "人像、风光、运动各举一个你最可能用的模式并说明理由。",
        ],
      },
    ],
  },
  {
    id: "s3",
    name: "构图",
    subtitle: "把「看见」变成「安排」",
    weeks: [
      {
        week: 9,
        examples: [
            { src: "examples/w09-1.jpg", caption: "日落海面把地平线压在下三分线上，天海比例二比一，画面安定而不呆板" },
            { src: "examples/w09-2.jpg", caption: "人物放在右侧三分线并望向画外留白，视线方向有了呼吸空间，主体立刻不再拥挤" },
        ],
        title: "构图三原则与三分法",
        theory: [
          "简化：减掉一切不服务主题的元素（Freeman「减法」）。",
          "聚焦注意力：对比、色彩、清晰度、光线都能引导视线。",
          "隔离主体：用景深、框、负空间让主体跳出来。",
          "三分法：把主体放交点，地平线放上/下三分线——最安全的起点。",
        ],
        task: "拍 20 张刻意三分法构图，回家选出 3 张并画出三分线说明为何成功。",
        checkpoint: "不看网格也能凭感觉把主体放到接近三分点。",
        reading: "纽摄教材 Unit 3 · Freeman《摄影师之眼》第 1 章",
        readPoints: [
          "Freeman 的『意图先行』：一切法则都服务于『想让观众先看哪』",
          "三分法章节连反例一起读——知道什么时候该打破它",
          "把『主体与背景的关系』当作第一考虑",
        ],
        hours: "约 5–8 小时",
        quiz: [
          "不看照片，说出「减法原则」的三个常见可删元素。",
          "地平线该放在上三分线还是下三分线？判断依据是什么？",
          "三分法交点上的主体，比正中心的主体，视觉上多了什么？",
        ],
      },
      {
        week: 10,
        examples: [
            { src: "examples/w10-1.jpg", caption: "车道白线把视线笔直引向灭点，两侧旷野收拢，引导线让平面照片有了纵深感" },
            { src: "examples/w10-2.jpg", caption: "用装饰拱门当画框，把远处亮门套进框里，框架式构图让主体聚焦、层次立现" },
            { src: "examples/w10-3.jpg", caption: "从楼梯井垂直俯拍，台阶与扶手旋成完美螺旋，眼睛顺着曲线一路滑向圆心" },
        ],
        title: "引导线、框架与几何",
        theory: [
          "引导线：道路、栏杆、光影、河流把视线引向主体。",
          "框架构图：门窗、树枝、拱廊形成「画中画」。",
          "几何：三角形稳定、对角线张力、S 形柔和。",
          "对称：建筑/水面适合严格对称；轻微打破更有趣。",
        ],
        task: "城市步行 2 小时，分别找 5 张引导线、5 张框架、5 张几何，标注类型。",
        checkpoint: "在杂乱场景中 30 秒内找到可利用的线条或框架。",
        reading: "Freeman《摄影师之眼》第 2 章 · 几何",
        readPoints: [
          "引导线的力量来自指向性，线条本身不加分",
          "框架构图注意框也要有层次，别拍成贴邮票",
          "对角线与三角那几页的图例，值得逐张临摹式分析",
        ],
        hours: "约 5–8 小时",
        quiz: [
          "在杂乱街道里，30 秒内你按什么顺序找「线」？",
          "框架构图除了锁视线，还有一个什么结构上的好处？",
          "对称场景里「轻微打破对称」为什么反而更好看？",
        ],
      },
      {
        week: 11,
        examples: [
            { src: "examples/w11-1.jpg", caption: "前景的水草把镜头前的一米拉进画面，与雪山倒影形成远近呼应，纵深感由此而来" },
            { src: "examples/w11-2.jpg", caption: "两只小鸟只占画面百分之一，大片灰空成了负空间，极简构图靠留白讲孤独感" },
        ],
        title: "视觉重心、平衡与前景",
        theory: [
          "视觉重量：亮 > 暗、大 > 小、清晰 > 模糊、暖 > 冷、人脸/文字最强。",
          "平衡：主体偏一侧时，用配重元素（人、色块、文字）稳住另一侧。",
          "前景层次：近-中-远三层建立纵深，避免「平面贴图」。",
          "负空间：大面积留白突出单一主体，少即是多。",
        ],
        task: "拍一组「有前景」和一组「无前景」对比；再拍 5 张故意偏心构图并说明配重。",
        checkpoint: "能判断一张照片是「稳定的」还是「失衡的」，并说出原因。",
        reading: "Freeman《摄影师之眼》第 3 章 · 视觉重量",
        readPoints: [
          "亮度、大小、清晰度、人脸——给画面配重的四把秤",
          "前景的三种作用，这一章讲得比任何短视频都透",
          "平衡不等于对称，书里有大量不对称配重案例",
        ],
        hours: "约 5–8 小时",
        quiz: [
          "画面右边一个大深色块，左边空着——怎么配重最自然？",
          "为什么加入前景会立刻产生纵深？用近大远小解释。",
          "「亮的比暗的重」——举两个你可以立刻用的例子。",
        ],
      },
      {
        week: 12,
        examples: [
            { src: "examples/w12-1.jpg", caption: "弧线塔楼层叠盘旋，条纹随曲线流动，视线被螺旋弧面带着走，正是黄金螺旋的味道" },
            { src: "examples/w12-2.jpg", caption: "行人缩成一粒墨点落在巨大曲面下，重心偏到一角却稳稳站住——打破常规的平衡" },
        ],
        title: "黄金比例与个人构图习惯",
        theory: [
          "黄金分割 / 斐波那契螺旋：比三分法更「有机」的焦点放置。",
          "中央构图：对称、极简、庄严感——不是错误，是选择。",
          "开放式构图：主体被裁切，暗示画外空间。",
          "构图是服务主题的工具，不是教条。",
        ],
        task: "同一场景用三分法、中央、开放式各拍 1 张；写下三种各自传达的情绪。",
        checkpoint: "能有意识地选择构图方式，而不是「碰巧拍到」。",
        reading: "Freeman《摄影师之眼》第 4 章 · 构图的语法",
        readPoints: [
          "黄金螺旋当参考、别当圣经——硬套只会僵硬",
          "个人构图习惯 = 给自己立可重复的规矩",
          "这一章适合带着相机边拍边读",
        ],
        hours: "约 5–8 小时",
        quiz: [
          "三分法和黄金螺旋，什么题材更吃螺旋？",
          "中央构图在什么情绪下反而是正确选择？",
          "开放式构图（主体被裁切）在暗示什么？",
        ],
      },
    ],
  },
  {
    id: "s4",
    name: "用光",
    subtitle: "光线是照片的真正画笔",
    weeks: [
      {
        week: 13,
        examples: [
            { src: "examples/w13-1.jpg", caption: "柔和的窗光从侧面轻扫面部，明暗过渡没有生硬边缘——软光让皮肤质感更细腻" },
            { src: "examples/w13-2.jpg", caption: "人物完全压成黑色剪影，只保留轮廓；天空越亮剪影越干脆，逆光位决定一切" },
            { src: "examples/w13-3.jpg", caption: "正午顶光把行人影子压得又黑又实，影子边缘锋利——硬光的力量感全在投影上" },
        ],
        title: "光质与光位",
        theory: [
          "硬光（直射日光/裸灯）：高反差、边缘锐利、戏剧感。",
          "软光（阴天/柔光箱/窗光）：过渡细腻、皮肤友好。",
          "光位：顺光平淡、侧光塑形、侧逆光轮廓、逆光剪影。",
          "光比：亮部与暗部的强度比，决定后期与风格。",
        ],
        task: "同一静物/人脸，在正午硬光、阴天软光、窗边侧光下各拍一组，标注光位。",
        checkpoint: "看照片能说出主光方向与光质（硬/软）。",
        reading: "纽摄教材 Unit 4 · 光线",
        readPoints: [
          "顺光平、侧光立、逆光勾——每个字配一张书里图来记",
          "光比是明暗反差的量化，先学会看，再学控",
          "柔硬光的本质只有一句：光源相对面积大小",
        ],
        hours: "约 5–8 小时",
        quiz: [
          "看一张成片，你从哪三个线索判断主光方向？",
          "硬光和软光在人像皮肤上分别留下什么痕迹？",
          "光比太大、阴影死黑，拍摄现场有哪三种降低光比的办法？",
        ],
      },
      {
        week: 14,
        examples: [
            { src: "examples/w14-1.jpg", caption: "太阳贴近地平线，金色低角度光把整片草场染成暖黄——黄金时刻的色温与长影" },
            { src: "examples/w14-2.jpg", caption: "日落后天空呈深邃蓝色，城市灯光与蓝调形成冷暖对比——蓝调时刻只有二十分钟" },
        ],
        title: "黄金时刻与蓝调时刻",
        theory: [
          "黄金时刻：日出后 / 日落前 1 小时，光线低角度、色温暖、阴影长。",
          "蓝调时刻：日落后 20–40 分钟，天光冷蓝，适合城市灯光。",
          "阴天是「天然柔光箱」，最适合人像与静物。",
          "正午顶光：找阴影、用反光板，或干脆拍剪影。",
        ],
        task: "连续 3 天在同一地点拍黄金时刻与蓝调时刻，比较色温与氛围。",
        checkpoint: "知道拍摄题材对应的最佳时段，并愿意为光线出门。",
        reading: "Peterson《理解曝光》· 光线部分：方向、质感与色温的实际运用",
        readPoints: [
          "色温随太阳高度变化的曲线是这章核心，记走势不记数字",
          "蓝调时刻的窗口比想象中短——提前踩点",
          "反差最猛的时刻往往不是最好看的时刻",
        ],
        hours: "约 5–8 小时",
        quiz: [
          "黄金时刻大约在日出/日落前后多久？光线特点是什么？",
          "蓝调时刻拍城市，为什么天和灯的亮度会刚好平衡？",
          "正午顶光拍人像，不补光的前提下最好的两个替代方案是？",
        ],
      },
      {
        week: 15,
        examples: [
            { src: "examples/w15-1.jpg", caption: "夜景里主体被街灯补光照亮，背景灯串化作光斑保留夜色——补光足、夜景不丢" },
            { src: "examples/w15-2.jpg", caption: "昏暗室内只给面部一点补光，肤色干净、背景自然压暗——弱光人像的关键是面部曝光" },
        ],
        title: "闪光灯与补光基础",
        theory: [
          "TTL：自动闪光，适合快速抓拍；M 档闪光：影棚与可控场景。",
          "闪光同步速度：通常 1/200s，高速同步可突破。",
          "跳闪 / 柔光：让硬光变软的最实用技巧。",
          "反光板：银面增亮、白面柔和、金面暖调、黑面吸光。",
        ],
        task: "室内人像/静物：直闪、跳闪、反光板补光各拍一组，比较质感。",
        checkpoint: "能用最简单的灯 + 反光板把人脸拍立体。",
        reading: "纽摄教材 Unit 4 · 人工光",
        readPoints: [
          "先学灯的位置，再学功率——位置决定一切",
          "跳闪那几页值回书价",
          "同步速度的限制是物理性的，不是厂商刁难",
        ],
        hours: "约 5–8 小时",
        quiz: [
          "直闪和跳闪，哪个皮肤质感更好？为什么？",
          "反光板的银面和白面，补光效果有什么差别？",
          "什么情况下必须用闪光灯 M 档而不是 TTL？",
        ],
      },
      {
        week: 16,
        examples: [
            { src: "examples/w16-1.jpg", caption: "大面积黑背景配侧光，半张脸隐入阴影——低调影调靠光比营造沉静与神秘" },
            { src: "examples/w16-2.jpg", caption: "整幅画面近乎全白，雪丘只有柔和的浅影勾勒起伏——高调要亮而不曝、影少而柔" },
        ],
        title: "影调与情绪",
        theory: [
          "高调（High Key）：大面积亮部，轻盈、纯净、商业感。",
          "低调（Low Key）：大面积暗部，神秘、戏剧、肖像感。",
          "中间调：日常、平实、纪实感。",
          "影调服务于情绪，不是技术炫耀。",
        ],
        task: "用同一主体分别拍出高调、低调、中间调三张，写下各自想表达的情绪。",
        checkpoint: "能在按下快门前决定「这张要什么影调」。",
        reading: "Freeman《摄影师之眼》第 5 章 · 光与影调",
        readPoints: [
          "高调低调是大面积的取舍，不是曝光加减",
          "影调决定情绪：先想情绪，再定影调",
          "对照书中同场景不同影调的组图反复看",
        ],
        hours: "约 5–7 小时",
        quiz: [
          "高调（High Key）画面的直方图大致长什么样？",
          "拍一张「神秘感」肖像，你会怎么安排光比和背景？",
          "为什么说影调要「服务情绪」，而不是技术炫技？",
        ],
      },
    ],
  },
  {
    id: "s5",
    name: "题材",
    subtitle: "在真实场景里综合运用",
    weeks: [
      {
        week: 17,
        examples: [
            { src: "examples/w17-1.jpg", caption: "孤峰立在云海之上，日出暖光染红峰顶——云海的层次和粉色渐变天空就是纵深" },
            { src: "examples/w17-2.jpg", caption: "慢门把海浪拉成白色丝绢绕过礁石，水面雾化岩石清晰——长曝光让动静同框" },
        ],
        title: "风光摄影",
        theory: [
          "前景 + 中景 + 远景三层结构是风光的骨架。",
          "滤镜：CPL 消反光/加深天空，GND 平衡天光地景，ND 长曝流水流云。",
          "全景拼接与景深合成（focus stacking）进阶技巧。",
          "尊重自然：不留垃圾，不破坏环境。",
        ],
        task: "完成一组 9 张风光组照：至少含前景、倒影、长曝各 1 张。",
        checkpoint: "能用超焦距或景深合成得到从前景到无穷远清晰的风光片。",
        reading: "Galen Rowell《Mountain Light（山岳之光）》· 风光用光与等待的经典",
        readPoints: [
          "风光的本质是等：等光、等云、等季节",
          "前景—中景—远景的层次安排贯穿全章",
          "滤镜一节结合 W8 的 ND 知识一起看",
        ],
        hours: "约 6–8 小时",
        quiz: [
          "风光片的「近中远」三层，分别负责什么？",
          "CPL 旋转时，画面哪两个地方变化最明显？",
          "ND 镜拉丝流水，快门速度大概要慢到什么量级？",
        ],
      },
      {
        week: 18,
        examples: [
            { src: "examples/w18-1.jpg", caption: "人物倚在石桥上，公园绿意交代了周末出游的场景——环境人像靠场景与姿态共同叙事" },
            { src: "examples/w18-2.jpg", caption: "两人同时大笑并指向天空，动作和视线把观者引向画外——抓拍抢的是情绪高点" },
        ],
        title: "人像与叙事",
        theory: [
          "眼神光是人像的生命：让光源出现在眼睛前方。",
          "美姿：头肩角度、手的位置、身体三分之二朝向镜头。",
          "环境人像：环境是第二主角，交代身份与故事。",
          "引导比指令有效：「看窗外」比「笑一个」自然。",
        ],
        task: "拍 5 张环境人像（朋友/家人），每张配 20 字说明，至少 1 张逆光。",
        checkpoint: "能引导模特摆出自然姿态，并保证眼神光到位。",
        reading: "纽摄教材 Unit 4 · 人像",
        readPoints: [
          "人像的核心是关系，不是镜头",
          "眼神光的位置有讲究：光源略高于视线",
          "引导比摆姿重要——书里的沟通案例别跳过",
        ],
        hours: "约 6–8 小时",
        quiz: [
          "什么是眼神光？没有眼神光的人像会怎样？",
          "「引导」和「指令」的区别，各举一句台词。",
          "环境人像里环境的作用是什么？占画面多少合适？",
        ],
      },
      {
        week: 19,
        examples: [
            { src: "examples/w19-1.jpg", caption: "黄昏低角度光把行人影子拉成斜线，黑白里看光比、剪影与决定性瞬间如何同时成立" },
            { src: "examples/w19-2.jpg", caption: "摊贩推着水果车穿过斑马线，伞棚与人流构成市井纪实——看主体动作与环境交代的层次" },
        ],
        title: "街头与纪实",
        theory: [
          "决定性瞬间（布列松）：等待几何与事件同时对齐。",
          "盲拍 / 预对焦 / 超焦距：街头的三大武器。",
          "伦理：尊重被摄者，公共场合可拍，但不消费他人痛苦。",
          "系列思维：单张之外，开始想「这组在讲什么」。",
        ],
        task: "街头步行 2 小时，只用 35mm 或 50mm 等效焦距，拍 30 张选出 5 张组照。",
        checkpoint: "能在不惊扰的情况下完成街头抓拍，并选出有叙事的 5 张。",
        reading: "布列松《思想的眼睛》· 街头摄影伦理",
        readPoints: [
          "布列松的双条件：几何与事件同时成立，缺一不可",
          "预判点位：先构图，后等人",
          "伦理一节：『拍到』和『冒犯』之间的分寸值得讨论",
        ],
        hours: "约 6–8 小时",
        quiz: [
          "布列松「决定性瞬间」是哪两件事同时对齐？",
          "街拍用超焦距的好处是什么？",
          "公共场合拍人，你给自己定的伦理底线是什么？",
        ],
      },
      {
        week: 20,
        examples: [
            { src: "examples/w20-1.jpg", caption: "暗调俯拍：黑背景只留一盏侧光，食物与道具错落——看布光方向、负空间与色彩点缀" },
            { src: "examples/w20-2.jpg", caption: "两色背景墙前的产品队列，单灯造出柔和投影——看瓶身高光、背景分区与留白构图" },
        ],
        title: "静物、美食与产品",
        theory: [
          "窗光是免费的柔光箱：侧 45° 是最经典光位。",
          "背景简洁：亚麻、水泥、大理石、纯色卡纸。",
          "道具叙事：食材、餐具、手的介入讲故事。",
          "三角构图与重复构图在静物中极有效。",
        ],
        task: "在家拍 5 张美食/静物，至少用 2 种光位（侧光/逆光/顶光）。",
        checkpoint: "能用单一自然光 + 反光板拍出商业感静物。",
        reading: "《摄影用光》(Light Science & Magic) 静物与产品章 · 美食摄影用光解析",
        readPoints: [
          "静物是完全可控的训练场——画面里每样东西都是你摆的",
          "逆光对玻璃与液体的表现力，书里专节讲透",
          "小物件用大面积柔光，是静物布光第一原则",
        ],
        hours: "约 5–8 小时",
        quiz: [
          "窗光侧 45° 为什么是静物经典光位？",
          "美食摄影里「手的介入」在叙事上起什么作用？",
          "三角构图在静物里怎么摆才不呆板？",
        ],
      },
    ],
  },
  {
    id: "s6",
    name: "进阶",
    subtitle: "形成自己的眼睛与流程",
    weeks: [
      {
        week: 21,
        examples: [
            { src: "examples/w21-1.jpg", caption: "笔记本上的人像修图界面：直方图、调整面板与缩略图同屏——看后期流程在屏幕上如何展开" },
            { src: "examples/w21-2.jpg", caption: "双屏修图工作台：一屏浏览一屏调整，桌面还摆着胶片与镜头——看工作流的空间安排" },
        ],
        title: "后期流程（Lightroom/Camera Raw）",
        theory: [
          "全局：白平衡 → 曝光 → 高光/阴影 → 白色/黑色色阶 → 对比度。",
          "局部：径向滤镜、渐变滤镜、调整画笔塑形光影。",
          "HSL：只调关键色，避免整体饱和度失控。",
          "锐化与降噪：输出尺寸决定锐化量；AI 降噪是弱光救星。",
        ],
        task: "选 5 张 RAW，建立你自己的「一键基础调」预设，并写出 8 步固定流程。",
        checkpoint: "能在 5 分钟内完成一张照片的完整基础后期。",
        reading: "Scott Kelby《The Adobe Photoshop Lightroom Classic Book》· 跟着完整流程走一遍",
        readPoints: [
          "先定流程再谈手法：导入→筛选→全局→局部→输出",
          "RAW 显影面板的排布顺序，就是曝光逻辑的顺序",
          "预设是起点不是终点",
        ],
        hours: "约 6–10 小时",
        quiz: [
          "基础调片的正确顺序里，白平衡为什么在最前？",
          "「高光/阴影」和「白色/黑色色阶」有什么区别？",
          "HSL 里只调关键色的好处是什么？",
        ],
      },
      {
        week: 22,
        examples: [
            { src: "examples/w22-1.jpg", caption: "照片打印机正吐出一张黑白照片，旁置胶片相机——从拍摄到输出，纸张是色彩管理的终点" },
            { src: "examples/w22-2.jpg", caption: "扇形色卡铺满画面，色相与明度连续过渡——校色时对照它检查屏幕与输出的偏差" },
        ],
        title: "色彩管理与输出",
        theory: [
          "色域：sRGB 用于网络，Adobe RGB / Display P3 用于印刷与广色域屏。",
          "软打样：在打印前预览纸张与墨水的色彩损失。",
          "输出锐化：不同用途（屏幕/印刷）锐化策略不同。",
          "文件管理：统一命名、备份 3-2-1（3 份、2 种介质、1 份异地）。",
        ],
        task: "导出同一张照片的 sRGB 与 Adobe RGB 各一版，在不同设备上对比。",
        checkpoint: "知道作品发网络与送印刷分别该用什么色彩空间。",
        reading: "Jeff Schewe《The Digital Print》· 软打样与输出流程",
        readPoints: [
          "色域不匹配是『发灰』的第一嫌疑人",
          "导出对话框的每一项，这篇讲全了",
          "先理解为什么要校色，再谈校屏",
        ],
        hours: "约 6–8 小时",
        quiz: [
          "发朋友圈/图虫和送印刷，分别该用什么色彩空间？",
          "什么是软打样？解决什么问题？",
          "「3-2-1 备份」具体指什么？",
        ],
      },
      {
        week: 23,
        examples: [
            { src: "examples/w23-1.jpg", caption: "洗出来的照片摊在布上重新排布——组照编辑就是在这里决定顺序、取舍与节奏" },
            { src: "examples/w23-2.jpg", caption: "画廊墙上四幅装裱黑白照在射灯下，观展者背身而立——看成组展示的间距与视线高度" },
        ],
        title: "组照编辑与作品集",
        theory: [
          "编辑（Editing）是摄影的一半：选片比拍片更难。",
          "组照三要素：统一色调 / 统一画幅 / 统一叙事。",
          "节奏：大场景与特写交替，避免 9 张都是同一景别。",
          "作品集长度：入门 9–12 张足够，宁缺毋滥。",
        ],
        task: "从全部练习中选出 9 张，排成九宫格，写出 50 字作品阐述。",
        checkpoint: "能为自己的 9 张组照讲一个完整的小故事。",
        reading: "Robert Frank《美国人》编辑思路 · 作品集方法",
        readPoints: [
          "Frank 的编排是句子，不是单词堆——先看顺序再看单张",
          "开场定调、收尾留味",
          "删片的残忍程度，决定组照的高度",
        ],
        hours: "约 6–10 小时",
        quiz: [
          "组照的「三统一」是什么？",
          "9 张组照里全是同一景别，问题出在哪？",
          "编辑时最先删掉的是哪类片子？",
        ],
      },
      {
        week: 24,
        examples: [
            { src: "examples/w24-1.jpg", caption: "暮色里摄影师俯身调试三脚架上的相机，身旁还立着一支——持续练习就是无数个这样的傍晚" },
            { src: "examples/w24-2.jpg", caption: "深色桌面上的器材网格平铺：机身、镜头、电池分区归位——个人体系从清点自己的装备开始" },
        ],
        title: "个人风格与持续练习",
        theory: [
          "风格 = 反复出现的选择：题材、色彩、光位、构图偏好。",
          "模仿大师：选 3 位摄影师，各模仿 5 张，分析差异。",
          "长期项目：给自己一个 30 天 / 100 天主题。",
          "保持饥渴：审美提升靠看，不靠买器材。",
        ],
        task: "写一份 30 天拍摄计划（主题 + 频率 + 输出物），并完成第一周。",
        checkpoint: "能用一句话描述自己想拍什么、为什么拍。",
        reading: "自选 3 位摄影师作品集 · 长期项目方法论",
        readPoints: [
          "风格 = 可重复的选择，不是滤镜名",
          "做一次年度选片：50 张里看清自己",
          "长期项目是风格最好的孵化器",
        ],
        hours: "约 6–10 小时",
        quiz: [
          "用一句话描述你现阶段最想拍的主题。",
          "模仿大师时，应该重点模仿什么、避免什么？",
          "30 天项目里，「输出物」为什么比张数更重要？",
        ],
      },
    ],
  },
];

const READING_LIST = [
  { title: "纽约摄影学院摄影教材", author: "纽摄", note: "系统教材，打地基。不必一次读完，当工具书翻。", level: "入门→进阶", weeks: "W1–8 精读，之后备查" },
  { title: "理解曝光 (Understanding Exposure)", author: "Bryan Peterson", note: "把曝光三角讲得最直白的一本，薄而实用。", level: "入门", weeks: "W1 · W5" },
  { title: "摄影师之眼 (The Photographer's Eye)", author: "Michael Freeman", note: "构图与视觉组织的圣经，图例极多。", level: "基础→进阶", weeks: "W9–12 · W16" },
  { title: "摄影用光 (Light Science & Magic)", author: "Fil Hunter 等", note: "布光的教科书级经典；柔硬光、光位、静物产品布光讲得最系统。", level: "基础→进阶", weeks: "W13–16 · W20" },
  { title: "思想的眼睛 (The Mind's Eye)", author: "亨利·卡蒂埃-布列松", note: "决定性瞬间的本人阐述，比《明室》好进入；街头周前后读。", level: "进阶", weeks: "W19" },
  { title: "论摄影 (On Photography)", author: "Susan Sontag", note: "不教技术，教你看懂摄影这件事本身。选读。", level: "进阶", weeks: "不限 · 进阶选读" },
  { title: "The Americans", author: "Robert Frank", note: "学习组照编辑与街头情绪的范本；看顺序再看单张。", level: "进阶", weeks: "W23" },
  { title: "Mountain Light（山岳之光）", author: "Galen Rowell", note: "风光用光与「等待」的经典；山野光线如何变成画面。", level: "基础→进阶", weeks: "W14 · W17" },
  { title: "The Adobe Photoshop Lightroom Classic Book", author: "Scott Kelby", note: "跟着一本书把 Lightroom 完整流程走一遍，步骤导向、即查即用。", level: "基础", weeks: "W21" },
  { title: "The Digital Print", author: "Jeff Schewe", note: "从软打样到输出的完整链路；色彩管理的终点是印出来。", level: "进阶", weeks: "W22" },
  { title: "风光后期系统课（线上）", author: "Thomas 看看世界", note: "国内风光后期最有体系的一门课；先跟流程，再谈风格化。", level: "基础→进阶", weeks: "W21–22" },
];

const DRILLS = [
  {
    id: "d1",
    title: "10 分钟 · 同一主体五种光",
    desc: "找一个杯子或花瓶，在 10 分钟内用顺光、侧光、逆光、顶光、窗光各拍 1 张。",
    duration: "10 min",
  },
  {
    id: "d2",
    title: "15 分钟 · 街角三分法",
    desc: "走到最近的街角，只拍符合三分法的 15 张。不许居中构图。",
    duration: "15 min",
  },
  {
    id: "d3",
    title: "20 分钟 · 前景练习",
    desc: "在公园或窗边，为同一景别各拍「有前景 / 无前景」一组，共 6 张。",
    duration: "20 min",
  },
  {
    id: "d4",
    title: "30 分钟 · 一镜一人",
    desc: "只用 50mm（或手机主摄），给一个人拍 10 张，包含特写、半身、环境各至少 2 张。",
    duration: "30 min",
  },
  {
    id: "d5",
    title: "10 分钟 · 黑白剥离",
    desc: "拍 5 张，回家全部转黑白。只靠影调与构图支撑画面。",
    duration: "10 min",
  },
  {
    id: "d6",
    title: "20 分钟 · 决定性瞬间",
    desc: "选定一个路口或门洞，等待 20 分钟，只拍 3 张——必须是「事件对齐」的瞬间。",
    duration: "20 min",
  },
];

const CHEATS = [
  {
    title: "三分法",
    desc: "把画面用两条横线、两条竖线分成九宫格，主体放在交点或线上，地平线放在上/下三分线。",
    tag: "Rule of Thirds",
    icon: "grid",
    svg: `<svg viewBox="0 0 320 200" class="demo-svg" role="img" aria-label="三分法示意">
      <rect width="320" height="200" fill="#2a2622"/>
      <rect y="110" width="320" height="90" fill="#3d342c"/>
      <path d="M0 110 Q80 70 160 95 T320 100 L320 110 L0 110 Z" fill="#4a4036"/>
      <circle cx="213" cy="67" r="18" fill="#d4a054" opacity="0.9"/>
      <circle cx="213" cy="67" r="28" fill="#d4a054" opacity="0.15"/>
      <rect x="198" y="118" width="30" height="48" rx="3" fill="#8b6a48"/>
      <rect x="206" y="108" width="14" height="12" fill="#a07a52"/>
      <g stroke="#d4a054" stroke-width="1.5" opacity="0.95">
        <line x1="106.7" y1="0" x2="106.7" y2="200"/>
        <line x1="213.3" y1="0" x2="213.3" y2="200"/>
        <line x1="0" y1="66.7" x2="320" y2="66.7"/>
        <line x1="0" y1="133.3" x2="320" y2="133.3"/>
      </g>
      <g fill="#d4a054">
        <circle cx="213.3" cy="66.7" r="4.5"/>
        <circle cx="106.7" cy="133.3" r="3" opacity="0.5"/>
        <circle cx="106.7" cy="66.7" r="3" opacity="0.5"/>
        <circle cx="213.3" cy="133.3" r="3" opacity="0.5"/>
      </g>
    </svg>`,
  },
  {
    title: "引导线",
    desc: "道路、栏杆、河流、光影边界都可以把观众视线引向主体。线条越明确，画面越有力。",
    tag: "Leading Lines",
    icon: "line",
    svg: `<svg viewBox="0 0 320 200" class="demo-svg" role="img" aria-label="引导线示意">
      <rect width="320" height="200" fill="#2a2622"/>
      <rect y="90" width="320" height="110" fill="#3a322a"/>
      <polygon points="0,200 110,95 210,95 320,200" fill="#4e4338"/>
      <polygon points="110,95 210,95 190,200 130,200" fill="#5c4f40"/>
      <rect x="148" y="72" width="24" height="28" rx="3" fill="#8b6a48"/>
      <rect x="154" y="62" width="12" height="12" fill="#a07a52"/>
      <circle cx="160" cy="70" r="8" fill="#d4a054" opacity="0.85"/>
      <g stroke="#d4a054" stroke-width="2" opacity="0.9" stroke-linecap="round">
        <line x1="20" y1="195" x2="145" y2="88"/>
        <line x1="300" y1="195" x2="175" y2="88"/>
        <line x1="80" y1="200" x2="152" y2="95"/>
        <line x1="240" y1="200" x2="168" y2="95"/>
      </g>
      <circle cx="160" cy="70" r="14" fill="none" stroke="#d4a054" stroke-width="1.5" opacity="0.7"/>
    </svg>`,
  },
  {
    title: "框架构图",
    desc: "门窗、树枝、拱廊形成「画中画」，把注意力锁在框内主体上，同时增加层次。",
    tag: "Framing",
    icon: "frame",
    svg: `<svg viewBox="0 0 320 200" class="demo-svg" role="img" aria-label="框架构图示意">
      <rect width="320" height="200" fill="#241f1b"/>
      <rect x="52" y="22" width="216" height="156" rx="6" fill="#3d5060"/>
      <rect x="52" y="22" width="216" height="156" rx="6" fill="url(#frameSky)" opacity="0.9"/>
      <defs>
        <linearGradient id="frameSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#5a7a90"/>
          <stop offset="100%" stop-color="#c4884a"/>
        </linearGradient>
      </defs>
      <ellipse cx="160" cy="150" rx="70" ry="18" fill="#2a241c"/>
      <rect x="148" y="100" width="24" height="52" rx="4" fill="#1a1612"/>
      <circle cx="160" cy="92" r="12" fill="#1a1612"/>
      <rect x="154" y="112" width="12" height="6" rx="2" fill="#d4a054" opacity="0.5"/>
      <!-- frame (window/door) -->
      <rect x="48" y="18" width="224" height="164" rx="8" fill="none" stroke="#1a1612" stroke-width="18"/>
      <rect x="52" y="22" width="216" height="156" rx="6" fill="none" stroke="#3a2e24" stroke-width="3"/>
      <rect x="152" y="22" width="16" height="156" fill="#2a221c"/>
      <rect x="52" y="96" width="216" height="10" fill="#2a221c"/>
      <rect x="52" y="22" width="216" height="156" rx="6" fill="none" stroke="#d4a054" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.55"/>
    </svg>`,
  },
  {
    title: "对称与倒影",
    desc: "建筑、水面、走廊适合严格对称；轻微打破对称（一个人走过）反而更有张力。",
    tag: "Symmetry",
    icon: "mirror",
    svg: `<svg viewBox="0 0 320 200" class="demo-svg" role="img" aria-label="对称与倒影示意">
      <rect width="320" height="100" fill="#2c3844"/>
      <rect y="100" width="320" height="100" fill="#24303c"/>
      <!-- building -->
      <rect x="110" y="30" width="100" height="70" fill="#4a4036"/>
      <rect x="130" y="18" width="60" height="14" fill="#5a4e40"/>
      <rect x="148" y="8" width="24" height="12" fill="#6a5a48"/>
      <g fill="#d4a054" opacity="0.85">
        <rect x="122" y="42" width="14" height="18" rx="1"/>
        <rect x="142" y="42" width="14" height="18" rx="1"/>
        <rect x="164" y="42" width="14" height="18" rx="1"/>
        <rect x="184" y="42" width="14" height="18" rx="1"/>
        <rect x="122" y="68" width="14" height="18" rx="1"/>
        <rect x="142" y="68" width="14" height="18" rx="1"/>
        <rect x="164" y="68" width="14" height="18" rx="1"/>
        <rect x="184" y="68" width="14" height="18" rx="1"/>
      </g>
      <!-- reflection -->
      <g opacity="0.35" transform="translate(0,200) scale(1,-1)">
        <rect x="110" y="30" width="100" height="70" fill="#4a4036"/>
        <rect x="130" y="18" width="60" height="14" fill="#5a4e40"/>
        <rect x="148" y="8" width="24" height="12" fill="#6a5a48"/>
        <g fill="#d4a054">
          <rect x="122" y="42" width="14" height="18" rx="1"/>
          <rect x="142" y="42" width="14" height="18" rx="1"/>
          <rect x="164" y="42" width="14" height="18" rx="1"/>
          <rect x="184" y="42" width="14" height="18" rx="1"/>
        </g>
      </g>
      <!-- water line -->
      <line x1="0" y1="100" x2="320" y2="100" stroke="#d4a054" stroke-width="1.5" opacity="0.7"/>
      <!-- symmetry axis -->
      <line x1="160" y1="0" x2="160" y2="200" stroke="#d4a054" stroke-width="1" stroke-dasharray="5 4" opacity="0.55"/>
    </svg>`,
  },
  {
    title: "前景层次",
    desc: "加入前景物体建立近-中-远三层，画面立刻有了纵深，不再是「平面贴图」。",
    tag: "Depth",
    icon: "layers",
    svg: `<svg viewBox="0 0 320 200" class="demo-svg" role="img" aria-label="前景层次示意">
      <defs>
        <linearGradient id="depthSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#3a5068"/>
          <stop offset="60%" stop-color="#c4884a"/>
          <stop offset="100%" stop-color="#e8a85c"/>
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill="url(#depthSky)"/>
      <!-- far mountains -->
      <path d="M0 110 L60 70 L110 100 L160 60 L220 95 L280 75 L320 105 L320 130 L0 130 Z" fill="#2a3844" opacity="0.85"/>
      <!-- mid lake -->
      <rect y="118" width="320" height="42" fill="#2a4050" opacity="0.9"/>
      <ellipse cx="80" cy="132" rx="30" ry="3" fill="#4a6878" opacity="0.5"/>
      <ellipse cx="220" cy="140" rx="40" ry="3" fill="#4a6878" opacity="0.4"/>
      <!-- mid island / trees -->
      <ellipse cx="160" cy="118" rx="36" ry="10" fill="#1e3028"/>
      <rect x="152" y="92" width="6" height="28" fill="#2a221c"/>
      <ellipse cx="155" cy="90" rx="16" ry="14" fill="#2e4838"/>
      <!-- near foreground rocks -->
      <ellipse cx="50" cy="185" rx="55" ry="28" fill="#1a1612"/>
      <ellipse cx="120" cy="195" rx="45" ry="22" fill="#221c16"/>
      <ellipse cx="260" cy="188" rx="60" ry="26" fill="#1a1612"/>
      <ellipse cx="190" cy="198" rx="40" ry="18" fill="#221c16"/>
      <!-- labels -->
      <g font-size="9" fill="#d4a054" font-family="system-ui,sans-serif" opacity="0.9">
        <text x="160" y="40" text-anchor="middle">远景</text>
        <text x="250" y="135" text-anchor="middle">中景</text>
        <text x="70" y="175" text-anchor="middle">前景</text>
      </g>
    </svg>`,
  },
  {
    title: "留白与极简",
    desc: "大面积负空间突出单一主体。少即是多，但主体必须足够有存在感。",
    tag: "Negative Space",
    icon: "space",
    svg: `<svg viewBox="0 0 320 200" class="demo-svg" role="img" aria-label="留白与极简示意">
      <rect width="320" height="200" fill="#e8e0d4"/>
      <rect y="150" width="320" height="50" fill="#d4c8b4"/>
      <line x1="0" y1="150" x2="320" y2="150" stroke="#c0b49e" stroke-width="1"/>
      <!-- small subject (bird / person) -->
      <ellipse cx="230" cy="128" rx="22" ry="8" fill="#2a241c"/>
      <ellipse cx="248" cy="118" rx="8" ry="7" fill="#2a241c"/>
      <path d="M255 118 L268 114 L255 122 Z" fill="#d4a054"/>
      <line x1="222" y1="136" x2="218" y2="150" stroke="#2a241c" stroke-width="2"/>
      <line x1="236" y1="136" x2="238" y2="150" stroke="#2a241c" stroke-width="2"/>
      <!-- tiny accent mark -->
      <circle cx="80" cy="60" r="3" fill="#d4a054" opacity="0.35"/>
      <!-- subtle guideline -->
      <rect x="160" y="40" width="140" height="130" fill="none" stroke="#d4a054" stroke-width="1" stroke-dasharray="4 4" opacity="0.4"/>
    </svg>`,
  },
  {
    title: "对角线张力",
    desc: "对角线比水平垂直更有动势。把主要线条或动作放在对角方向上。",
    tag: "Diagonals",
    icon: "diag",
    svg: `<svg viewBox="0 0 320 200" class="demo-svg" role="img" aria-label="对角线张力示意">
      <rect width="320" height="200" fill="#2a2622"/>
      <!-- diagonal bridge / stairs -->
      <polygon points="0,180 320,40 320,70 0,200" fill="#4a4036"/>
      <polygon points="0,180 320,40 320,52 0,192" fill="#5c4f40"/>
      <!-- steps -->
      <g stroke="#3a322a" stroke-width="1.5">
        <line x1="30" y1="172" x2="50" y2="178"/>
        <line x1="80" y1="150" x2="100" y2="156"/>
        <line x1="130" y1="128" x2="150" y2="134"/>
        <line x1="180" y1="106" x2="200" y2="112"/>
        <line x1="230" y1="84" x2="250" y2="90"/>
        <line x1="280" y1="62" x2="300" y2="68"/>
      </g>
      <!-- subject walking -->
      <rect x="168" y="100" width="10" height="22" rx="3" fill="#1a1612"/>
      <circle cx="173" cy="94" r="6" fill="#1a1612"/>
      <!-- diagonal guides -->
      <line x1="0" y1="180" x2="320" y2="40" stroke="#d4a054" stroke-width="1.5" stroke-dasharray="8 5" opacity="0.85"/>
      <line x1="0" y1="200" x2="320" y2="70" stroke="#d4a054" stroke-width="1" stroke-dasharray="4 4" opacity="0.4"/>
    </svg>`,
  },
  {
    title: "黄金螺旋",
    desc: "比三分法更有机的焦点安排：视线沿螺旋卷入主体。风光与静物特别有效。",
    tag: "Golden Spiral",
    icon: "spiral",
    svg: `<svg viewBox="0 0 320 200" class="demo-svg" role="img" aria-label="黄金螺旋示意">
      <rect width="320" height="200" fill="#2a2622"/>
      <rect y="120" width="320" height="80" fill="#3a322a"/>
      <path d="M0 120 Q100 90 180 115 T320 110 L320 120 L0 120 Z" fill="#4a4036"/>
      <!-- still life: cup -->
      <ellipse cx="123" cy="132" rx="28" ry="8" fill="#2a221c"/>
      <rect x="100" y="108" width="46" height="28" rx="4" fill="#8b6a48"/>
      <path d="M146 114 Q162 118 158 132 Q154 142 146 136" fill="none" stroke="#8b6a48" stroke-width="4"/>
      <ellipse cx="123" cy="108" rx="23" ry="6" fill="#a07a52"/>
      <!-- golden spiral (logarithmic approximation) -->
      <path d="M300 20
               C300 20 300 80 220 90
               C140 100 120 130 123 140
               C126 150 150 155 165 148
               C180 141 178 125 165 122
               C152 119 145 128 148 135
               C151 142 160 143 164 138"
            fill="none" stroke="#d4a054" stroke-width="1.8" opacity="0.9"/>
      <circle cx="123" cy="140" r="4" fill="#d4a054"/>
    </svg>`,
  },
  {
    title: "减法原则",
    desc: "问自己：去掉哪个元素，照片会更好？能去就去。简洁是新手最难的功课。",
    tag: "Subtraction",
    icon: "minus",
    svg: `<svg viewBox="0 0 320 200" class="demo-svg" role="img" aria-label="减法原则示意">
      <!-- before (cluttered) -->
      <rect x="0" y="0" width="150" height="200" fill="#2a2622"/>
      <rect x="10" y="120" width="130" height="70" fill="#3a322a"/>
      <rect x="20" y="40" width="18" height="80" fill="#4a4036"/>
      <rect x="50" y="60" width="14" height="60" fill="#4a4036"/>
      <rect x="110" y="50" width="16" height="70" fill="#4a4036"/>
      <circle cx="40" cy="35" r="12" fill="#5a6a4a"/>
      <circle cx="95" cy="30" r="10" fill="#5a6a4a"/>
      <rect x="70" y="100" width="30" height="40" rx="3" fill="#8b6a48"/>
      <rect x="8" y="90" width="20" height="8" fill="#d4a054" opacity="0.4"/>
      <rect x="125" y="95" width="18" height="8" fill="#d4a054" opacity="0.4"/>
      <rect x="55" y="155" width="22" height="8" fill="#c45a3a" opacity="0.5"/>
      <text x="75" y="188" text-anchor="middle" fill="#7d756a" font-size="10" font-family="system-ui,sans-serif">改前 · 杂乱</text>

      <!-- divider -->
      <line x1="160" y1="20" x2="160" y2="180" stroke="#d4a054" stroke-width="1" stroke-dasharray="4 4" opacity="0.5"/>

      <!-- after (simplified) -->
      <rect x="170" y="0" width="150" height="200" fill="#2a2622"/>
      <rect x="180" y="120" width="130" height="70" fill="#3a322a"/>
      <rect x="230" y="100" width="30" height="40" rx="3" fill="#8b6a48"/>
      <rect x="237" y="112" width="16" height="8" fill="#d4a054" opacity="0.7"/>
      <circle cx="245" cy="88" r="5" fill="#d4a054" opacity="0.35"/>
      <text x="245" y="188" text-anchor="middle" fill="#7d756a" font-size="10" font-family="system-ui,sans-serif">改后 · 简洁</text>
    </svg>`,
  },
];
