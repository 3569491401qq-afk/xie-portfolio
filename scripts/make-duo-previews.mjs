/**
 * 生成三份「双人作品集」结构预览（纯静态 HTML，用现有暗色影棚样式）
 *   1-author-switch.html  一套作品流 + 作者切换
 *   2-two-gates.html      首页选门 + 两条独立路径
 *   3-parallel.html       首页并列两位 + 作品分两栏
 *
 * 运行：node scripts/make-duo-previews.mjs
 */
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';

const ROOT = 'C:/Users/Administrator/xie-portfolio';
const OUT = `${ROOT}/public/previews`;
mkdirSync(OUT, { recursive: true });
copyFileSync(`${ROOT}/src/preview/preview.css`, `${OUT}/preview.css`);

const RATIO = (w, h) => {
  const r = w / h;
  const table = [['2/3', 0.667], ['4/5', 0.8], ['1/1', 1], ['3/4', 1.333], ['4/3', 1.333], ['16/9', 1.778]];
  return table.reduce((a, b) => (Math.abs(b[1] - r) < Math.abs(a[1] - r) ? b : a))[0];
};

/* ---------------- 数据 ---------------- */
const haoAspect = JSON.parse(readFileSync(`${OUT}/hao-aspect.json`, 'utf8'));
const haoRaw = JSON.parse(readFileSync(`${ROOT}/public/works.json`, 'utf8'));

const HAO = {
  key: 'hao', name: '谢曙浩', mark: '浩',
  role: '产品可视化 · 商业渲染',
  line: '主攻美妆日化类产品可视化，从建模、材质到布光渲染一次交付，画面按平台规范直接上架。',
  tel: '193 8854 5612', telRaw: '19388545612', wechat: 'xshxsh5218', email: '3569491401@qq.com',
  facts: [
    ['入行', '2025 年 · 自学'], ['接单方式', '自由职业'], ['客户来源', '设计公司'], ['擅长品类', '美妆日化'],
  ],
  skill: [
    ['建模', 'Blender / Cinema 4D 硬表面与产品建模，结构与倒角按实物还原'],
    ['渲染', 'Cycles 玻璃折射与液体次表面、Octane 布光、Eevee 实时场景'],
    ['交付', '同一支产品多底色、多景别成套输出，材质与色温保持统一'],
    ['动态', '4K 环绕镜头渲染后压 1080p 交付，含日夜双版本灯光'],
  ],
};

const YONG = {
  key: 'yong', name: '谢俊勇', mark: '勇',
  role: '产品渲染 · 视觉合成',
  line: '以 Cinema 4D 建模 + Octane Render 离线渲染为核心，配合 Photoshop 分通道合成，交付电商与广告视觉物料。',
  tel: '189 7390 0548', telRaw: '18973900548', wechat: 'hh2670815023', email: '',
  facts: [
    ['主工具', 'Cinema 4D'], ['渲染器', 'Octane Render'], ['后期', 'Photoshop 分层'], ['品类', '美妆 · 消费电子'],
  ],
  skill: [
    ['建模', 'Cinema 4D 硬表面产品建模，结构与细节还原'],
    ['渲染', 'Octane：玻璃折射、液体 SSS、金属各向异性、HDRI 环境光'],
    ['后期', 'Photoshop 分层合成，Beauty / Alpha / Shadow / AO / Reflection 通道'],
    ['规范', '天猫主图 800×800、首图白底无文字、详情页 750px 宽切图'],
  ],
};

const works = [
  ...haoRaw.map((w) => {
    const [aw, ah] = haoAspect[w.slug] || [4, 3];
    const ar = RATIO(aw, ah);
    return {
      author: 'hao', title: w.title, cat: w.category, ar,
      img: w.image, desc: w.desc, tags: w.detail?.tags || [],
      tool: w.detail?.category || '', href: `/work/${w.slug}`,
      wide: ar === '16/9',
    };
  }),
  ...JSON.parse(readFileSync(`${OUT}/junyong-works.json`, 'utf8')).map((w) => ({
    author: 'yong', title: w.title, cat: w.cat.replace(/ · /g, ' · '), ar: w.ar,
    img: w.img, video: w.video || '', size: w.size || '', desc: w.desc, tags: w.tags || [],
    tool: 'C4D + Octane', href: '', wide: w.wide || w.ar === '16/9',
    copy: true, // 临摹练习
  })),
];

const NAMES = { hao: HAO.name, yong: YONG.name };
const MARKS = { hao: HAO.mark, yong: YONG.mark };

