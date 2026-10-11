/**
 * 工作室版 · 视觉预览
 *
 * 这是一个**独立的预览页面**，和主站（src/App.jsx）完全隔离：
 *   - 走独立入口 preview.html → 构建出 dist/preview.html
 *   - 用 HashRouter，所以不会和主站的 BrowserRouter 抢路径
 *   - 样式全部在 preview.css 里，不复用主站的 Tailwind 类
 * 目的：让作者在不动主站的前提下，对比新视觉再决定要不要换。
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { HashRouter, Routes, Route, Link, useNavigate, useParams } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { mediaOf, coverOf, loadWorks, getCachedWorks, subscribe } from "../worksStore.js";

/* ---------------- 资料（与主站 PROFILE 保持一致） ---------------- */

const PROFILE = {
  name: "谢曙浩",
  mark: "谢",
  role: "3D Artist",
  roleSub: "产品可视化 · 商业渲染",
  statement:
    "把一支产品的材质、光线和质感，做成可以直接上架的画面。主攻美妆日化类产品可视化，客户以设计公司为主，从建模、材质到布光渲染一次交付。",
  tagline: "光影重构现实 · 极致视觉表达",
  email: "3569491401@qq.com",
  phone: "193 8854 5612",
  wechat: "xshxsh5218",
  city: "中国",
  // 口径与事实一致：2025 年起自学，自由职业接单，累计十余单
  stats: [
    { value: "1.5+", label: "从业年限" },
    { value: "十余单", label: "项目交付" },
    { value: "6", label: "精通软件" },
  ],
  // 「关于我」旁边的事实清单，一眼能看完的关键信息
  facts: [
    { k: "入行", v: "2025 年 · 自学" },
    { k: "接单方式", v: "自由职业" },
    { k: "客户来源", v: "设计公司" },
    { k: "擅长品类", v: "美妆日化" },
  ],
};

const CAPABILITIES = [
  { n: "01", t: "产品可视化", d: "按商业摄影的思路构建产品静物，让渲染图能直接用于电商主图与详情页。" },
  { n: "02", t: "场景搭建与布光", d: "从环境、道具到光位全部手工搭建，用光线而不是后期修图来塑造质感。" },
  { n: "03", t: "硬表面建模", d: "数码、道具、机械类模型的结构还原，注重比例、倒角与细节层级。" },
  { n: "04", t: "材质与质感表现", d: "玻璃、液体、金属、织物等材质攻坚，追求照片级的折射与反射。" },
];

/* 工作流程：只描述「标准的产品可视化流程」这一行业通行做法，
   不写具体周期、修改次数这类需要作者确认的数字。 */
const PROCESS = [
  { n: "01", t: "需求沟通", d: "确认产品实物或图纸、要投放的平台与规范、参考风格，以及最终需要的画面清单。" },
  { n: "02", t: "建模与材质", d: "按实物比例搭建模型，还原结构、倒角与细节，再逐层调出玻璃、液体、金属等材质。" },
  { n: "03", t: "布光与渲染", d: "按商业摄影的思路布置光位与环境，输出多个角度与景别，并保证同一支产品的统一性。" },
  { n: "04", t: "交付与调整", d: "按平台规范导出交付，附分层文件；根据反馈做必要调整，直到画面能直接上架。" },
];

/**
 * 材质族：把作者写的一堆具体标签归纳成少数几个可用的筛选维度。
 *
 * 为什么不直接改标签数据 —— 详情页上「琥珀香液」「硬光投影」这类具体描述是有质感的，
 * 换成「布光与光影」就没了味道。所以这里只在**筛选层**做归纳，原始标签原样保留。
 *
 * 作用范围：作品的 tags + desc + title。以后加新作品时，
 * 只要标签里用到下面这些关键词，就会自动归到对应的族里，不用改代码。
 * 想调整分类，改这里的 keys 就行。
 */
const MATERIAL_FAMILIES = [
  { label: "玻璃与通透", keys: ["玻璃", "通透", "折射", "反射", "厚壁", "器皿"] },
  { label: "液体与半透", keys: ["半透", "胶质", "次表面", "液体", "焦散"] },
  { label: "布光与光影", keys: ["光", "阴影", "投影", "背光", "轮廓"] },
  { label: "场景与道具", keys: ["场景", "道具", "陈设", "构成"] },
  { label: "硬表面与金属", keys: ["硬表面", "金属", "磨损", "锈", "拆解", "悬浮"] },
  { label: "材质研究", keys: ["材质", "肌理", "程序化", "纹理"] },
  { label: "白底与纯色", keys: ["白底", "纯色", "商拍"] },
  { label: "微距与构图", keys: ["微距", "构图", "抽象", "单色"] },
  // 注意：不要把「拆解」放进来 —— 手柄作品的标签是「产品拆解」，那是静图，
  // 会误匹配成动画类。等以后真的有两段以上动画，「动画与动态」会自动出现。
  { label: "动画与动态", keys: ["动画", "动态", "环绕", "旋转展示"] },
];

