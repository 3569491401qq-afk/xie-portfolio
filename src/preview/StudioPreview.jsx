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

/* ---------------- 资料（与主站 PROFILE 保持一致） ---------------- */

const PROFILE = {
  name: "谢曙浩",
  mark: "谢",
  role: "3D Artist",
  roleSub: "产品可视化 · 商业渲染",
  statement:
    "把一支产品的材质、光线和质感，做成能直接上架的画面。专注美妆个护与消费品的产品可视化，从建模、材质到布光渲染一次交付。",
  tagline: "光影重构现实 · 极致视觉表达",
  email: "3569491401@qq.com",
  phone: "193 8854 5612",
  city: "中国",
  // 把「20+ 交付项目」换成与作品集一致的口径，避免客户数出对不上
  stats: [
    { value: "1.5+", label: "从业年限" },
    { value: "11", label: "作品案例" },
    { value: "6", label: "精通软件" },
  ],
};

const CAPABILITIES = [
  { n: "01", t: "产品可视化", d: "按商业摄影的思路构建产品静物，让渲染图能直接用于电商主图与详情页。" },
  { n: "02", t: "场景搭建与布光", d: "从环境、道具到光位全部手工搭建，用光线而不是后期修图来塑造质感。" },
  { n: "03", t: "硬表面建模", d: "数码、道具、机械类模型的结构还原，注重比例、倒角与细节层级。" },
  { n: "04", t: "材质与质感表现", d: "玻璃、液体、金属、织物等材质攻坚，追求照片级的折射与反射。" },
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
    desc: "软糖、贝壳等偏材质表现方向的练习与商拍，重点打磨半透胶质与天然肌理。",
    tags: ["半透胶质", "程序化纹理"],
    cover: "/works/gummy-candy.jpg",
    to: "/work/gummy-candy",
  },
  {
    slug: "digital",
    title: "3C数码与运动装备",
    label: "BLENDER + CYCLES",
    desc: "硬表面建模与产品渲染，用实物同机位比对验证还原度。",
    tags: ["硬表面建模", "实拍比对"],
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
  { src: "/works/perfume-coco.jpg", pos: "50% 52%", t: "COCO 香水 · 岩石静物", s: "Blender + Cycles" },
  { src: "/works/blue-perfume-01.jpg", pos: "50% 30%", t: "蓝色香氛瓶 · 水波光影", s: "Blender + Cycles" },
  { src: "/works/prop-weapon.jpg", pos: "50% 50%", t: "枪械道具 · 电影感布光", s: "Blender + Cycles" },
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

function useWorks() {
  const [works, setWorks] = useState(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      // 离线单文件预览时构建脚本会注入这个全局变量
      if (Array.isArray(window.__WORKS_JSON__)) {
        setWorks(window.__WORKS_JSON__);
        return;
      }
      try {
        const res = await fetch("/works.json", { cache: "no-cache" });
        const data = res.ok ? await res.json() : [];
        if (alive) setWorks(Array.isArray(data) ? data : []);
      } catch {
        if (alive) setWorks([]);
      }
    })();
    return () => {
      alive = false;
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
    { id: "featured", label: "精选" },
    { id: "works", label: "作品" },
    { id: "about", label: "关于" },
    { id: "caps", label: "能力" },
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
            <button key={l.id} className="nav-link" onClick={() => goTo(l.id)}>
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
  const cats = useMemo(() => {
    const set = new Set((works || []).map((w) => w.category).filter(Boolean));
    return ["全部", ...set];
  }, [works]);

  const list = useMemo(() => {
    const arr = (works || []).filter((w) => cat === "全部" || w.category === cat);
    return typeof limit === "number" ? arr.slice(0, limit) : arr;
  }, [works, cat, limit]);

  const count = (c) => (c === "全部" ? (works || []).length : (works || []).filter((w) => w.category === c).length);

  return (
    <>
      {showFilter && (
        <div className="filters">
          {cats.map((c) => (
            <button
              key={c}
              className={`chip${c === cat ? " is-active" : ""}`}
              onClick={() => setCat(c)}
            >
              {c}
              <span className="chip-n">{count(c)}</span>
            </button>
          ))}
        </div>
      )}

      <div className="grid-works">
        {list.map((w, k) => (
          <Reveal key={w.slug || w.id} delay={Math.min(k * 0.05, 0.25)}>
            <Link className="card" to={`/work/${w.slug}`}>
              <div className="card-media">
                <img
                  src={w.image}
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

      {list.length === 0 && (
        <p className="body-sm" style={{ padding: "48px 0" }}>这个分类下暂时没有作品。</p>
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
            </figure>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="about-col">
              <h3 className="h2">用渲染替代拍摄</h3>
              <p className="lede prose">
                1.5 年经验的独立 3D 艺术家，深耕 3D 建模与渲染领域。精通 Cinema 4D 与 Blender
                双软件工作流，熟练使用 Octane / Redshift / Cycles 等主流渲染器。
              </p>
              <p className="body-sm prose">
                聚焦广告设计方向，擅长产品视觉化与场景构建。习惯从需求理解、建模、材质、布光一路做到
                最终渲染交付的完整闭环；也提供整套电商视觉的批量交付，保证同一支产品在不同画面里
                材质与色温始终统一。
              </p>

              <div className="stats">
                {PROFILE.stats.map((s) => (
                  <div className="stat" key={s.label}>
                    <div className="stat-v">{s.value}</div>
                    <div className="stat-k">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 能力与工具 ---------------- */

function Capabilities() {
  return (
    <section className="section" id="caps">
      <div className="wrap">
        <SecHead num="04" title="我能做什么" note="Capabilities" />
        <div className="caps">
          {CAPABILITIES.map((c, k) => (
            <Reveal key={c.n} delay={0.05 * k}>
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
            {SOFTWARE.map((s) => (
              <span className="soft" key={s}>{s}</span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- 联系与页脚 ---------------- */

function Contact() {
  return (
    <section className="section" id="contact">
      <div className="wrap">
        <SecHead num="05" title="聊一聊" note="Contact" />
        <div className="contact">
          <Reveal>
            <div>
              <h3 className="h2" style={{ marginBottom: 18 }}>有产品想做成渲染图？</h3>
              <a className="contact-mail" href={`mailto:${PROFILE.email}`}>{PROFILE.email}</a>
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

function Home() {
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
      <Capabilities />
      <Contact />
    </>
  );
}

/* ---------------- 作品详情 ---------------- */

function WorkDetail() {
  const { slug } = useParams();
  const works = useWorks();
  const [active, setActive] = useState(null);

  const work = (works || []).find((w) => w.slug === slug);
  const images = work?.detail?.images || [];

  useEffect(() => {
    if (work) setActive(work.detail?.images?.[0] || null);
  }, [work]);

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

  return (
    <>
      <Nav />
      <div className="detail-hero">
        <div className="wrap">
          <Link className="alink" to="/" style={{ borderBottom: 0, paddingBottom: 0 }}>
            <IcBack />
            返回
          </Link>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", margin: "28px 0 14px" }}>
            <span className="mono mono-accent">{detail.category || work.category}</span>
            <span className="mono">{images.length} 张图</span>
          </div>
          <h1 className="h1" style={{ maxWidth: "20ch" }}>{detail.title || work.title}</h1>
        </div>
      </div>

      <div className="wrap">
        <Reveal>
          <div className="stage">
            {active && <img src={active} alt={detail.title || work.title} />}
          </div>
        </Reveal>
      </div>

      {images.length > 1 && (
        <div className="wrap" style={{ marginTop: 16 }}>
          <div className="thumbs">
            {images.map((img, k) => (
              <button
                key={k}
                className={`thumb${active === img ? " is-active" : ""}`}
                onClick={() => setActive(img)}
                aria-label={`查看第 ${k + 1} 张`}
              >
                <img src={img} alt="" loading="lazy" />
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

      {related.length > 0 && (
        <section className="section">
          <div className="wrap">
            <SecHead num="—" title="同分类其他作品" note={work.category} />
            <div className="grid-works">
              {related.map((w, k) => (
                <Reveal key={w.id} delay={0.05 * k}>
                  <Link className="card" to={`/work/${w.slug}`}>
                    <div className="card-media">
                      <img src={w.image} alt={w.title} loading="lazy"
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
function WorkListPage() {
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