/* ---------------- 公共片段 ---------------- */
const EXTRA_CSS = `
/* 本轮预览新增：杂志式网格 + 作者标记 + 可点联系卡 + 门页 */
.grid-works { grid-auto-flow: dense; }
.card-media { aspect-ratio: var(--ar, 4 / 3); }
.span2 { grid-column: span 2; }
@media (max-width: 1080px) { .span2 { grid-column: span 2; } }
@media (max-width: 560px) { .span2 { grid-column: span 1; } }
.author-chip {
  position: absolute; top: 14px; right: 14px; z-index: 2;
  width: 26px; height: 26px; display: grid; place-items: center;
  border-radius: 8px; font-size: 12px; font-weight: 600;
  border: 1px solid rgba(255,255,255,.16);
  background: rgba(6,8,10,.62); backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px); color: rgba(255,255,255,.9);
}
.author-chip.is-yong { border-color: var(--accent-line); background: var(--accent-dim); color: var(--accent); }
.copy-note {
  margin-top: 10px; font-family: var(--mono); font-size: 10px; letter-spacing: .1em;
  color: var(--ink-3); border-left: 2px solid var(--line-strong); padding-left: 9px;
}
.play-flag {
  position: absolute; left: 14px; bottom: 14px; z-index: 2;
  font-family: var(--mono); font-size: 10px; letter-spacing: .1em;
  padding: 5px 10px; border-radius: 999px;
  background: rgba(6,8,10,.62); border: 1px solid rgba(255,255,255,.14); color: rgba(255,255,255,.86);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
.cbtns { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 22px; }
.cbtn {
  display: inline-flex; flex-direction: column; gap: 4px; align-items: flex-start;
  padding: 13px 20px; border: 1px solid var(--line); border-radius: 12px;
  background: var(--surface-1); transition: border-color .25s var(--ease), transform .25s var(--ease);
}
.cbtn:hover { border-color: var(--accent-line); transform: translateY(-2px); }
.cbtn .k { font-family: var(--mono); font-size: 9.5px; letter-spacing: .16em; color: var(--ink-3); }
.cbtn .v { font-size: 14.5px; font-weight: 600; color: var(--ink); font-variant-numeric: tabular-nums; }
.cbtn.primary { background: var(--accent); border-color: var(--accent); }
.cbtn.primary .k { color: rgba(20,12,4,.62); } .cbtn.primary .v { color: #1a1005; }
.person-head { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
.person-mark {
  width: 46px; height: 46px; flex: none; display: grid; place-items: center;
  border: 1px solid var(--accent-line); background: var(--accent-dim);
  border-radius: 12px; color: var(--accent); font-size: 20px; font-weight: 600;
}
.skill { width: 100%; border-collapse: collapse; font-size: 13.5px; margin-top: 6px; }
.skill tr { border-bottom: 1px solid var(--line-soft); }
.skill tr:last-child { border-bottom: 0; }
.skill td { padding: 12px 0; vertical-align: top; color: var(--ink-2); line-height: 1.65; }
.skill td:first-child { width: 62px; color: var(--accent); font-weight: 600; font-family: var(--mono); font-size: 11.5px; letter-spacing: .1em; }
/* 门页 */
.gates { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: clamp(18px,2.4vw,30px); }
@media (max-width: 860px) { .gates { grid-template-columns: minmax(0,1fr); } }
.gate { position: relative; display: block; border: 1px solid var(--line); border-radius: var(--r-panel); overflow: hidden; background: var(--surface-1); }
.gate-media { aspect-ratio: 4 / 3; overflow: hidden; }
.gate-media img { width: 100%; height: 100%; object-fit: cover; transition: transform .7s var(--ease); }
.gate:hover .gate-media img { transform: scale(1.04); }
.gate-body { padding: clamp(20px,2.4vw,30px); }
.gate-name { font-size: clamp(1.5rem,2.6vw,2.1rem); font-weight: 700; color: var(--ink); letter-spacing: -.01em; }
.gate-go { position: absolute; right: clamp(18px,2vw,26px); bottom: clamp(20px,2.2vw,28px); font-family: var(--mono); font-size: 11px; letter-spacing: .14em; color: var(--accent); }
/* 双人首屏 */
.duo { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: clamp(18px,2.4vw,30px); }
@media (max-width: 860px) { .duo { grid-template-columns: minmax(0,1fr); } }
.duo-cell { border: 1px solid var(--line); border-radius: var(--r-panel); background: var(--surface-1); padding: clamp(18px,2vw,26px); }
.duo-cell .body-sm { margin-top: 10px; }
/* 简易灯箱（preview.css 里 .lb 默认就是 grid，静态页要自己控制显隐） */
.lb { display: none; }
.lb.on { display: grid; }
.lb-img { max-width: min(92vw, 1200px); max-height: 74vh; object-fit: contain; border-radius: var(--r-panel); }
.lb-desc { font-size: 13px; color: rgba(255,255,255,.66); max-width: 660px; line-height: 1.7; }
.lb-bar.is-bottom { justify-content: space-between; }
`;