/** 判断一件作品属于哪些材质族 */
function familiesOf(work) {
  const hay = [
    ...(work.detail?.tags || []),
    work.desc || "",
    work.title || "",
  ].join(" ");
  return MATERIAL_FAMILIES.filter((f) => f.keys.some((k) => hay.includes(k))).map(
    (f) => f.label
  );
}

const SERVICES = [
  { n: "01", t: "产品静物渲染", d: "按商业摄影的思路搭建产品静物，画面可以直接用于电商主图与详情页。" },
  { n: "02", t: "场景搭建与布光", d: "环境、道具、光位全部手工搭建，用光线本身塑造质感，而不是靠后期修。" },
  { n: "03", t: "白底主图", d: "干净的纯色与白底产品图，按平台规范导出，适合货架与搜索场景。" },
  { n: "04", t: "电商详情页套图", d: "一次交付整套视觉：主图、场景图、细节特写，保证多图之间材质与色温统一。" },
  { n: "05", t: "纯 3D 建模", d: "只要模型不要渲染也可以，交付可继续加工的工程文件。" },
  { n: "06", t: "动画与动态", d: "360° 旋转展示、产品拆解动画、短广告动态，让静态产品动起来。" },
];

const SOFTWARE = ["Blender", "Cinema 4D", "Octane", "Redshift", "Cycles", "Eevee", "Photoshop"];

/* 精选项目：封面一律用「裁切不伤产品」的那张，不用竖构图的极限特写 */
const PROJECTS = [
  {
    slug: "beauty",
    title: "美妆个护产品可视化",
    label: "C4D + OCTANE / BLENDER + CYCLES",
    desc: "香水、香氛、精华、精油等品类的建模与渲染，含整套电商商用交付。围绕玻璃、半透明液体与金属配件展开材质攻坚，并保证同一支产品在多种底色、多个景别下的统一性。",
    tags: ["玻璃材质", "液体渲染", "商用交付", "产品可视化"],
    cover: "/works/perfume-coco.jpg",
    to: "/work/coco-perfume",
  },
  {
    slug: "food",
    title: "食品饮料与材质研究",
    label: "C4D + OCTANE",
    desc: "软糖、薯片等休闲食品的材质表现与商拍，重点打磨半透胶质、微距肌理与高饱和配色。",
    tags: ["半透胶质", "程序化纹理"],
    cover: "/works/gummy-candy.jpg",
    to: "/work/gummy-candy",
  },
  {
    slug: "digital",
    title: "3C数码与运动装备",
    label: "BLENDER + CYCLES",
    desc: "硬表面小物的结构还原与产品渲染，从倒角、比例到材质细节逐层控制。",
    tags: ["硬表面建模", "细节还原"],
    cover: "/works/gamepad-retro.jpg",
    to: "/work/retro-gamepad",
  },
  {
    slug: "hard-surface",
    title: "硬表面道具与场景",
    label: "BLENDER + CYCLES",
    desc: "还原金属磨损、锈蚀等真实质感，用几何与色彩关系控制画面秩序。",
    tags: ["金属磨损", "道具陈设"],
    cover: "/works/prop-weapon.jpg",
    to: "/work/prop-weapon",
  },
];

/* 首页轮播：每张单独给裁切焦点，竖构图才不会切掉瓶盖 */
const HERO = [
  { src: "/works/perfume-coco.jpg", pos: "50% 52%", t: "COCO 香水 · 岩石静物", s: "美妆个护" },
  { src: "/works/blue-perfume-01.jpg", pos: "50% 30%", t: "蓝色香氛瓶 · 水波光影", s: "美妆个护" },
  { src: "/works/prop-weapon.jpg", pos: "50% 50%", t: "枪械道具 · 电影感布光", s: "硬表面与场景" },
];

/* ---------------- 图标（内联，不引图标库） ---------------- */

const IcArrow = ({ s = 14 }) => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcUpRight = ({ s = 14 }) => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M5 11L11 5M6 5h5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcGear = ({ s = 15 }) => (
  <svg width={s} height={s} viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <circle cx="10" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.4" />
    <path
      d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4M15.3 15.3l-1.4-1.4M6.1 6.1L4.7 4.7"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"
    />
  </svg>
);
const IcClose = ({ s = 16 }) => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const IcBack = ({ s = 14 }) => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ---------------- 进场动效 ---------------- */

const EASE_CSS = "cubic-bezier(.22,1,.36,1)";

/**
 * 首屏内的元素：挂载后立刻进场，不依赖滚动/IntersectionObserver。
 * 首屏本来就该「打开即出现」，用滚动触发在语义上就是错的，
 * 而且一旦触发失败内容就永远不可见。
 */