const NAV = (active = '') => `
<header class="nav is-scrolled">
  <div class="wrap nav-inner">
    <a class="brand" href="#top" aria-label="回到顶部">
      <span class="brand-mark" aria-hidden="true">谢</span>
      <span class="brand-text">
        <span class="brand-name">谢曙浩 · 谢俊勇</span>
        <span class="brand-role">3D ARTIST DUO · PRODUCT VIZ</span>
      </span>
    </a>
    <nav class="nav-links" aria-label="主导航">
      ${[['works', '作品'], ['about', '关于'], ['process', '流程'], ['services', '服务'], ['contact', '联系']]
        .map(([id, label]) => `<button class="nav-link${active === id ? ' is-active' : ''}" data-go="${id}">${label}</button>`)
        .join('')}
      <a class="nav-auth" href="/admin">作者中心</a>
    </nav>
  </div>
</header>`;

const cardHTML = (w, i) => `
  <a class="card${w.wide ? ' span2' : ''}" style="--ar:${w.ar.replace('/', ' / ')}" href="${w.href || '#'}" data-i="${i}" data-author="${w.author}" data-cat="${w.cat}">
    <div class="card-media">
      <img src="${w.img}" alt="${w.title}" loading="lazy" />
      <span class="card-chip">${w.cat}</span>
      <span class="author-chip${w.author === 'yong' ? ' is-yong' : ''}" title="${NAMES[w.author]}">${MARKS[w.author]}</span>
      ${w.video ? `<span class="play-flag">▶ ${w.size || '动画'}</span>` : ''}
      <span class="card-go">View</span>
    </div>
    <div class="card-foot">
      <span class="card-idx">${String(i + 1).padStart(2, '0')}</span>
      <span class="card-title">${w.title}</span>
    </div>
    <p class="card-desc">${w.desc}</p>
    ${w.copy ? '<div class="copy-note">临摹练习 · 非商业原创</div>' : ''}
  </a>`;

const personBlock = (p) => `
  <div>
    <div class="person-head">
      <span class="person-mark">${p.mark}</span>
      <span>
        <span class="h3" style="display:block">${p.name}</span>
        <span class="mono" style="font-size:10.5px">${p.role}</span>
      </span>
    </div>
    <p class="body-sm prose">${p.line}</p>
    <table class="skill">${p.skill.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>
    <div class="cbtns">
      <a class="cbtn primary" href="tel:${p.telRaw}"><span class="k">电话 · 点一下拨出</span><span class="v">${p.tel}</span></a>
      <button class="cbtn" data-copy="${p.wechat}"><span class="k">微信 · 点一下复制</span><span class="v">${p.wechat}</span></button>
      ${p.email ? `<a class="cbtn" href="mailto:${p.email}"><span class="k">邮箱</span><span class="v">${p.email}</span></a>` : ''}
    </div>
  </div>`;

const SHARED_JS = `
const WORKS = ${JSON.stringify(works)};
const NAMES = ${JSON.stringify(NAMES)};
function go(id){ const el=document.getElementById(id); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); }
document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', async () => {
  const v = b.dataset.copy;
  try { await navigator.clipboard.writeText(v); } catch(e) {
    const t=document.createElement('textarea'); t.value=v; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
  }
  const k = b.querySelector('.k'), old = k.textContent; k.textContent = '已复制 ✓';
  setTimeout(() => { k.textContent = old; }, 1600);
}));
/* 简易灯箱：带描述与上一件/下一件，手机可左右滑 */
(function(){
  const wrap = document.createElement('div');
  wrap.className = 'lb'; wrap.innerHTML = \`
    <div class="lb-bar is-top"><div><div class="lb-title" id="lbT"></div><div class="lb-count" id="lbS"></div></div>
      <button class="lb-btn" id="lbX" aria-label="关闭">✕</button></div>
    <img class="lb-img" id="lbI" alt="" />
    <div class="lb-bar is-bottom"><span class="lb-desc" id="lbD"></span>
      <span style="display:flex;gap:8px"><button class="lb-btn" id="lbP" aria-label="上一件">←</button>
      <button class="lb-btn" id="lbN" aria-label="下一件">→</button></span></div>\`;
  document.body.appendChild(wrap);
  let cur = 0, pool = [];
  const paint = () => {
    const w = pool[cur]; if(!w) return;
    document.getElementById('lbT').textContent = w.title;
    document.getElementById('lbS').textContent = \`\${NAMES[w.author]} · \${w.cat} · \${cur+1} / \${pool.length}\`;
    document.getElementById('lbD').textContent = w.desc + (w.copy ? ' ｜ 临摹练习作品' : '');
    document.getElementById('lbI').src = w.img;
  };
  const show = (i) => { cur = (i + pool.length) % pool.length; paint(); wrap.classList.add('on'); document.body.style.overflow='hidden'; };
  const hide = () => { wrap.classList.remove('on'); document.body.style.overflow=''; };
  document.getElementById('lbX').onclick = hide;
  document.getElementById('lbP').onclick = (e) => { e.stopPropagation(); show(cur-1); };
  document.getElementById('lbN').onclick = (e) => { e.stopPropagation(); show(cur+1); };
  wrap.addEventListener('click', (e) => { if (e.target === wrap) hide(); });
  document.addEventListener('keydown', (e) => {
    if (!wrap.classList.contains('on')) return;
    if (e.key === 'Escape') hide(); if (e.key === 'ArrowLeft') show(cur-1); if (e.key === 'ArrowRight') show(cur+1);
  });
  let tx = 0, ty = 0;
  wrap.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, {passive:true});
  wrap.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty;
    if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.8) show(cur + (dx < 0 ? 1 : -1));
  }, {passive:true});
  window.openLightbox = (list, i) => { pool = list; show(i); };
})();
`;

const shell = (title, body, extraJs = '') => `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>${title}</title>
<link rel="stylesheet" href="/previews/preview.css" />
<style>${EXTRA_CSS}</style>
</head>
<body id="top">
${body}
<script>${SHARED_JS}${extraJs}</script>
</body>
</html>`;

const secHead = (num, title, note) => `
<div class="sec-head"><span class="sec-num">${num}</span><h2 class="sec-title">${title}</h2><span class="sec-rule"></span><span class="sec-note">${note}</span></div>`;

const HERO_HAO = works.find((w) => w.author === 'hao');
const HERO_YONG = works.find((w) => w.author === 'yong' && w.video) || works.find((w) => w.author === 'yong');

const STATS = `
<div class="hero-stats">
  <div><div class="stat-n">2</div><div class="stat-l">位作者</div></div>
  <div><div class="stat-n">${works.length}</div><div class="stat-l">件作品</div></div>
  <div><div class="stat-n">7</div><div class="stat-l">款软件</div></div>
</div>`;