function Enter({ children, delay = 0, className = "" }) {
  const reduce = useReducedMotion();
  const [go, setGo] = useState(reduce);

  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => setGo(true), delay * 1000);
    return () => clearTimeout(t);
  }, [delay, reduce]);

  return (
    <div
      className={className}
      style={{
        opacity: go ? 1 : 0,
        transform: go ? "none" : "translateY(22px)",
        transition: reduce ? "none" : `opacity .9s ${EASE_CSS}, transform .9s ${EASE_CSS}`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * 折叠线以下的元素：滚动进视口才进场。
 * 关键点：任何异常情况下都必须能显示出来 ——
 *   · 不支持 IntersectionObserver → 直接可见，不做动画
 *   · 观察器没触发但元素确实在视口里 → 3 秒后兜底显示
 * 作品集最不能出现的就是「内容空白」，所以这里宁可放弃一点动效。
 */
function Reveal({ children, delay = 0, className = "" }) {
  const reduce = useReducedMotion();
  const canObserve =
    typeof window !== "undefined" && "IntersectionObserver" in window && !reduce;
  const [armed] = useState(canObserve);
  const [shown, setShown] = useState(!canObserve);
  const ref = useRef(null);

  useEffect(() => {
    if (!armed) return;
    const el = ref.current;
    if (!el) return;

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setShown(true);
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          finish();
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);

    // 兜底：只在元素确实处于视口内时才强制显示，
    // 这样不会破坏下方板块「滚到才出现」的效果
    const t = setTimeout(() => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) finish();
    }, 3000);

    return () => {
      io.disconnect();
      clearTimeout(t);
    };
  }, [armed]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(20px)",
        transition: `opacity .85s ${EASE_CSS} ${delay}s, transform .85s ${EASE_CSS} ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* ---------------- 数据 ---------------- */

/**
 * 读取作品数据 —— 走 worksStore，和作者中心（/admin）共用同一份数据。
 *
 * 为什么要接 store 而不是直接 fetch /works.json：
 * 作者在后台改完作品，草稿存在 IndexedDB 里，只有「发布到线上」才会写进
 * works.json。如果这里只读 works.json，作者本地改的东西在预览页看不到，
 * 会以为「后台没保存成功」。接了 store 之后：
 *   - 首屏：同步拿 getCachedWorks()（有草稿就直接渲染，不闪 loading）
 *   - 随后：loadWorks() 补齐线上数据
 *   - 变更：subscribe 订阅，后台一改这边立刻重渲染
 *
 * worksStore 内部已经处理了离线单文件场景（window.__WORKS_JSON__），
 * 所以这里不用再单独判断。
 */
function useWorks() {
  const [works, setWorks] = useState(() => getCachedWorks() || null);

  useEffect(() => {
    let alive = true;
    // 没有草稿时传空数组兜底：worksStore 会优先用草稿/线上数据，
    // 都拿不到才回退到这个空数组，不会让页面卡在「正在载入」。
    loadWorks([])
      .then((w) => {
        if (alive) setWorks(w);
      })
      .catch((e) => {
        console.warn("作品数据载入失败：", e);
        if (alive) setWorks([]);
      });
    const unsubscribe = subscribe((w) => {
      if (alive) setWorks(w);
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  return works;
}

/* ---------------- 单页内跳转 ---------------- */

/**
 * 注意：这里不能用 <a href="#about">。
 * 预览页用的是 HashRouter，#about 会被当成路由 /about，
 * 结果跳到「作品不存在」页 —— 锚点和 hash 路由是冲突的。
 * 所以统一改成 JS 滚动。
 */
function scrollToId(id) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }
  return false;
}

/** 导航用：当前页找不到该板块（比如在详情页），先回首页再滚过去 */
function useGoToSection() {
  const navigate = useNavigate();
  return (id) => {
    if (scrollToId(id)) return;
    navigate("/");
    setTimeout(() => scrollToId(id), 140);
  };
}

/* ---------------- 顶部导航 ---------------- */

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const goTo = useGoToSection();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { id: "featured", label: "精选", minor: true },
    { id: "works", label: "作品" },
    { id: "about", label: "关于" },
    { id: "process", label: "流程" },
    { id: "services", label: "服务" },
    { id: "contact", label: "联系" },
  ];

  return (
    <header className={`nav${scrolled ? " is-scrolled" : ""}`}>
      <div className="wrap nav-inner">
        <Link to="/" className="brand" aria-label="回到首页">
          <span className="brand-mark" aria-hidden="true">{PROFILE.mark}</span>
          <span className="brand-text">
            <span className="brand-name">{PROFILE.name}</span>
            <span className="brand-role">{PROFILE.role} · Product Viz</span>
          </span>
        </Link>

        <nav className="nav-links" aria-label="主导航">
          {links.map((l) => (
            <button
              key={l.id}
              className={`nav-link${l.minor ? " is-minor" : ""}`}
              onClick={() => goTo(l.id)}
            >
              {l.label}
            </button>
          ))}
          {/* 作者中心是主站的路由，这里用整页跳转过去 */}
          <a className="nav-auth" href="/admin">
            <IcGear />
            作者中心
          </a>
        </nav>
      </div>
    </header>
  );
}

/* ---------------- 首屏 ---------------- */

function Hero() {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setI((n) => (n + 1) % HERO.length), 6500);
    return () => clearInterval(t);
  }, [reduce]);

  return (
    <section className="hero">
      {/* 左：信息面板（实色底，文字不压在图片上，彻底解决可读性问题） */}
      <div className="hero-panel">
        <Enter>
          <span className="status">
            <span className="status-dot" />
            <span className="status-text">Available for work</span>
          </span>
        </Enter>

        <Enter delay={0.06}>
          <p className="hero-role" style={{ margin: "0 0 14px" }}>
            {PROFILE.role} — {PROFILE.roleSub}
          </p>
          <h1 className="display">{PROFILE.name}</h1>
        </Enter>

        <Enter delay={0.12}>
          <p className="lede prose">{PROFILE.statement}</p>
        </Enter>

        <Enter delay={0.18}>
          <div className="hero-cta">
            <button className="btn btn-accent" onClick={() => scrollToId("works")}>
              查看作品
              <span className="btn-arrow"><IcArrow /></span>
            </button>
            <a className="btn btn-ghost" href={`mailto:${PROFILE.email}`}>
              联系我
              <IcUpRight />
            </a>
          </div>
        </Enter>

        <Enter delay={0.24}>
          <div className="hero-stats">
            {PROFILE.stats.map((s) => (
              <div key={s.label}>
                <div className="stat-n">{s.value}</div>
                <div className="stat-l">{s.label}</div>
              </div>
            ))}
          </div>
        </Enter>

        <Enter delay={0.3}>
          <span className="scroll-cue">
            <span className="scroll-cue-line" />
            <span className="scroll-cue-t">Scroll · 向下浏览作品</span>
          </span>
        </Enter>
      </div>

      {/* 右：作品画面，慢速轮播 + 极缓推近 */}
      <div className="hero-stage">
        {HERO.map((h, k) => (
          <div className={`hero-slide${k === i ? " is-active" : ""}`} key={h.src} aria-hidden={k !== i}>
            <img src={h.src} alt={k === i ? h.t : ""} style={{ objectPosition: h.pos }} />
          </div>
        ))}
        <div className="hero-index">
          <span className="hero-index-num">
            {String(i + 1).padStart(2, "0")} / {String(HERO.length).padStart(2, "0")}
          </span>
          <span className="hero-index-bars">
            {HERO.map((h, k) => (
              <button
                key={h.src}
                className={`hero-bar${k === i ? " is-active" : ""}`}
                aria-label={`查看第 ${k + 1} 张`}
                onClick={() => setI(k)}
              />
            ))}
          </span>
        </div>
        <div className="hero-caption">
          <div>
            <div className="hero-caption-t">{HERO[i].t}</div>
            <div className="hero-caption-s">{HERO[i].s}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 媒体渲染（图片 / 视频 / 外链） ---------------- */

/**
 * 一个组件处理三种媒体。
 * 外链用 iframe，按 16:9 撑开；视频用原生控件（浏览器自带全屏和画中画）。
 */
function MediaView({ item, title, className = "" }) {
  if (!item) return null;
  if (item.type === "video") {
    return (
      <video
        className={className}
        src={item.src}
        poster={item.poster || undefined}
        controls
        playsInline
        preload="metadata"
      />
    );
  }
  if (item.type === "embed") {
    return (
      <div className={`embed-box ${className}`}>
        <iframe
          src={item.src}
          title={title || "视频"}
          allowFullScreen
          allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
          frameBorder="0"
        />
      </div>
    );
  }
  return <img className={className} src={item.src} alt={title || ""} />;
}

/* ---------------- 作品灯箱 ---------------- */

function Lightbox({ images, index, title, onClose, onIndex }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onIndex(index - 1);
      else if (e.key === "ArrowRight") onIndex(index + 1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [index, onClose, onIndex]);

  if (!images || images.length === 0) return null;
  const i = ((index % images.length) + images.length) % images.length;
  const many = images.length > 1;
  const stop = (e) => e.stopPropagation();

  return (
    <div className="lb" role="dialog" aria-modal="true" aria-label="作品大图" onClick={onClose}>
      <div className="lb-bar is-top" onClick={stop}>
        <div>
          <div className="lb-title">{title}</div>
          <div className="lb-count">
            {String(i + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}
          </div>
        </div>
        <button className="lb-btn" onClick={onClose} aria-label="关闭"><IcClose /></button>
      </div>

      {many && (
        <>
          <button
            className="lb-btn"
            style={{ position: "absolute", left: "clamp(16px,3vw,44px)" }}
            onClick={(e) => { stop(e); onIndex(i - 1); }}
            aria-label="上一张"
          >
            <IcBack s={16} />
          </button>
          <button
            className="lb-btn"
            style={{ position: "absolute", right: "clamp(16px,3vw,44px)" }}
            onClick={(e) => { stop(e); onIndex(i + 1); }}
            aria-label="下一张"
          >
            <IcArrow s={16} />
          </button>
        </>
      )}

      <img className="lb-img" src={images[i]} alt={`${title} - ${i + 1}`} onClick={stop} />

      {many && (
        <div className="lb-bar is-bottom" onClick={stop}>
          <span className="lb-count">← → 切换 · ESC 关闭</span>
        </div>
      )}
    </div>
  );
}

/* ---------------- 板块标题 ---------------- */

function SecHead({ num, title, note }) {
  return (
    <div className="sec-head">
      <span className="sec-num">{num}</span>
      <span className="sec-rule" />
      <span className="sec-note">{note}</span>
    </div>
  );
}

/* ---------------- 精选项目 ---------------- */

function Featured() {
  const [lead, ...rest] = PROJECTS;
  return (
    <section className="section" id="featured">
      <div className="wrap">
        <SecHead num="01" title="精选项目" note="Selected work" />

        <Reveal>
          <article className="feat">
            <Link className="feat-media" to={lead.to} aria-label={lead.title}>
              <img src={lead.cover} alt={lead.title} />
              <span className="media-badge">{lead.title}</span>
            </Link>
            <div className="feat-body">
              <span className="mono mono-accent">{lead.label}</span>
              <h3 className="h2">{lead.title}</h3>
              <p className="body-sm prose">{lead.desc}</p>
              <div className="feat-tags">
                {lead.tags.map((t) => (
                  <span className="tag" key={t}>{t}</span>
                ))}
              </div>
              <Link className="alink" to={lead.to} style={{ alignSelf: "flex-start", marginTop: 4 }}>
                查看这个项目
                <IcUpRight />
              </Link>
            </div>
          </article>
        </Reveal>

        <div className="trio">
          {rest.map((p, k) => (
            <Reveal key={p.slug} delay={0.06 * k}>
              <Link className="card" to={p.to}>
                <div className="card-media">
                  <img src={p.cover} alt={p.title} loading="lazy" />
                  <span className="card-go">
                    View
                    <IcArrow s={11} />
                  </span>
                </div>
                <div className="card-foot">
                  <span className="card-idx">{String(k + 2).padStart(2, "0")}</span>
                  <span className="card-title">{p.title}</span>
                </div>
                <p className="card-desc">{p.desc}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- 作品集（筛选 + 网格） ---------------- */

function WorksGrid({ works, showFilter = true, limit }) {
  const [cat, setCat] = useState("全部");
  const [tag, setTag] = useState(null);

  const cats = useMemo(() => {
    const set = new Set((works || []).map((w) => w.category).filter(Boolean));
    return ["全部", ...set];
  }, [works]);

  // 材质族（由标签关键词推导），只保留真的有 2 件以上作品的
  const families = useMemo(() => {
    const freq = new Map();
    (works || []).forEach((w) =>
      familiesOf(w).forEach((f) => freq.set(f, (freq.get(f) || 0) + 1))
    );
    return [...freq.entries()]
      .filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([label, n]) => ({ label, n }));
  }, [works]);

  const list = useMemo(() => {
    let arr = (works || []).filter((w) => cat === "全部" || w.category === cat);
    if (tag) arr = arr.filter((w) => familiesOf(w).includes(tag));
    return typeof limit === "number" ? arr.slice(0, limit) : arr;
  }, [works, cat, tag, limit]);

  const count = (c) =>
    c === "全部" ? (works || []).length : (works || []).filter((w) => w.category === c).length;

  const filtered = cat !== "全部" || tag;
  const clearAll = () => {
    setCat("全部");
    setTag(null);
  };

  return (
    <>
      {showFilter && (
        <>
          <div className="filters">
            {cats.map((c) => (
              <button key={c} className={`chip${c === cat ? " is-active" : ""}`} onClick={() => setCat(c)}>
                {c}
                <span className="chip-n">{count(c)}</span>
              </button>
            ))}
          </div>

          {families.length > 1 && (
            <div className="tagbar">
              <span className="tagbar-label">按材质 / 技法</span>
              <button className={`tagchip${!tag ? " is-active" : ""}`} onClick={() => setTag(null)}>
                全部
              </button>
              {families.map(({ label, n }) => (
                <button
                  key={label}
                  className={`tagchip${tag === label ? " is-active" : ""}`}
                  onClick={() => setTag(tag === label ? null : label)}
                >
                  {label} <span className="chip-n">{n}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {list.length === 0 ? (
        <p className="body-sm" style={{ padding: "48px 0" }}>
          这个条件下暂时没有作品。
          {filtered && (
            <button className="alink" style={{ marginLeft: 12, borderBottom: 0 }} onClick={clearAll}>
              清除筛选
            </button>
          )}
        </p>
      ) : (
        <div className="grid-works">
          {list.map((w, k) => (
            <Reveal key={w.slug || w.id} delay={Math.min(k * 0.05, 0.25)}>
              <Link className="card" to={`/work/${w.slug}`}>
                <div className="card-media">
                  <img
                    src={coverOf(w)}
                    alt={w.title}
                    loading="lazy"
                    /* 竖构图作品必须给裁切焦点，否则 4:3 会切掉瓶盖 */
                    style={{ objectPosition: w.imagePos || "50% 50%" }}
                  />
                  <span className="card-chip">{w.category}</span>
                  <span className="card-go">
                    View
                    <IcArrow s={11} />
                  </span>
                </div>
                <div className="card-foot">
                  <span className="card-idx">{String(k + 1).padStart(2, "0")}</span>
                  <span className="card-title">{w.title}</span>
                </div>
                <p className="card-desc">{w.desc}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      )}

      {filtered && list.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <button className="alink" onClick={clearAll}>
            清除筛选
          </button>
        </div>
      )}
    </>
  );
}

/* ---------------- 关于 ---------------- */

function About() {
  return (
    <section className="section" id="about">
      <div className="wrap">
        <SecHead num="03" title="关于我" note="About" />
        <div className="about">
          <Reveal>
            <figure style={{ margin: 0 }}>
              <div className="about-media">
                <img src="/works/essential-oil.jpg" alt="精油产品场景渲染" />
                <figcaption className="about-cap">
                  <span className="mono">精油产品场景渲染</span>
                  <span className="mono">Blender + Cycles</span>
                </figcaption>
              </div>
              <div className="kv" style={{ marginTop: 26 }}>
                {PROFILE.facts.map((f) => (
                  <div key={f.k}>
                    <div className="kv-k">{f.k}</div>
                    <div className="kv-v">{f.v}</div>
                  </div>
                ))}
              </div>
            </figure>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="about-col">
              <h3 className="h2">用渲染替代拍摄</h3>

              <p className="lede prose">
                2025 年开始自学 3D，从零做到今天能独立交付整套产品视觉。目前以自由职业的方式
                承接项目，客户主要来自设计公司，累计交付十余单，集中在美妆日化这个品类。
              </p>

              <p className="body-sm prose">
                我习惯从需求理解一路做到最终渲染：先弄清产品要投放在哪里、平台有什么规范、
                参考风格是哪一种，再动手建模。真正的力气花在材质和布光上 —— 玻璃的通透厚度、
                液体的次表面散射、金属上的磨损与油污，这些细节决定了画面是「像渲染」还是
                「像拍出来的」。
              </p>

              <p className="body-sm prose">
                美妆日化是我最熟的品类。香水、精华、精油这类产品对玻璃、液体和高光的还原要求最高，
                也正是我最愿意反复磨的地方。如果你手上是这类产品，可以直接把实物图和参考发我聊聊。
              </p>

              <div className="stats">
                {PROFILE.stats.map((s) => (
                  <div className="stat" key={s.label}>
                    <div className="stat-v">{s.value}</div>
                    <div className="stat-k">{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a className="btn btn-accent" href={`mailto:${PROFILE.email}`}>
                  发邮件聊聊
                  <IcUpRight />
                </a>
                <button className="btn btn-ghost" onClick={() => scrollToId("works")}>
                  先看作品
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 服务范围 ---------------- */

function Services() {
  return (
    <section className="section" id="services">
      <div className="wrap">
        <SecHead num="04" title="服务范围" note="Services" />
        <Reveal>
          <p className="lede prose" style={{ marginBottom: "clamp(28px,3.4vw,44px)" }}>
            从一张产品主图到整套详情页视觉，都可以交给我。只要模型不要渲染也行。
          </p>
        </Reveal>

        <div className="services">
          {SERVICES.map((c, k) => (
            <Reveal key={c.n} delay={0.04 * k}>
              <div className="cap">
                <span className="cap-n">{c.n}</span>
                <h4 className="h3">{c.t}</h4>
                <p className="body-sm" style={{ fontSize: 13.5 }}>{c.d}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <div className="soft-row">
            <span className="tagbar-label" style={{ alignSelf: "center" }}>使用软件</span>
            {SOFTWARE.map((sw) => (
              <span className="soft" key={sw}>{sw}</span>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.14}>
          <p className="mono" style={{ marginTop: 22, fontSize: 11 }}>
            具体周期、修改轮次与交付格式按项目沟通确认
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- 合作流程 ---------------- */

function Process() {
  return (
    <section className="section" id="process">
      <div className="wrap">
        <SecHead num="05" title="合作流程" note="Process" />
        <Reveal>
          <p className="lede prose" style={{ marginBottom: "clamp(28px,3.4vw,44px)" }}>
            从你把产品交给我，到画面能直接上架，中间大概是这样四步。
          </p>
        </Reveal>
        <div className="process">
          {PROCESS.map((p, k) => (
            <Reveal key={p.n} delay={0.05 * k}>
              <div className="step">
                <span className="step-n">{p.n}</span>
                <h4 className="step-t">{p.t}</h4>
                <p className="step-d">{p.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- 联系与页脚 ---------------- */

function Contact() {
  return (
    <section className="section" id="contact">
      <div className="wrap">
        <SecHead num="06" title="聊一聊" note="Contact" />
        <div className="contact">
          <Reveal>
            <div>
              <h3 className="h2" style={{ marginBottom: 18 }}>有产品想做成渲染图？</h3>
              <a className="contact-mail" href={`mailto:${PROFILE.email}`}>{PROFILE.email}</a>
              <p className="body-sm" style={{ marginTop: 16 }}>
                或加微信 <span style={{ color: "var(--accent)", fontFamily: "var(--mono)" }}>{PROFILE.wechat}</span>
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="contact-list">
              <div className="contact-row">
                <span className="mono">Email</span>
                <span style={{ color: "var(--ink)" }}>{PROFILE.email}</span>
              </div>
              <div className="contact-row">
                <span className="mono">Phone</span>
                <span style={{ color: "var(--ink)" }}>{PROFILE.phone}</span>
              </div>
              <div className="contact-row">
                <span className="mono">WeChat</span>
                <span style={{ color: "var(--ink)" }}>{PROFILE.wechat}</span>
              </div>
              <div className="contact-row">
                <span className="mono">Location</span>
                <span style={{ color: "var(--ink)" }}>{PROFILE.city}</span>
              </div>
              <div className="contact-row" style={{ borderBottom: 0 }}>
                <span className="mono">Status</span>
                <span style={{ color: "var(--accent)" }}>可接新项目</span>
              </div>
            </div>
          </Reveal>
        </div>

        <div className="foot">
          <span className="mono">© {new Date().getFullYear()} {PROFILE.name} · {PROFILE.tagline}</span>
          <span style={{ display: "flex", gap: 18, alignItems: "center" }}>
            <Link className="mono" to="/works" style={{ letterSpacing: "0.15em" }}>作者中心</Link>
            <button className="mono" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              回到顶部 ↑
            </button>
          </span>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 首页 ---------------- */

export function Home() {
  const works = useWorks();
  return (
    <>
      <Nav />
      <Hero />
      <Featured />

      <section className="section" id="works">
        <div className="wrap">
          <SecHead num="02" title="全部作品" note={works ? `${works.length} works` : "loading"} />
          {works ? (
            <WorksGrid works={works} />
          ) : (
            <p className="body-sm">正在载入作品…</p>
          )}
        </div>
      </section>

      <About />
      <Services />
      <Process />
      <Contact />
    </>
  );
}

/* ---------------- 作品详情 ---------------- */

export function WorkDetail() {
  const { slug } = useParams();
  const works = useWorks();
  const [zoom, setZoom] = useState(null);   // 灯箱打开时存的是图片下标

  const work = (works || []).find((w) => w.slug === slug);
  // 统一的媒体列表（图片 / 视频 / 外链）；老数据只有 images 会自动推导
  const media = useMemo(() => (work ? mediaOf(work) : []), [work]);
  // 灯箱只翻图片，视频和外链用页面上的原生播放器
  const images = useMemo(
    () => media.filter((m) => m.type === "image").map((m) => m.src),
    [media]
  );
  const [mi, setMi] = useState(0);   // 当前媒体下标

  useEffect(() => {
    setMi(0);
    setZoom(null);
  }, [slug]);

  const current = media[Math.min(mi, Math.max(0, media.length - 1))];
  const isImage = current?.type === "image";
  const imageIdx = isImage ? images.indexOf(current.src) : -1;

  const metaCount = (() => {
    const n = { image: 0, video: 0, embed: 0 };
    media.forEach((m) => { n[m.type] = (n[m.type] || 0) + 1; });
    const parts = [];
    if (n.image) parts.push(`${n.image} 张图`);
    if (n.video) parts.push(`${n.video} 段视频`);
    if (n.embed) parts.push(`${n.embed} 个视频外链`);
    return parts.join(" · ");
  })();

  if (!works) {
    return (
      <>
        <Nav />
        <div className="wrap" style={{ paddingTop: 160 }}><p className="body-sm">正在载入…</p></div>
      </>
    );
  }

  if (!work) {
    return (
      <>
        <Nav />
        <div className="wrap" style={{ paddingTop: 180, paddingBottom: 160, textAlign: "center" }}>
          <span className="mono">404</span>
          <h1 className="h1" style={{ margin: "16px 0 12px" }}>这个作品不在了</h1>
          <p className="body-sm" style={{ marginBottom: 28 }}>它可能被移除，或者链接输错了。</p>
          <Link className="btn btn-ghost" to="/">回到首页</Link>
        </div>
      </>
    );
  }

  const detail = work.detail || {};
  const tags = detail.tags || [];
  const related = (works || []).filter((w) => w.category === work.category && w.id !== work.id).slice(0, 3);

  // 上一件/下一件按作品集顺序走，方便连续浏览
  const idx = (works || []).findIndex((w) => w.id === work.id);
  const prev = idx > 0 ? works[idx - 1] : null;
  const next = idx >= 0 && idx < works.length - 1 ? works[idx + 1] : null;

  return (
    <>
      <Nav />
      {zoom !== null && (
        <Lightbox
          images={images}
          index={zoom}
          title={detail.title || work.title}
          onClose={() => setZoom(null)}
          onIndex={setZoom}
        />
      )}
      <div className="detail-hero">
        <div className="wrap">
          <Link className="alink" to="/" style={{ borderBottom: 0, paddingBottom: 0 }}>
            <IcBack />
            返回
          </Link>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", margin: "28px 0 14px" }}>
            <span className="mono mono-accent">{detail.category || work.category}</span>
            <span className="mono">{metaCount}</span>
          </div>
          <h1 className="h1" style={{ maxWidth: "20ch" }}>{detail.title || work.title}</h1>
        </div>
      </div>

      <div className="wrap">
        <Reveal>
          <div className="stage-wrap">
            {current?.type === "image" && (
              <button
                className="stage"
                onClick={() => setZoom(imageIdx >= 0 ? imageIdx : 0)}
                aria-label="放大查看这张图"
              >
                <img src={current.src} alt={detail.title || work.title} />
                <span className="stage-hint">点击放大</span>
              </button>
            )}
            {current?.type === "video" && (
              <div className="stage stage-video">
                <MediaView item={current} title={detail.title || work.title} className="stage-media" />
              </div>
            )}
            {current?.type === "embed" && (
              <MediaView item={current} title={detail.title || work.title} />
            )}
          </div>
        </Reveal>
      </div>

      {media.length > 1 && (
        <div className="wrap" style={{ marginTop: 16 }}>
          <div className="thumbs">
            {media.map((m, k) => (
              <button
                key={k}
                className={`thumb${k === mi ? " is-active" : ""}`}
                onClick={() => setMi(k)}
                aria-label={`查看第 ${k + 1} 个`}
              >
                {m.type === "image" && <img src={m.src} alt="" loading="lazy" />}
                {m.type === "video" &&
                  (m.poster ? (
                    <img src={m.poster} alt="" loading="lazy" />
                  ) : (
                    <span className="thumb-ph" />
                  ))}
                {m.type === "embed" && <span className="thumb-ph thumb-ph-t">外链</span>}
                {m.type !== "image" && (
                  <span className="thumb-badge">{m.type === "video" ? "▶" : "↗"}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <section className="section">
        <div className="wrap" style={{ display: "grid", gap: "clamp(30px,4vw,60px)" }}>
          <Reveal>
            <p className="lede prose" style={{ fontSize: "clamp(1rem,1.5vw,1.2rem)" }}>
              {detail.description}
            </p>
          </Reveal>

          {tags.length > 0 && (
            <Reveal>
              <div className="tags">
                {tags.map((t) => <span className="tag" key={t}>{t}</span>)}
              </div>
            </Reveal>
          )}

          <Reveal>
            <div className="kv">
              <div>
                <div className="kv-k">使用软件</div>
                <div className="kv-v">{detail.category || "—"}</div>
              </div>
              <div>
                <div className="kv-k">分类</div>
                <div className="kv-v">{work.category}</div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="pager">
            {prev ? (
              <Link className="pager-item" to={`/work/${prev.slug}`}>
                <span className="pager-k">← 上一件</span>
                <span className="pager-t">{prev.title}</span>
              </Link>
            ) : (
              <span className="pager-item pager-empty" aria-hidden="true" />
            )}
            {next ? (
              <Link className="pager-item is-next" to={`/work/${next.slug}`}>
                <span className="pager-k">下一件 →</span>
                <span className="pager-t">{next.title}</span>
              </Link>
            ) : (
              <span className="pager-item pager-empty" aria-hidden="true" />
            )}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section">
          <div className="wrap">
            <SecHead num="—" title="同分类其他作品" note={work.category} />
            <div className="grid-works">
              {related.map((w, k) => (
                <Reveal key={w.id} delay={0.05 * k}>
                  <Link className="card" to={`/work/${w.slug}`}>
                    <div className="card-media">
                      <img src={coverOf(w)} alt={w.title} loading="lazy"
                           style={{ objectPosition: w.imagePos || "50% 50%" }} />
                    </div>
                    <div className="card-foot">
                      <span className="card-title">{w.title}</span>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="wrap">
        <div className="foot">
          <span className="mono">© {new Date().getFullYear()} {PROFILE.name}</span>
          <Link className="mono" to="/" style={{ letterSpacing: "0.15em" }}>回到首页</Link>
        </div>
      </div>
    </>
  );
}

/* ---------------- 入口 ---------------- */

/**
 * 独立入口（preview.html / 离线单文件预览用）：
 * 自带 HashRouter，和主站的 BrowserRouter 互不干扰。
 *
 * 合并进主站后，主站 App.jsx 会直接引用下面导出的 Home / WorkDetail /
 * WorkListPage 三个页面组件，自己套路由 —— 这时不会走这个默认导出。
 */
export default function StudioPreview() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/work/:slug" element={<WorkDetail />} />
        <Route path="/works" element={<WorkListPage />} />
        <Route path="*" element={<WorkDetail />} />
      </Routes>
    </HashRouter>
  );
}

/* 独立的「全部作品」页（导航里作者中心按钮先指到这里，避免死链） */
export function WorkListPage() {
  const works = useWorks();
  return (
    <>
      <Nav />
      <section className="section section-flush" style={{ paddingTop: 140 }}>
        <div className="wrap">
          <SecHead num="02" title="全部作品" note={works ? `${works.length} works` : "loading"} />
          {works ? <WorksGrid works={works} /> : <p className="body-sm">正在载入作品…</p>}
        </div>
      </section>
      <div className="wrap">
        <div className="foot">
          <span className="mono">© {new Date().getFullYear()} {PROFILE.name}</span>
          <Link className="mono" to="/" style={{ letterSpacing: "0.15em" }}>回到首页</Link>
        </div>
      </div>
    </>
  );
}