/* ---------------- ① 一套作品流 + 作者切换 ---------------- */
const page1 = () => {
  const cats = ['全部', ...new Set(works.map((w) => w.cat))];
  return shell('结构① 一套作品流 + 作者切换 · 双人作品集预览', `
${NAV('works')}
<section class="hero">
  <div class="hero-panel">
    <span class="status"><span class="status-dot"></span><span class="status-text">Available for work</span></span>
    <div>
      <p class="hero-role" style="margin:0 0 14px">3D ARTIST DUO — 产品可视化 · 商业渲染</p>
      <h1 class="display">谢曙浩<br />谢俊勇</h1>
    </div>
    <p class="lede prose">两个人的作品放在一起：一套筛选、一条合作流程。你按品类和材质挑画面，卡片右上角的小字标出这件是谁做的。</p>
    <div class="hero-cta">
      <button class="btn btn-accent" data-go="works">查看作品</button>
      <button class="btn btn-ghost" data-go="contact">联系我</button>
    </div>
    ${STATS}
  </div>
  <div class="hero-stage">
    <div class="hero-slide is-active"><img src="${works[0].img}" alt="${works[0].title}" style="object-position:50% 52%" />
      <div class="hero-caption"><div><div class="hero-caption-t">${works[0].title}</div><div class="hero-caption-s">${NAMES.hao} · 美妆个护</div></div></div>
    </div>
  </div>
</section>

<section class="section" id="works">
  <div class="wrap">
    ${secHead('01', '全部作品', `${works.length} works`)}
    <div class="filters" id="authorFilter">
      <button class="chip is-active" data-a="全部">全部 <span class="chip-n">${works.length}</span></button>
      <button class="chip" data-a="hao">${HAO.name} <span class="chip-n">${works.filter(w=>w.author==='hao').length}</span></button>
      <button class="chip" data-a="yong">${YONG.name} <span class="chip-n">${works.filter(w=>w.author==='yong').length}</span></button>
    </div>
    <div class="filters" id="catFilter">
      ${cats.map((c, i) => `<button class="chip${i ? '' : ' is-active'}" data-c="${c}">${c}<span class="chip-n">${c === '全部' ? works.length : works.filter(w=>w.cat===c).length}</span></button>`).join('')}
    </div>
    <div class="grid-works" id="grid">${works.map(cardHTML).join('')}</div>
  </div>
</section>

<section class="section" id="about">
  <div class="wrap">
    ${secHead('02', '关于我们', 'About')}
    <div class="duo">
      <div class="duo-cell">${personBlock(HAO)}</div>
      <div class="duo-cell">${personBlock(YONG)}</div>
    </div>
  </div>
</section>

<section class="section" id="process">
  <div class="wrap">
    ${secHead('03', '合作流程', 'Process')}
    <p class="lede prose">两个人共用一套流程，谁接单都是这四步。</p>
    <div class="process">
      ${[['01','需求沟通','确认产品实物或图纸、投放平台与规范、参考风格，以及最终需要的画面清单。'],
         ['02','建模与材质','按实物比例搭建模型，还原结构、倒角与细节，再逐层调出玻璃、液体、金属等材质。'],
         ['03','布光与渲染','按商业摄影思路布置光位与环境，输出多角度多景别，保证同一支产品统一。'],
         ['04','交付与调整','按平台规范导出交付，附分层文件；根据反馈做必要调整，直到画面能直接上架。']]
        .map(([n,t,d]) => `<div class="cap"><span class="cap-n">${n}</span><h4 class="h3">${t}</h4><p class="body-sm" style="font-size:13.5px">${d}</p></div>`).join('')}
    </div>
  </div>
</section>

<section class="section" id="services">
  <div class="wrap">
    ${secHead('04', '服务范围', 'Services')}
    <p class="lede prose">从一张产品主图到整套详情页视觉都可以接。只要模型不要渲染也行。</p>
    <div class="services">
      ${[['01','产品静物渲染','按商业摄影思路搭建产品静物，画面可直接用于电商主图与详情页。'],
         ['02','场景搭建与布光','环境、道具、光位全部手工搭建，用光线本身塑造质感。'],
         ['03','白底主图','干净的纯色与白底产品图，按平台规范导出。'],
         ['04','详情页套图','一次交付整套视觉：主图、场景图、细节特写，多图材质与色温统一。'],
         ['05','纯 3D 建模','只要模型不要渲染也可以，交付可继续加工的工程文件。'],
         ['06','动画与动态','360° 旋转展示、产品拆解动画、短广告动态。']]
        .map(([n,t,d]) => `<div class="cap"><span class="cap-n">${n}</span><h4 class="h3">${t}</h4><p class="body-sm" style="font-size:13.5px">${d}</p></div>`).join('')}
    </div>
  </div>
</section>

<section class="section" id="contact">
  <div class="wrap">
    ${secHead('05', '聊一聊', 'Contact')}
    <div class="duo">
      <div class="duo-cell"><p class="body-sm" style="margin-bottom:4px">美妆日化、场景动画、整套交付找我。</p>${personBlock(HAO)}</div>
      <div class="duo-cell"><p class="body-sm" style="margin-bottom:4px">产品渲染、分通道合成、电商切图找他。</p>${personBlock(YONG)}</div>
    </div>
    <div class="foot"><span class="mono">© 2026 谢曙浩 · 谢俊勇 · 结构预览①</span><span class="mono">本页仅用于对比结构，未发布</span></div>
  </div>
</section>
`, `
(function(){
  let a='全部', c='全部';
  const grid=document.getElementById('grid');
  const apply=()=>{
    const list=[];
    [...grid.children].forEach((el,i)=>{
      const w=WORKS[i];
      const ok=(a==='全部'||w.author===a)&&(c==='全部'||w.cat===c);
      el.style.display=ok?'':'none'; if(ok) list.push({el,w});
    });
    grid.dataset.order=list.map(x=>x.w.title).join('|');
    grid.onclick=(e)=>{
      const card=e.target.closest('.card'); if(!card) return;
      e.preventDefault();
      const shown=list.map(x=>x.w);
      window.openLightbox(shown, shown.indexOf(WORKS[+card.dataset.i]));
    };
  };
  const bind=(root, key)=>root.addEventListener('click',(e)=>{
    const b=e.target.closest('.chip'); if(!b) return;
    root.querySelectorAll('.chip').forEach(x=>x.classList.remove('is-active'));
    b.classList.add('is-active');
    if(key==='a') a=b.dataset.a; else c=b.dataset.c;
    apply();
  });
  bind(document.getElementById('authorFilter'),'a');
  bind(document.getElementById('catFilter'),'c');
})();
`);
};

/* ---------------- ② 首页选门 + 两条独立路径 ---------------- */
const personPage = (p, list) => `
<section class="hero">
  <div class="hero-panel">
    <span class="status"><span class="status-dot"></span><span class="status-text">${p.name} · 可接项目</span></span>
    <div>
      <p class="hero-role" style="margin:0 0 14px">${p.role}</p>
      <h1 class="display">${p.name}</h1>
    </div>
    <p class="lede prose">${p.line}</p>
    <div class="hero-cta">
      <button class="btn btn-accent" data-go="works">查看作品</button>
      <a class="btn btn-ghost" href="#gate">换一位 →</a>
    </div>
    <div class="hero-stats">
      <div><div class="stat-n">${list.length}</div><div class="stat-l">件作品</div></div>
      <div><div class="stat-n">${new Set(list.map(w=>w.cat)).size}</div><div class="stat-l">个品类</div></div>
      <div><div class="stat-n">${list.filter(w=>w.video).length || '—'}</div><div class="stat-l">段动画</div></div>
    </div>
  </div>
  <div class="hero-stage">
    <div class="hero-slide is-active"><img src="${list[0].img}" alt="${list[0].title}" style="object-position:50% 52%" />
      <div class="hero-caption"><div><div class="hero-caption-t">${list[0].title}</div><div class="hero-caption-s">${list[0].cat}</div></div></div>
    </div>
  </div>
</section>
<section class="section" id="works">
  <div class="wrap">
    ${secHead('01', '全部作品', `${list.length} works`)}
    <div class="grid-works" data-person="${p.key}">${list.map((w, i) => cardHTML(w, i)).join('')}</div>
  </div>
</section>
<section class="section" id="about">
  <div class="wrap">
    ${secHead('02', '关于我', 'About')}
    <div class="duo"><div class="duo-cell">${personBlock(p)}</div>
      <div class="duo-cell"><p class="body-sm prose">${p.facts.map(([k, v]) => `<b style="color:var(--ink)">${k}</b>　${v}`).join('<br />')}</p></div>
    </div>
  </div>
</section>`;

const page2 = () => {
  const haoList = works.filter((w) => w.author === 'hao');
  const yongList = works.filter((w) => w.author === 'yong');
  return shell('结构② 首页选门 + 两条独立路径 · 双人作品集预览', `
${NAV()}
<div id="gate" class="section" style="padding-top:clamp(110px,14vw,170px)">
  <div class="wrap">
    ${secHead('00', '找谁', 'Choose')}
    <p class="lede prose" style="margin-bottom:clamp(28px,3.4vw,44px)">同一个站点，两条独立的作品集。先看画面，再决定找谁。</p>
    <div class="gates">
      <a class="gate" href="#/hao">
        <div class="gate-media"><img src="${haoList[0].img}" alt="${haoList[0].title}" /></div>
        <div class="gate-body">
          <div class="gate-name">${HAO.name}</div>
          <span class="mono" style="font-size:10.5px">${HAO.role}</span>
          <p class="body-sm" style="margin-top:12px">${haoList.length} 件作品 · 美妆日化为主 · 含环绕动画</p>
        </div>
        <span class="gate-go">进入 →</span>
      </a>
      <a class="gate" href="#/yong">
        <div class="gate-media"><img src="${yongList[0].img}" alt="${yongList[0].title}" /></div>
        <div class="gate-body">
          <div class="gate-name">${YONG.name}</div>
          <span class="mono" style="font-size:10.5px">${YONG.role}</span>
          <p class="body-sm" style="margin-top:12px">${yongList.length} 件作品 · 美妆与消费电子 · 含 2 段动画</p>
        </div>
        <span class="gate-go">进入 →</span>
      </a>
    </div>
  </div>
</div>
<div id="view-hao" hidden>${personPage(HAO, haoList)}</div>
<div id="view-yong" hidden>${personPage(YONG, yongList)}</div>
<section class="section" id="process">
  <div class="wrap">
    ${secHead('03', '合作流程', 'Process')}
    <div class="process">
      ${[['01','需求沟通','确认实物、平台规范与参考风格。'],['02','建模与材质','按实物比例还原结构与材质。'],
         ['03','布光与渲染','多角度多景别输出，保持统一。'],['04','交付与调整','按规范导出，附分层文件。']]
        .map(([n,t,d]) => `<div class="cap"><span class="cap-n">${n}</span><h4 class="h3">${t}</h4><p class="body-sm" style="font-size:13.5px">${d}</p></div>`).join('')}
    </div>
  </div>
</section>
<section class="section" id="services"><div class="wrap">${secHead('04','服务范围','Services')}
  <div class="services">${[['01','产品静物渲染','可直接用于主图与详情页。'],['02','场景搭建与布光','光位与道具手工搭建。'],['03','白底主图','按平台规范导出。'],['04','详情页套图','多图材质与色温统一。'],['05','纯 3D 建模','交付工程文件。'],['06','动画与动态','旋转展示与短广告。']]
  .map(([n,t,d]) => `<div class="cap"><span class="cap-n">${n}</span><h4 class="h3">${t}</h4><p class="body-sm" style="font-size:13.5px">${d}</p></div>`).join('')}</div></div></section>
<section class="section" id="contact">
  <div class="wrap">
    ${secHead('05', '聊一聊', 'Contact')}
    <div class="duo">
      <div class="duo-cell">${personBlock(HAO)}</div>
      <div class="duo-cell">${personBlock(YONG)}</div>
    </div>
    <div class="foot"><span class="mono">© 2026 谢曙浩 · 谢俊勇 · 结构预览②</span><span class="mono">本页仅用于对比结构，未发布</span></div>
  </div>
</section>
`, `
(function(){
  const views = { '': 'gate', hao: 'view-hao', yong: 'view-yong' };
  const route = () => {
    const key = (location.hash.replace('#/', '') || '').trim();
    const showId = views[key] || 'gate';
    ['gate','view-hao','view-yong'].forEach(id => { document.getElementById(id).hidden = (id !== showId); });
    document.querySelectorAll('.nav-link').forEach(b => {
      b.onclick = () => {
        const id = b.dataset.go;
        if (id === 'works' && !key) { location.hash = '#/hao'; return; }
        go(id);
      };
    });
    window.scrollTo(0, 0);
  };
  window.addEventListener('hashchange', route); route();
  document.querySelectorAll('[data-person]').forEach(grid => {
    const list = WORKS.filter(w => w.author === grid.dataset.person);
    grid.addEventListener('click', (e) => {
      const c = e.target.closest('.card'); if (!c) return;
      e.preventDefault(); window.openLightbox(list, +c.dataset.i);
    });
  });
})();
`);
};

/* ---------------- ③ 首页并列两位 + 作品分两栏 ---------------- */
const page3 = () => {
  const haoList = works.filter((w) => w.author === 'hao');
  const yongList = works.filter((w) => w.author === 'yong');
  const block = (p, list, num) => `
<section class="section" id="works-${p.key}">
  <div class="wrap">
    ${secHead(num, `${p.name}的作品`, `${list.length} works · ${p.role}`)}
    <div class="person-head" style="margin-bottom:26px">
      <span class="person-mark">${p.mark}</span>
      <p class="body-sm" style="margin:0">${p.line}</p>
    </div>
    <div class="grid-works" data-person="${p.key}">${list.map((w, i) => cardHTML(w, i)).join('')}</div>
  </div>
</section>`;
  return shell('结构③ 首页并列两位 + 作品分两栏 · 双人作品集预览', `
${NAV('works')}
<section class="hero">
  <div class="hero-panel">
    <span class="status"><span class="status-dot"></span><span class="status-text">Available for work · 两人</span></span>
    <div>
      <p class="hero-role" style="margin:0 0 14px">3D ARTIST DUO — 产品可视化 · 商业渲染</p>
      <h1 class="display">两个人的<br />产品渲染</h1>
    </div>
    <p class="lede prose">一间两人的产品渲染工作室。首页就把两位摆在一起，往下各自一整栏作品，谁做什么品类一眼分清。</p>
    ${STATS}
  </div>
  <div class="hero-stage">
    <div class="hero-slide is-active"><img src="${yongList[1].img}" alt="${yongList[1].title}" style="object-position:50% 50%" />
      <div class="hero-caption"><div><div class="hero-caption-t">${yongList[1].title}</div><div class="hero-caption-s">${YONG.name} · ${yongList[1].cat}</div></div></div>
    </div>
  </div>
</section>
<div class="section" style="padding-top:0;border-top:0">
  <div class="wrap"><div class="duo">
    <a class="gate" href="#works-hao"><div class="gate-media"><img src="${haoList[0].img}" alt="" /></div>
      <div class="gate-body"><div class="gate-name">${HAO.name}</div><span class="mono" style="font-size:10.5px">${HAO.role}</span>
      <p class="body-sm" style="margin-top:12px">${haoList.length} 件作品 · 含樱花街角环绕动画</p></div><span class="gate-go">看作品 →</span></a>
    <a class="gate" href="#works-yong"><div class="gate-media"><img src="${yongList[0].img}" alt="" /></div>
      <div class="gate-body"><div class="gate-name">${YONG.name}</div><span class="mono" style="font-size:10.5px">${YONG.role}</span>
      <p class="body-sm" style="margin-top:12px">${yongList.length} 件作品 · 含 2 段产品动画</p></div><span class="gate-go">看作品 →</span></a>
  </div></div>
</div>
${block(HAO, haoList, '01')}
${block(YONG, yongList, '02')}
<section class="section" id="about">
  <div class="wrap">
    ${secHead('03', '关于我们', 'About')}
    <div class="duo"><div class="duo-cell">${personBlock(HAO)}</div><div class="duo-cell">${personBlock(YONG)}</div></div>
  </div>
</section>
<section class="section" id="process">
  <div class="wrap">${secHead('04','合作流程','Process')}
    <div class="process">${[['01','需求沟通','确认实物、平台规范与参考风格。'],['02','建模与材质','按实物比例还原结构与材质。'],['03','布光与渲染','多角度多景别输出，保持统一。'],['04','交付与调整','按规范导出，附分层文件。']]
      .map(([n,t,d]) => `<div class="cap"><span class="cap-n">${n}</span><h4 class="h3">${t}</h4><p class="body-sm" style="font-size:13.5px">${d}</p></div>`).join('')}</div>
  </div>
</section>
<section class="section" id="services"><div class="wrap">${secHead('05','服务范围','Services')}
  <div class="services">${[['01','产品静物渲染','可直接用于主图与详情页。'],['02','场景搭建与布光','光位与道具手工搭建。'],['03','白底主图','按平台规范导出。'],['04','详情页套图','多图材质与色温统一。'],['05','纯 3D 建模','交付工程文件。'],['06','动画与动态','旋转展示与短广告。']]
    .map(([n,t,d]) => `<div class="cap"><span class="cap-n">${n}</span><h4 class="h3">${t}</h4><p class="body-sm" style="font-size:13.5px">${d}</p></div>`).join('')}</div></div></section>
<section class="section" id="contact">
  <div class="wrap">
    ${secHead('06', '聊一聊', 'Contact')}
    <div class="duo"><div class="duo-cell"><p class="body-sm" style="margin-bottom:4px">美妆日化、场景动画、整套交付找我。</p>${personBlock(HAO)}</div>
      <div class="duo-cell"><p class="body-sm" style="margin-bottom:4px">产品渲染、分通道合成、电商切图找他。</p>${personBlock(YONG)}</div></div>
    <div class="foot"><span class="mono">© 2026 谢曙浩 · 谢俊勇 · 结构预览③</span><span class="mono">本页仅用于对比结构，未发布</span></div>
  </div>
</section>
`, `
document.querySelectorAll('[data-person]').forEach(grid => {
  const list = WORKS.filter(w => w.author === grid.dataset.person);
  grid.addEventListener('click', (e) => {
    const c = e.target.closest('.card'); if (!c) return;
    e.preventDefault(); window.openLightbox(list, +c.dataset.i);
  });
});
document.querySelectorAll('.gate').forEach(g => g.addEventListener('click', (e) => {
  e.preventDefault(); go(g.getAttribute('href').slice(1));
}));
`);
};

writeFileSync(`${OUT}/1-author-switch.html`, page1());
writeFileSync(`${OUT}/2-two-gates.html`, page2());
writeFileSync(`${OUT}/3-parallel.html`, page3());
console.log('已生成三份预览：', works.length, '件作品（浩', works.filter(w=>w.author==='hao').length, '/ 勇', works.filter(w=>w.author==='yong').length, '）');
