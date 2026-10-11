import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Routes, Route, Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Mail, Phone, MapPin, ExternalLink, ArrowLeft,
  Box, Layers, Cpu, Eye, ArrowDown, Settings, LogOut,
  Plus, Trash2, Edit3, X, Image as ImageIcon, Lock,
  Upload, Check, ChevronLeft, ChevronRight,
  Star, AlertTriangle, Download, RotateCcw, Video
} from "lucide-react";
import {
  loadWorks,
  getCachedWorks,
  saveWorks,
  subscribe,
  discardDraft,
  pullFromRemote,
  hasUnpublishedChanges,
  getGhConfig,
  saveGhConfig,
  clearGhConfig,
  publishWorks,
  compressImageFile,
  getBackend,
  mediaOf,
  coverOf,
  isVideoFile,
  readAsDataUrl,
  makeVideoPoster,
  toEmbedUrl,
} from "./worksStore.js";
// 工作室版视觉（原本只在 preview.html 里）。现在直接作为主站的公开页面，
// 作者中心 / 登录仍用下面 Tailwind 的老组件。
import {
  Home as StudioHome,
  WorkDetail as StudioWorkDetail,
  WorkListPage as StudioWorkList,
} from "./preview/StudioPreview.jsx";
import "./preview/preview.css";

// --- 错误边界组件 ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('React Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          background: '#0a0a0a', 
          color: 'white', 
          padding: '40px 20px', 
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '20px', fontWeight: 'bold' }}>页面加载异常</h1>
          <p style={{ color: '#ff6b6b', marginBottom: '20px', fontSize: '14px' }}>错误信息：</p>
          <pre style={{ 
            background: '#1a1a1a', 
            padding: '20px', 
            borderRadius: '8px', 
            fontSize: '13px', 
            overflow: 'auto',
            maxWidth: '100%',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all'
          }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            style={{ 
              marginTop: '20px', 
              padding: '12px 24px', 
              background: 'white', 
              color: 'black', 
              border: 'none', 
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            刷新页面
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- 数据 ---
const PROFILE = {
  name: "谢曙浩",
  title: "3D Artist / 3D建模师",
  tagline: "光影重构现实 · 极致视觉表达",
  bio: "1.5年经验的独立3D艺术家，深耕3D建模与渲染领域。精通Cinema 4D与Blender双软件工作流，熟练使用Octane/Redshift/Cycles等主流渲染器。聚焦广告设计方向，擅长产品视觉化与场景构建，追求照片级渲染品质。",
  contact: {
    phone: "193 8854 5612",
    email: "3569491401@qq.com",
    city: "China",
    portfolio: "#"
  },
  // 口径按作者确认的实际情况：2025 年起自学、自由职业接单、累计十余单
  stats: [
    { label: "从业年限", value: "1.5+" },
    { label: "项目交付", value: "十余单" },
    { label: "精通软件", value: "6+" },
  ]
};

const AUTHOR_ACCOUNT = {
  username: "谢曙浩",
  password: "20080521"
};

const SKILLS = [
  { name: "Cinema 4D", level: 95, icon: <Box size={20} /> },
  { name: "Blender", level: 90, icon: <Layers size={20} /> },
  { name: "Octane Render", level: 85, icon: <Cpu size={20} /> },
  { name: "Redshift", level: 80, icon: <Cpu size={20} /> },
  { name: "Cycles", level: 85, icon: <Eye size={20} /> },
  { name: "Eevee", level: 80, icon: <Eye size={20} /> },
];

// --- 图片资源 ---
// 展示图统一放在 public/works/，由 scripts/optimize-images.py 生成
// （最长边 1800px / JPEG q82 / 已剥离元数据）。
// 原始大图与 .blend 等工程文件在 assets-src/，不参与打包、不入库。
const IMG = {
  // 美妆个护
  perfume: "/works/perfume-coco.jpg",              // COCO 香水 · 岩石静物
  cocoGray: "/works/coco-studio-gray.jpg",         // COCO · 渐变灰底主图
  cocoWhite: "/works/coco-studio-white.jpg",       // COCO · 白底主图
  cocoGlass: "/works/coco-studio-glass.jpg",       // COCO · 玻璃质感特写
  cocoLabel: "/works/coco-studio-label.jpg",       // COCO · 标签特写
  serum: "/works/serum-dropper.jpg",               // 精华液滴管瓶（SWY）
  essentialOil: "/works/essential-oil.jpg",        // 精油瓶 · 木桩场景
  bluePerfume1: "/works/blue-perfume-01.jpg",      // 蓝色香氛瓶 · 水波光影
  bluePerfume2: "/works/blue-perfume-02.jpg",
  bluePerfume3: "/works/blue-perfume-03.jpg",
  parfumA0: "/works/parfum-a0.jpg",                // PARFUM 商用交付套图
  parfumA1: "/works/parfum-a1.jpg",
  parfumA2: "/works/parfum-a2.jpg",
  parfumA3: "/works/parfum-a3.jpg",
  parfumA4: "/works/parfum-a4.jpg",
  parfumB1: "/works/parfum-b1.jpg",
  parfumB2: "/works/parfum-b2.jpg",
  parfumB3: "/works/parfum-b3.jpg",
  parfumB4: "/works/parfum-b4.jpg",
  // 食品饮料
  gummy: "/works/gummy-candy.jpg",                 // 软糖 · 玻璃罐倾倒
  shell: "/works/shell-study.jpg",                 // 贝壳薯片 · 材质研究
  // 3C数码
  gamepad: "/works/gamepad-retro.jpg",             // 复古游戏手柄 · 蓝幕
  gogglesHero: "/works/goggles-hero.jpg",          // 滑雪镜 · 白底主图
  gogglesFront: "/works/goggles-front.jpg",        // 滑雪镜 · 正面
  gogglesVsReal: "/works/goggles-vs-real.jpg",     // 滑雪镜 · 渲染与实拍比对
  // 硬表面与场景
  weapon: "/works/prop-weapon.jpg",                // 枪械道具 · 静物场景
  weaponAlt: "/works/weapon-neutral.jpg",          // 枪械道具 · 中性底构图
  geometry: "/works/scene-geometry.jpg",           // 极简几何场景 · 暖橙
};

// 所有作品数据
const ALL_WORKS = [
  {
    id: 1,
    title: "COCO 香水静物渲染",
    category: "美妆个护",
    image: IMG.perfume,
    desc: "玻璃折射 · 琥珀香液 · 硬光投影",
    slug: "coco-perfume",
    detail: {
      title: "COCO 香水商业静物渲染",
      category: "Blender + Cycles",
      description:
        "同一支香水瓶的两组打法。外景组以粗粝岩石与水泥墙面搭建场景，重点表现玻璃瓶体的通透折射、背光下香液的琥珀色散射，以及横穿场地的硬光投影；棚拍组则用渐变灰底、纯白底与背光暗场，把瓶盖水晶切割面、标签与玻璃厚度逐个拆开呈现。玻璃的光滑与石材的粗粝形成材质反差，是这组渲染的核心课题。",
      tags: ["玻璃材质", "折射表现", "硬光投影", "静物构图"],
      images: [
        IMG.perfume,
        IMG.cocoGray,
        IMG.cocoGlass,
        IMG.cocoWhite,
        IMG.cocoLabel,
      ],
    },
  },
  {
    id: 2,
    title: "精华液滴管瓶渲染",
    category: "美妆个护",
    image: IMG.serum,
    desc: "半透玻璃 · 暖调背景 · 高光控制",
    slug: "serum-dropper",
    detail: {
      title: "精华液滴管瓶商业渲染",
      category: "C4D + Octane",
      description:
        "精华液滴管瓶产品可视化。重点攻克厚壁玻璃的通透感、管口橡胶头的哑光质感，以及暖色背景下轮廓光的塑形作用，让瓶体边缘从背景中清晰地剥离出来。",
      tags: ["厚壁玻璃", "半透材质", "轮廓光", "产品可视化"],
      images: [IMG.serum],
    },
  },
  {
    id: 3,
    title: "精油产品场景渲染",
    category: "美妆个护",
    image: IMG.essentialOil,
    desc: "木桩场景 · 树影投射 · 自然光",
    slug: "essential-oil",
    detail: {
      title: "精油产品场景化渲染",
      category: "Blender + Cycles",
      description:
        "将精油瓶置于原木桩与苔藓之间，用模拟树冠间隙的斑驳光影营造自然感。重点在于玻璃瓶身对周围环境的反射、瓶内液体的次表面散射，以及投影与产品之间的空间关系。",
      tags: ["场景搭建", "树影光影", "次表面散射", "自然光模拟"],
      images: [IMG.essentialOil],
    },
  },
  {
    id: 4,
    title: "蓝色香氛瓶 · 水波光影",
    category: "美妆个护",
    image: IMG.bluePerfume1,
    // 竖构图作品：卡片是 4:3，把裁切焦点上移，保证瓶盖不被切掉
    imagePos: "50% 14%",
    desc: "水波承托 · 冷调背光 · 倒影控制",
    slug: "blue-perfume",
    detail: {
      title: "蓝色香氛瓶 · 水波与背光渲染",
      category: "Blender + Cycles",
      description:
        "把香水瓶置于一圈缓缓扩散的水波纹上，用瓶底正下方的冷色背光把玻璃打出通透的边缘光，再靠水面的环形反射承接倒影。重点是让反射和折射同时成立而不互相打架，前后迭代了几轮布光才把瓶身的通透感与割面高光同时留住。",
      tags: ["玻璃通透", "水面反射", "背光塑形", "布光迭代"],
      images: [IMG.bluePerfume1, IMG.bluePerfume2, IMG.bluePerfume3],
    },
  },
  {
    id: 5,
    title: "PARFUM 香氛商用交付套图",
    category: "美妆个护",
    image: IMG.parfumA0,
    imagePos: "50% 14%",
    desc: "整套商用交付 · A/B 两版共 9 张",
    slug: "parfum-delivery",
    detail: {
      title: "PARFUM 香氛产品商用交付套图",
      category: "Blender + Cycles",
      description:
        "一次完整的电商商用交付：按平台规范输出 A、B 两套视觉，共 9 张——商品全景、场景主图、白底主图、渐变灰场景，以及标签、瓶盖、玻璃质感、液体焦散等特写。这一组的重点不在单张画面，而在于保证同一支产品在不同底色、不同景别、不同焦段下材质与色温始终统一。",
      tags: ["商用交付", "多图统一性", "白底主图", "材质特写"],
      images: [
        IMG.parfumA0,
        IMG.parfumA1,
        IMG.parfumA4,
        IMG.parfumA3,
        IMG.parfumA2,
        IMG.parfumB1,
        IMG.parfumB2,
        IMG.parfumB4,
        IMG.parfumB3,
      ],
    },
  },
  {
    id: 6,
    title: "软糖产品渲染",
    category: "食品饮料",
    image: IMG.gummy,
    desc: "半透胶质 · 玻璃罐 · 极简白底",
    slug: "gummy-candy",
    detail: {
      title: "软糖产品商业渲染",
      category: "C4D + Octane",
      description:
        "软糖颗粒产品可视化。重点表现胶体的半透明质感与内部散射、表面高光与蜜蜡感，以及倾倒的玻璃罐与散落颗粒之间的构图关系。白底场景要求极高的材质还原度。",
      tags: ["半透胶质", "次表面散射", "玻璃器皿", "白底商拍"],
      images: [IMG.gummy],
    },
  },
  {
    id: 7,
    title: "贝壳薯片产品渲染",
    category: "食品饮料",
    image: IMG.shell,
    desc: "卷曲薯片 · 盐粒肌理 · 高饱和撞色",
    slug: "shell-study",
    detail: {
      title: "贝壳形薯片商业渲染",
      category: "Blender + Cycles",
      description:
        "一组以休闲食品为主体的产品渲染。薯片做成贝壳状，卷曲的边缘和螺旋起伏是这张图的核心 —— 要为这种连续曲面还原表面的细微起伏、边缘的锯齿切口，以及附着在起伏上的盐粒与调味粉。用微距构图压到单片上，让形体和肌理同时占满画面；橙黄渐变配高饱和黄底，把「脆」的质感靠反光和色阶层次做出来。",
      tags: ["程序化纹理", "微距构图", "肌理还原", "材质研究"],
      images: [IMG.shell],
    },
  },
  {
    id: 8,
    title: "复古游戏手柄渲染",
    category: "3C数码",
    image: IMG.gamepad,
    desc: "上下分体 · 蓝幕背景 · 产品悬浮",
    slug: "retro-gamepad",
    detail: {
      title: "复古游戏手柄商业渲染",
      category: "Blender + Cycles",
      description:
        "以红白机手柄为原型的产品渲染。将手柄拆分为上下两片悬浮排布，展示外壳、十字键、橡胶按键与内部结构的关系。纯色蓝幕背景用于突出产品的灰白配色与红色点缀。",
      tags: ["硬表面建模", "产品拆解", "悬浮构图", "纯色背景"],
      images: [IMG.gamepad],
    },
  },
  {
    id: 9,
    title: "滑雪镜产品渲染",
    category: "3C数码",
    image: IMG.gogglesHero,
    desc: "镜面镀膜 · 结构还原 · 与实拍比对",
    slug: "ski-goggles",
    detail: {
      title: "滑雪镜产品渲染与实拍比对",
      category: "Blender + Cycles",
      description:
        "按实物滑雪镜建模渲染，难点集中在镜片的虹彩镀膜——需要在同一张面上同时做出随视角偏移的渐变反射、透过镜片的高光灼烧感，以及镜框包胶与头带泡棉的哑光反差。最后一张是同机位渲染图与原物实拍的并置比对，用来验证镜片色相、镜框弧度和整体比例是否还原到位。",
      tags: ["虹彩镀膜", "视角依赖反射", "实物还原", "渲染实拍比对"],
      images: [IMG.gogglesHero, IMG.gogglesFront, IMG.gogglesVsReal],
    },
  },
  {
    id: 10,
    title: "枪械道具静物渲染",
    category: "硬表面与场景",
    image: IMG.weapon,
    desc: "锈蚀金属 · 弹壳信标 · 电影感布光",
    slug: "prop-weapon",
    detail: {
      title: "枪械道具静物场景渲染",
      category: "Blender + Cycles",
      description:
        "硬表面道具类静物场景。围绕枪身金属的哑光涂层、机匣的划痕与油污、弹壳的黄铜反射展开，并配以锈蚀铁板与录音机等道具丰富画面信息。采用偏电影感的侧逆光塑造体积，同时用一组中性底的同机位拍摄验证模型在不同环境下的表现一致性。",
      tags: ["硬表面建模", "金属磨损", "道具陈设", "电影感布光"],
      images: [IMG.weapon, IMG.weaponAlt],
    },
  },
  {
    id: 11,
    title: "极简几何场景渲染",
    category: "硬表面与场景",
    image: IMG.geometry,
    desc: "暖橙单色 · 几何构成 · 柔和阴影",
    slug: "scene-geometry",
    detail: {
      title: "极简几何场景渲染",
      category: "C4D + Octane",
      description:
        "一组偏设计的场景练习。用长桌、圆柱、圆球与拱形构成克制的画面秩序，整体统一在暖橙色调中，依靠柔和的接触阴影和微妙的明暗过渡拉开层次，训练构图与色彩控制。",
      tags: ["场景构成", "单色调控制", "柔和阴影", "几何抽象"],
      images: [IMG.geometry],
    },
  },
  {
    id: 12,
    title: "樱花街角微缩场景",
    category: "硬表面与场景",
    image: "/works/sakura-spring-orbit.jpg",
    desc: "45 个独立资产 · 日夜双版本 · 含环绕动画",
    slug: "sakura-corner",
    detail: {
      title: "樱花街角微缩场景 · 春日与雨夜",
      category: "Blender + Eevee",
      description:
        "一次完整的场景创作：日式车站与便利店街角微缩模型，45 个独立资产、285 个材质、304 个对象级动画。同一套布局做了两版灯光——春日版是晴朗漫射光、干燥路面与花瓣透光；雨夜版是三层雨幕、屋檐滴水、湿地反射与暖冷光对比。开头这段是春日版的环绕镜头，4K 渲染后压成 1080p 交付。",
      tags: ["场景搭建", "微缩模型", "程序化纹理", "电影感布光", "环绕动画"],
      images: [
        "/works/sakura-spring-01.jpg",
        "/works/sakura-spring-02.jpg",
        "/works/sakura-spring-03.jpg",
        "/works/sakura-spring-04.jpg",
        "/works/sakura-rain-01.jpg",
        "/works/sakura-rain-02.jpg",
        "/works/sakura-rain-03.jpg",
        "/works/sakura-rain-04.jpg",
      ],
      media: [
        { type: "video", src: "/works/sakura-spring-orbit.mp4", poster: "/works/sakura-spring-orbit.jpg" },
        { type: "image", src: "/works/sakura-spring-01.jpg" },
        { type: "image", src: "/works/sakura-spring-02.jpg" },
        { type: "image", src: "/works/sakura-spring-03.jpg" },
        { type: "image", src: "/works/sakura-spring-04.jpg" },
        { type: "video", src: "/works/sakura-rain-orbit.mp4", poster: "/works/sakura-rain-orbit.jpg" },
        { type: "image", src: "/works/sakura-rain-01.jpg" },
        { type: "image", src: "/works/sakura-rain-02.jpg" },
        { type: "image", src: "/works/sakura-rain-03.jpg" },
        { type: "image", src: "/works/sakura-rain-04.jpg" },
      ],
    },
  },
];

// 精选项目
const PROJECTS = [
  {
    id: 1,
    slug: "beauty",
    title: "美妆个护产品可视化",
    category: "美妆个护",
    categoryLabel: "C4D + Octane / Blender + Cycles",
    desc: "香水、香氛、精华、精油等品类的产品建模与渲染，含整套电商商用交付。围绕玻璃、半透明液体与金属配件展开材质攻坚，按商业摄影的思路构建场景与布光，并保证同一支产品在多底色、多景别下的统一性。",
    tags: ["玻璃材质", "液体渲染", "商用交付", "产品可视化"],
    cover: IMG.bluePerfume1,
    imagePos: "50% 14%",
    images: [IMG.bluePerfume1, IMG.parfumA0, IMG.perfume, IMG.serum, IMG.essentialOil],
  },
  {
    id: 2,
    slug: "food",
    title: "食品饮料与材质研究",
    category: "食品饮料",
    categoryLabel: "C4D + Octane",
    desc: "软糖、贝壳等偏材质表现方向的练习与商拍。重点打磨半透胶质、天然肌理与微观细节，追求白底商拍级别的材质还原度。",
    tags: ["半透胶质", "程序化纹理", "微距构图", "白底商拍"],
    cover: IMG.gummy,
    images: [IMG.gummy, IMG.shell],
  },
  {
    id: 3,
    slug: "digital",
    title: "3C数码与运动装备渲染",
    category: "3C数码",
    categoryLabel: "Blender + Cycles",
    desc: "数码消费电子与运动装备类产品的硬表面建模与渲染。通过产品拆解、悬浮构图与纯色背景呈现结构细节，并用实物实拍同机位比对验证还原度。",
    tags: ["硬表面建模", "产品拆解", "镀膜材质", "实拍比对"],
    cover: IMG.gamepad,
    images: [IMG.gamepad, IMG.gogglesHero, IMG.gogglesFront, IMG.gogglesVsReal],
  },
  {
    id: 4,
    slug: "hard-surface",
    title: "硬表面道具与场景",
    category: "硬表面与场景",
    categoryLabel: "Blender + Cycles",
    desc: "硬表面道具静物与抽象场景构成。一方面还原金属磨损、锈蚀等真实质感，一方面用几何与色彩关系训练整体画面的控制力。",
    tags: ["硬表面建模", "金属磨损", "道具陈设", "场景构成"],
    cover: IMG.weapon,
    images: [IMG.weapon, IMG.weaponAlt, IMG.geometry],
  },
];

// 首页 Hero 轮播（object-position 用来控制不同画幅下的裁切焦点）
const HERO_SLIDES = [
  { src: IMG.weapon, position: "50% 50%", label: "枪械道具静物渲染" },
  { src: IMG.perfume, position: "50% 56%", label: "COCO 香水静物渲染" },
  { src: IMG.gamepad, position: "50% 50%", label: "复古游戏手柄渲染" },
];

const ADVANTAGES = [
  { title: "跨软件工作流", desc: "精通C4D与Blender，根据项目需求灵活选择最高效工具链" },
  { title: "独立交付能力", desc: "长期自由职业经历，习惯从需求理解到最终渲染交付的完整闭环" },
  { title: "扎实建模功底", desc: "硬表面、产品与场景建模兼备，对模型拓扑与细节要求严格" },
  { title: "极致渲染审美", desc: "熟悉光影、材质与构图表达，追求照片级商业渲染品质" },
];

/** 从作品列表里推导分类（作者中心可能新增分类，所以不能只靠模块常量） */
function deriveCategories(works) {
  return ["全部", ...new Set((works || []).map((w) => w.category).filter(Boolean))];
}

// --- 作品数据的读写 Hook ---
// 数据存在浏览器本地（IndexedDB），所以作者中心的改动刷新后还在，
// 而且前台页面会立刻跟着变。访客看不到这些改动（静态站的固有限制），
// 要真正发布需要在作者中心「导出数据」后写回代码。
function useWorks() {
  const [works, setWorks] = useState(() => getCachedWorks() || ALL_WORKS);
  const [ready, setReady] = useState(() => Boolean(getCachedWorks()));

  useEffect(() => {
    let alive = true;
    loadWorks(ALL_WORKS)
      .then((w) => {
        if (!alive) return;
        setWorks(w);
        setReady(true);
      })
      .catch((e) => {
        console.warn("作品数据载入失败，使用默认数据：", e);
        if (alive) setReady(true);
      });
    const unsubscribe = subscribe((w) => {
      if (alive) setWorks(w);
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  const persist = useCallback(async (next) => {
    setWorks(next);            // 先让界面立刻响应
    return saveWorks(next);    // 再落盘
  }, []);

  return { works, ready, persist };
}

/** 作者中心登录校验：没登录就跳登录页 */
function useAuthorGuard() {
  const navigate = useNavigate();
  useEffect(() => {
    if (sessionStorage.getItem("isAuthorLoggedIn") !== "true") {
      navigate("/login");
    }
  }, [navigate]);
}

// --- 懒加载图片组件（增加错误处理）---
function LazyImage({ src, alt, className, ...props }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "50px" }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, []);

  // 超时处理
  useEffect(() => {
    if (inView) {
      const timeout = setTimeout(() => {
        if (!loaded) {
          setError(true);
        }
      }, 15000);
      return () => clearTimeout(timeout);
    }
  }, [inView, loaded]);

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {!loaded && !error && (
        <div className="absolute inset-0 bg-surface animate-pulse" />
      )}
      {error && (
        <div className="absolute inset-0 bg-surface flex items-center justify-center">
          <span className="text-secondary text-xs">加载失败</span>
        </div>
      )}
      {inView && !error && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
          {...props}
        />
      )}
    </div>
  );
}

// --- 通用组件 ---
const SectionTitle = ({ children, subtitle }) => (
  <div className="mb-10 md:mb-24">
    {subtitle && (
      <span className="text-[10px] md:text-xs tracking-[0.3em] text-secondary uppercase mb-2 md:mb-3 block">
        {subtitle}
      </span>
    )}
    <h2 className="text-2xl md:text-5xl font-light tracking-tight text-primary">
      {children}
    </h2>
    <div className="w-16 md:w-20 h-[1px] bg-border mt-4 md:mt-6"></div>
  </div>
);

const FadeIn = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
  >
    {children}
  </motion.div>
);

// --- 登录页面 ---
function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === AUTHOR_ACCOUNT.username && password === AUTHOR_ACCOUNT.password) {
      sessionStorage.setItem("isAuthorLoggedIn", "true");
      navigate("/admin");
    } else {
      setError("账号或密码错误，请重试");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 md:px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 md:mb-12">
          <div className="w-14 h-14 md:w-16 md:h-16 bg-white/5 border border-border rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
            <Lock size={24} className="text-secondary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tighter mb-2">作者中心</h1>
          <p className="text-secondary text-xs md:text-sm">请输入账号和密码登录</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 md:space-y-6">
          <div>
            <label className="block text-xs md:text-sm text-secondary mb-2">账号</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入账号"
              className="w-full px-4 py-2.5 md:py-3 bg-surface border border-border text-white placeholder-secondary focus:border-white focus:outline-none transition-colors text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs md:text-sm text-secondary mb-2">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="w-full px-4 py-2.5 md:py-3 bg-surface border border-border text-white placeholder-secondary focus:border-white focus:outline-none transition-colors text-sm"
              required
            />
          </div>
          {error && (
            <p className="text-red-500 text-xs md:text-sm">{error}</p>
          )}
          <button
            type="submit"
            className="w-full px-6 py-2.5 md:py-3 bg-white text-black text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            登录
          </button>
        </form>

        <button
          onClick={() => navigate("/")}
          className="w-full mt-3 md:mt-4 px-6 py-2.5 md:py-3 border border-border text-secondary text-sm hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft size={14} />
          返回首页
        </button>
      </div>
    </div>
  );
}

// --- 作者中心：作品列表 ---
function AdminPage() {
  const navigate = useNavigate();
  useAuthorGuard();

  const { works, ready, persist } = useWorks();
  const [showAddForm, setShowAddForm] = useState(false);
  const [status, setStatus] = useState("");
  const [statusKind, setStatusKind] = useState("info");
  const [busy, setBusy] = useState("");
  const [newWork, setNewWork] = useState(blankWork());
  // 新建作品的媒体：[{type:'image'|'video'|'embed', src, poster?}]
  // 用对象而不是字符串，才能把视频/外链一起带进来（与二级编辑页同一套模型）
  const [newMedia, setNewMedia] = useState([]);
  const [newEmbedUrl, setNewEmbedUrl] = useState("");
  const [ghConfig, setGhConfig] = useState(() => getGhConfig());
  const [showRepoPanel, setShowRepoPanel] = useState(false);
  const [publishing, setPublishing] = useState("");
  const [unpublished, setUnpublished] = useState(false);
  const fileInputRef = useRef(null);

  // 普通提示 2.8 秒后自动消失；报错不自动消失，等用户自己关掉（否则长报错根本来不及看）
  useEffect(() => {
    if (!status || statusKind === "error") return;
    const t = setTimeout(() => setStatus(""), 2800);
    return () => clearTimeout(t);
  }, [status, statusKind]);

  const notify = useCallback((message, kind = "info") => {
    setStatus(message);
    setStatusKind(kind);
  }, []);

  // 每次作品变化后重算「有没有未发布的改动」
  useEffect(() => {
    setUnpublished(hasUnpublishedChanges());
  }, [works, publishing]);

  const handleLogout = () => {
    sessionStorage.removeItem("isAuthorLoggedIn");
    navigate("/");
  };

  /* 发布到 GitHub：Vercel 检测到 push 会自动重新构建 */
  const handlePublish = async () => {
    if (!ghConfig.token) {
      setShowRepoPanel(true);
      notify("还没填 GitHub Token。点右上角「仓库」按钮填一下再发布。", "error");
      return;
    }
    if (!window.confirm(`把当前 ${works.length} 个作品发布到 ${ghConfig.owner}/${ghConfig.repo}？\n\n提交后 Vercel 会自动重新构建，大约 1 分钟后全网生效。`)) {
      return;
    }
    try {
      setPublishing("准备中…");
      const res = await publishWorks(works, ghConfig, (msg) => setPublishing(msg));
      setUnpublished(false);
      notify(`已发布：${res.works} 个作品、${res.images} 张新图。Vercel 构建中，约 1 分钟后生效。`);
    } catch (e) {
      console.error(e);
      notify(`发布失败 —— ${e.message}`, "error");
    } finally {
      setPublishing("");
    }
  };

  const handleSaveGhConfig = () => {
    saveGhConfig(ghConfig);
    setShowRepoPanel(false);
    notify("仓库配置已保存在本机浏览器");
  };

  const handlePullRemote = async () => {
    if (!window.confirm("用线上数据覆盖本地草稿？本地未发布的改动会丢掉。")) return;
    await pullFromRemote(ALL_WORKS);
    setUnpublished(false);
    notify("已从线上重新拉取");
  };

  const handleDeleteWork = async (work) => {
    if (!window.confirm(`确定删除「${work.title}」吗？此操作不可撤销。`)) return;
    const res = await persist(works.filter((w) => w.id !== work.id));
    notify(res.ok ? "已删除" : "删除失败：本地存储写入被拒绝", res.ok ? "info" : "error");
  };

  /* 添加作品：支持图片 + 视频 + 外链（与二级编辑页 addFiles 同一套逻辑） */
  const ingNewFile = async (fileList) => {
    const all = Array.from(fileList || []);
    const imgs = all.filter((f) => f.type.startsWith("image/"));
    const vids = all.filter((f) => isVideoFile(f));
    if (!imgs.length && !vids.length) return;

    const added = [];
    const warns = [];
    const total = imgs.length + vids.length;
    let step = 0;

    for (const f of imgs) {
      setBusy(`正在处理 ${++step}/${total}：${f.name || "图片"}`);
      try {
        added.push({ type: "image", src: await compressImageFile(f) });
      } catch (e) {
        console.warn("图片处理失败：", e);
        warns.push(`「${f.name || "图片"}」处理失败`);
      }
    }

    for (const f of vids) {
      setBusy(`正在处理 ${++step}/${total}：${f.name || "视频"}`);
      const mb = f.size / 1048576;
      if (mb > 40) {
        warns.push(`「${f.name}」有 ${mb.toFixed(0)}MB，太大没加 —— 建议先压到 10MB 以内`);
        continue;
      }
      try {
        const src = await readAsDataUrl(f);
        const poster = await makeVideoPoster(f);
        added.push({ type: "video", src, poster: poster || undefined, name: f.name });
      } catch (e) {
        console.warn("视频处理失败：", e);
        warns.push(`「${f.name || "视频"}」读取失败`);
      }
    }

    if (added.length) setNewMedia((prev) => [...prev, ...added]);
    setBusy(warns.join("；"));
  };

  /* 添加作品：贴外链播放器（B 站链接自动转 player 地址） */
  const ingNewEmbed = () => {
    const u = toEmbedUrl(newEmbedUrl);
    if (!u) return;
    setNewMedia((prev) => [...prev, { type: "embed", src: u }]);
    setNewEmbedUrl("");
  };

  const handleAddWork = async () => {
    if (!newWork.title.trim()) {
      notify("请先填写作品标题", "error");
      return;
    }
    const nextId = works.reduce((m, w) => Math.max(m, Number(w.id) || 0), 0) + 1;

    // 一件媒体都没加时给个兜底封面，避免卡片空白
    const media = newMedia.length
      ? newMedia
      : [{ type: "image", src: "/works/prop-weapon.jpg" }];
    const imgs = media.filter((m) => m.type === "image").map((m) => m.src);
    const first = media[0];
    let cover = imgs[0] || "";
    if (first && first.type === "image") cover = first.src;
    else if (first && first.type === "video") cover = first.poster || imgs[0] || "";

    const work = {
      ...newWork,
      id: nextId,
      slug: newWork.slug.trim() || `work-${nextId}`,
      image: cover,
      detail: {
        ...newWork.detail,
        title: newWork.detail.title || newWork.title,
        // media 放完整有序列表，images 只放图片（兼容老代码）
        media,
        images: imgs,
      },
    };
    const res = await persist([...works, work]);
    setShowAddForm(false);
    setNewWork(blankWork());
    setNewMedia([]);
    setNewEmbedUrl("");
    if (res.ok) {
      navigate(`/admin/work/${nextId}`);
    } else {
      notify("保存失败：本地存储写入被拒绝（可能是媒体太大）", "error");
    }
  };

  /* 导出数据，供写回代码 */
  const handleExport = async () => {
    const json = JSON.stringify(works, null, 2);
    let copied = false;
    try {
      await navigator.clipboard.writeText(json);
      copied = true;
    } catch {
      copied = false;
    }
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "xie-portfolio-works.json";
    a.click();
    URL.revokeObjectURL(a.href);
    notify(copied ? "已复制到剪贴板，同时下载了一份 JSON" : "已下载 JSON 文件");
  };

  const handleReset = async () => {
    if (!window.confirm("确定放弃所有本地改动、回到线上那一版吗？")) return;
    await discardDraft(ALL_WORKS);
    setUnpublished(false);
    notify("已丢弃本地改动");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 顶栏 */}
      <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border px-4 md:px-6 py-3 md:py-4">
        <div className="max-w-custom mx-auto flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-secondary hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
              <span className="text-xs md:text-sm">返回首页</span>
            </button>
            <span className="text-secondary text-xs md:text-sm">|</span>
            <span className="text-xs md:text-sm font-medium">作者中心</span>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={handlePublish}
              disabled={Boolean(publishing) || !unpublished}
              title={
                unpublished
                  ? "把当前作品提交到 GitHub，Vercel 会自动重新构建"
                  : "当前没有未发布的改动"
              }
              className={`flex items-center gap-1.5 px-4 py-2 text-xs md:text-sm font-medium transition-colors ${
                publishing
                  ? "bg-white/60 text-black/70 cursor-wait"
                  : unpublished
                  ? "bg-white text-black hover:bg-gray-200"
                  : "border border-border text-secondary/60 cursor-not-allowed"
              }`}
            >
              <Upload size={14} />
              {publishing ? "发布中…" : unpublished ? "发布到线上" : "已是最新"}
            </button>
            <button
              onClick={() => setShowRepoPanel(true)}
              title="配置要发布到哪个仓库"
              className="flex items-center gap-1.5 px-3 py-2 border border-border text-secondary hover:text-white hover:bg-white/5 transition-colors text-xs md:text-sm"
            >
              <Settings size={14} />
              仓库
            </button>
            <button
              onClick={handlePullRemote}
              title="用线上数据覆盖本地草稿"
              className="flex items-center gap-1.5 px-3 py-2 border border-border text-secondary hover:text-white hover:bg-white/5 transition-colors text-xs md:text-sm"
            >
              <Download size={14} />
              拉取线上
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 text-secondary hover:text-white transition-colors text-xs md:text-sm"
            >
              <LogOut size={14} />
              退出
            </button>
          </div>
        </div>
      </div>

      {/* 仓库设置面板 */}
      {showRepoPanel && (
        <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4 md:p-6">
          <div className="bg-background border border-border p-6 md:p-8 max-w-xl w-full max-h-[88vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5 md:mb-6">
              <h2 className="text-xl md:text-2xl font-bold">发布设置</h2>
              <button onClick={() => setShowRepoPanel(false)} className="text-secondary hover:text-white">
                <X size={20} />
              </button>
            </div>

            <p className="text-secondary text-xs md:text-sm leading-relaxed mb-5">
              「发布到线上」会把作品数据提交到这里的 GitHub 仓库，
              Vercel 检测到 push 后自动重新构建。<b className="text-primary">不需要数据库，也不用新装任何服务。</b>
            </p>

            <div className="space-y-4">
              <Field label="GitHub 用户名 / 组织">
                <input
                  type="text"
                  value={ghConfig.owner}
                  onChange={(e) => setGhConfig({ ...ghConfig, owner: e.target.value.trim() })}
                  className={inputCls}
                />
              </Field>
              <Field label="仓库名">
                <input
                  type="text"
                  value={ghConfig.repo}
                  onChange={(e) => setGhConfig({ ...ghConfig, repo: e.target.value.trim() })}
                  className={inputCls}
                />
              </Field>
              <Field label="分支">
                <input
                  type="text"
                  value={ghConfig.branch}
                  onChange={(e) => setGhConfig({ ...ghConfig, branch: e.target.value.trim() })}
                  className={inputCls}
                />
              </Field>
              <Field label="GitHub Token（细粒度，只需 Contents 读写）">
                <input
                  type="password"
                  value={ghConfig.token}
                  onChange={(e) => setGhConfig({ ...ghConfig, token: e.target.value.trim() })}
                  className={inputCls}
                  placeholder="github_pat_..."
                />
              </Field>
            </div>

            <div className="mt-5 p-3 border border-amber-500/30 bg-amber-500/5">
              <p className="text-[11px] md:text-xs text-secondary leading-relaxed">
                <b className="text-amber-400/90">怎么拿 Token：</b>
                GitHub 右上角头像 → Settings → Developer settings → Personal access tokens →
                <b className="text-primary"> Fine-grained tokens</b> → Generate new token。
                Repository access 只选这一个仓库，Permissions 里把
                <b className="text-primary"> Contents 设为 Read and write</b>，有效期按需设短一点。
              </p>
              <p className="text-[11px] md:text-xs text-secondary leading-relaxed mt-2.5">
                <b className="text-amber-400/90">注意：</b>
                Token 只存在你这台电脑的浏览器里，不会进代码、不会上传。
                但它等于在这个浏览器里存了一把能改仓库的钥匙 —— 别在公用电脑上填，
                怀疑泄露了就去 GitHub 撤销重发一个。
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveGhConfig}
                className="flex-1 px-6 py-3 bg-white text-black text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                保存设置
              </button>
              <button
                onClick={() => {
                  clearGhConfig();
                  setGhConfig({ owner: "", repo: "", branch: "main", token: "" });
                  notify("已清除本机保存的 Token");
                }}
                className="px-5 py-3 border border-border text-secondary hover:text-white hover:bg-white/5 transition-colors text-sm"
              >
                清除 Token
              </button>
            </div>
          </div>
        </div>
      )}

      {publishing && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6">
          <div className="bg-background border border-border px-8 py-6 text-center max-w-sm">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-medium mb-1">正在发布</p>
            <p className="text-secondary text-xs">{publishing}</p>
            <p className="text-secondary/60 text-[11px] mt-3">别关页面，图片多的话要一会儿</p>
          </div>
        </div>
      )}

      <div className="px-4 md:px-6 py-8 md:py-12">
        <div className="max-w-custom mx-auto">
          {/* 标题行 */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-10">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold tracking-tighter mb-1 md:mb-2">作品管理</h1>
              <p className="text-secondary text-sm">
                共 {works.length} 个作品
                <span className="text-secondary/60"> · 点任意作品进入它的编辑页</span>
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-5 md:px-6 py-2.5 md:py-3 bg-white text-black text-xs md:text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <Plus size={14} />
              添加作品
            </button>
          </div>

          {/* 状态说明 */}
          <div
            className={`flex items-start gap-3 p-3 md:p-4 border mb-6 md:mb-8 ${
              unpublished ? "border-amber-500/40 bg-amber-500/5" : "border-border bg-surface/40"
            }`}
          >
            {unpublished ? (
              <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <Check size={16} className="text-emerald-400/80 shrink-0 mt-0.5" />
            )}
            <div className="text-[11px] md:text-xs text-secondary leading-relaxed">
              {unpublished ? (
                <p>
                  <b className="text-amber-400">你有还没发布的改动。</b>
                  现在只有你自己能看到 —— 内容存在本机浏览器里，线上还是旧的。
                  改完点右上角<b className="text-primary">「发布到线上」</b>，
                  它会提交到 GitHub，Vercel 自动重新构建，约 1 分钟后全网生效。
                </p>
              ) : (
                <p>
                  <b className="text-emerald-400/90">本地和线上是一致的。</b>
                  在这里改完东西后，点右上角「发布到线上」提交，Vercel 会自动重新构建。
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-secondary hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Download size={12} />
                  导出 JSON（备份用）
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-secondary hover:text-white hover:bg-white/5 transition-colors"
                >
                  <RotateCcw size={12} />
                  丢弃本地改动
                </button>
                <span className="text-secondary/50">
                  存储后端：{getBackend() === "indexeddb" ? "IndexedDB" : "localStorage（降级，约 5MB 上限）"}
                </span>
              </div>
            </div>
          </div>

          {busy && <p className="text-secondary text-xs md:text-sm mb-3">{busy}</p>}

          {ready && works.length === 0 && (
            <div className="border border-border bg-surface/30 py-16 md:py-24 text-center">
              <ImageIcon size={28} className="mx-auto mb-4 text-secondary" />
              <p className="text-secondary text-sm mb-1">还没有任何作品</p>
              <p className="text-secondary/60 text-xs">点右上角「添加作品」开始，或者用「恢复默认」找回原来的作品</p>
            </div>
          )}

          {/* 作品卡片：整块可点进二级页 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {works.map((work, index) => (
              <motion.div
                key={work.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.3) }}
                className="group relative"
              >
                <button
                  type="button"
                  onClick={() => navigate(`/admin/work/${work.id}`)}
                  className="block w-full text-left"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-black border border-border mb-3 md:mb-4 relative">
                    {work.image ? (
                      <img
                        src={coverOf(work)}
                        alt={work.title}
                        loading="lazy"
                        style={{ objectPosition: work.imagePos || "50% 50%" }}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-secondary text-xs">
                        暂无图片
                      </div>
                    )}
                    <div className="absolute top-2 md:top-3 left-2 md:left-3 bg-black/60 backdrop-blur-sm px-2 md:px-3 py-0.5 md:py-1 text-[10px] md:text-xs text-white">
                      {work.category}
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="px-4 py-2 bg-white text-black text-xs md:text-sm font-medium flex items-center gap-2">
                        <Edit3 size={13} />
                        进入编辑
                      </span>
                    </div>
                  </div>
                </button>

                {/* 快速删除（放在卡片外层，避免嵌套按钮） */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteWork(work);
                  }}
                  title="删除作品"
                  className="absolute top-2 md:top-3 right-2 md:right-3 p-1.5 md:p-2 bg-black/60 backdrop-blur-sm border border-white/20 text-white hover:bg-red-600/80 transition-colors opacity-0 group-hover:opacity-100 z-10"
                >
                  <Trash2 size={12} />
                </button>

                <h3 className="text-base md:text-lg font-medium text-primary group-hover:text-white transition-colors mb-1">
                  {work.title}
                </h3>
                <p className="text-xs md:text-sm text-secondary line-clamp-2">{work.desc}</p>
                <p className="text-[10px] md:text-xs text-secondary/50 mt-1.5">
                  {work.detail?.images?.length || 0} 张图 · /{work.slug}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {status && (
        <div
          role={statusKind === "error" ? "alert" : "status"}
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-4 md:px-5 py-3 text-xs md:text-sm shadow-lg flex items-start gap-3 w-[calc(100%-2rem)] max-w-2xl ${
            statusKind === "error"
              ? "bg-red-950 border border-red-500/50 text-red-100"
              : "bg-white text-black font-medium"
          }`}
        >
          {statusKind === "error" && (
            <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
          )}
          {/* 报错可能是长句，允许换行，别硬撑成一整行 */}
          <span className="leading-relaxed whitespace-pre-line flex-1">{status}</span>
          <button
            onClick={() => setStatus("")}
            aria-label="关闭提示"
            className={`shrink-0 transition-colors ${
              statusKind === "error" ? "text-red-300 hover:text-white" : "text-black/40 hover:text-black"
            }`}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {showAddForm && (
        <AddWorkModal
          newWork={newWork}
          setNewWork={setNewWork}
          media={newMedia}
          setMedia={setNewMedia}
          embedUrl={newEmbedUrl}
          setEmbedUrl={setNewEmbedUrl}
          onAddEmbed={ingNewEmbed}
          onPick={ingNewFile}
          onClose={() => setShowAddForm(false)}
          onSubmit={handleAddWork}
          categories={deriveCategories(works)}
          busy={busy}
        />
      )}
    </div>
  );
}

/* ---------- 新建作品弹窗 ---------- */
function AddWorkModal({ newWork, setNewWork, media, setMedia, embedUrl, setEmbedUrl, onAddEmbed, onPick, onClose, onSubmit, categories, busy }) {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  // 预览卡片封面：优先图片，其次视频封面；外链没有缩略图
  const coverOfMedia = (m) => (m.type === "image" ? m.src : m.type === "video" ? m.poster : "");

  useEffect(() => {
    const onPaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files = [];
      for (const it of items) {
        if (it.type.startsWith("image/")) {
          const f = it.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length) {
        e.preventDefault();
        onPick(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onPick]);

  return (
    <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4 md:p-6">
      <div className="bg-background border border-border p-6 md:p-8 max-w-2xl w-full max-h-[88vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5 md:mb-6">
          <h2 className="text-xl md:text-2xl font-bold">添加新作品</h2>
          <button onClick={onClose} className="text-secondary hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 md:mb-6">
          <label className="block text-xs md:text-sm text-secondary mb-2">作品媒体（图片 / 视频，可多选）</label>
          <div
            className={`border-2 border-dashed p-5 md:p-7 text-center cursor-pointer transition-colors ${
              dragOver ? "border-white bg-white/5" : "border-border hover:border-white"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              onPick(e.dataTransfer.files);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={(e) => onPick(e.target.files)}
              className="hidden"
            />
            <Upload size={22} className="mx-auto mb-2 md:mb-3 text-secondary" />
            <p className="text-secondary text-xs md:text-sm mb-1">
              点击选择、拖拽进来，或直接 Ctrl+V 粘贴图片
            </p>
            <p className="text-[10px] md:text-xs text-secondary/60">
              图片自动压缩；视频不超过 40MB，会自动抽一帧当封面。顺序即详情页展示顺序
            </p>
          </div>

          {/* 外链播放器（B 站等），零体积 */}
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              value={embedUrl}
              onChange={(e) => setEmbedUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAddEmbed();
                }
              }}
              placeholder="或粘贴 B 站 / YouTube 链接（自动转播放器）"
              className={`${inputCls} flex-1`}
            />
            <button
              type="button"
              onClick={onAddEmbed}
              disabled={!embedUrl.trim()}
              className="px-4 border border-border text-xs md:text-sm hover:bg-white hover:text-black transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit shrink-0"
            >
              添加
            </button>
          </div>

          {media.length > 0 && (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-3 mt-3 md:mt-4">
              {media.map((m, index) => (
                <div key={index} className="relative aspect-square border border-border overflow-hidden group bg-black">
                  {coverOfMedia(m) ? (
                    <img src={coverOfMedia(m)} alt={`媒体${index + 1}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-secondary/50 text-[10px]">
                      外链
                    </div>
                  )}
                  {index === 0 && (
                    <span className="absolute top-1 left-1 bg-white text-black text-[8px] md:text-[10px] px-1.5 py-0.5">
                      封面
                    </span>
                  )}
                  {m.type === "video" && (
                    <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[8px] md:text-[10px] px-1.5 py-0.5 inline-flex items-center gap-1">
                      <Video size={9} />
                      视频
                    </span>
                  )}
                  {m.type === "embed" && (
                    <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[8px] md:text-[10px] px-1.5 py-0.5 inline-flex items-center gap-1">
                      <ExternalLink size={9} />
                      外链
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMedia(media.filter((_, i) => i !== index));
                    }}
                    className="absolute top-1 right-1 bg-black/70 p-1 hover:bg-red-600 transition-colors"
                  >
                    <X size={10} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {busy && <p className="text-secondary text-xs mt-2">{busy}</p>}
        </div>

        <div className="space-y-3 md:space-y-4">
          <Field label="作品标题">
            <input
              type="text"
              value={newWork.title}
              onChange={(e) => setNewWork({ ...newWork, title: e.target.value })}
              className={inputCls}
              placeholder="例如：某香氛产品渲染"
            />
          </Field>
          <Field label="分类">
            <input
              type="text"
              list="admin-category-list"
              value={newWork.category}
              onChange={(e) => setNewWork({ ...newWork, category: e.target.value })}
              className={inputCls}
              placeholder="可以选已有的，也可以直接输入新分类"
            />
            <datalist id="admin-category-list">
              {categories.filter((c) => c !== "全部").map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="简短描述（列表卡片上那行小字）">
            <input
              type="text"
              value={newWork.desc}
              onChange={(e) => setNewWork({ ...newWork, desc: e.target.value })}
              className={inputCls}
              placeholder="例如：玻璃折射 · 冷调背光 · 倒影控制"
            />
          </Field>
          <Field label="Slug（网址标识，留空会自动生成）">
            <input
              type="text"
              value={newWork.slug}
              onChange={(e) => setNewWork({ ...newWork, slug: e.target.value })}
              className={inputCls}
              placeholder="例如：coco-perfume"
            />
          </Field>

          <button
            onClick={onSubmit}
            className="w-full px-6 py-2.5 md:py-3 bg-white text-black text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            创建并进入编辑
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- 单个作品的二级编辑页 ---------- */
function AdminWorkPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  useAuthorGuard();

  const { works, ready, persist } = useWorks();
  const work = works.find((w) => String(w.id) === String(id));

  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [busy, setBusy] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const fileInputRef = useRef(null);
  const loadedIdRef = useRef(null);

  // 只在切换作品时用库里的数据重置草稿，避免保存后回写把正在输入的内容覆盖掉
  useEffect(() => {
    if (work && loadedIdRef.current !== work.id) {
      loadedIdRef.current = work.id;
      setDraft(JSON.parse(JSON.stringify(work)));
      setDirty(false);
    }
  }, [work]);

  // 自动保存（防抖 700ms）
  useEffect(() => {
    if (!draft || !dirty) return;
    const timer = setTimeout(async () => {
      const next = works.map((w) => (w.id === draft.id ? draft : w));
      await persist(next);
      setDirty(false);
      setSavedAt(new Date());
    }, 700);
    return () => clearTimeout(timer);
  }, [draft, dirty, works, persist]);

  const patch = useCallback((p) => {
    setDraft((d) => ({ ...d, ...p }));
    setDirty(true);
  }, []);

  const patchDetail = useCallback((p) => {
    setDraft((d) => ({ ...d, detail: { ...(d.detail || {}), ...p } }));
    setDirty(true);
  }, []);

  /**
   * 所有媒体改动都走这里，并同步回兼容字段：
   *   detail.images —— 只放图片（主站老代码还在读它）
   *   image         —— 卡片封面；第一个是视频时用它的封面帧
   * media 支持三种：图片 / 站内视频 / 外链播放器
   */
  const mutateMedia = useCallback((updater) => {
    setDraft((d) => {
      const next = updater(mediaOf(d)).filter((m) => m && m.src);
      const imgs = next.filter((m) => m.type === "image").map((m) => m.src);
      const first = next[0];
      let cover = imgs[0] || "";
      if (first && first.type === "image") cover = first.src;
      else if (first && first.type === "video") cover = first.poster || imgs[0] || "";
      return {
        ...d,
        image: cover,
        detail: { ...(d.detail || {}), media: next, images: imgs },
      };
    });
    setDirty(true);
  }, []);

  /** 添加外链播放器：B 站分享链接会自动转成 player 地址 */
  const addEmbed = useCallback(() => {
    const u = toEmbedUrl(embedUrl);
    if (!u) return;
    mutateMedia((cur) => [...cur, { type: "embed", src: u }]);
    setEmbedUrl("");
  }, [embedUrl, mutateMedia]);

  const addFiles = useCallback(async (fileList) => {
    const all = Array.from(fileList || []);
    const imgs = all.filter((f) => f.type.startsWith("image/"));
    const vids = all.filter((f) => isVideoFile(f));
    if (!imgs.length && !vids.length) return;

    const added = [];
    const warns = [];
    const total = imgs.length + vids.length;
    let step = 0;
    const tick = (name) => {
      step += 1;
      setBusy(`处理中 ${step}/${total}：${name}`);
    };

    for (const f of imgs) {
      tick(f.name || "图片");
      try {
        added.push({ type: "image", src: await compressImageFile(f) });
      } catch (e) {
        console.warn("图片处理失败：", e);
      }
    }

    for (const f of vids) {
      tick(f.name || "视频");
      const mb = f.size / 1048576;
      if (mb > 40) {
        warns.push(`「${f.name}」有 ${mb.toFixed(0)}MB，太大没加 —— 建议先压到 10MB 以内`);
        continue;
      }
      try {
        const src = await readAsDataUrl(f);
        const poster = await makeVideoPoster(f);
        added.push({ type: "video", src, poster: poster || undefined, name: f.name });
      } catch (e) {
        console.warn("视频处理失败：", e);
        warns.push(`「${f.name}」读取失败`);
      }
    }

    if (added.length) mutateMedia((cur) => [...cur, ...added]);
    setBusy(warns.join("；"));
  }, [mutateMedia]);

  // 页面任意位置 Ctrl+V 粘图
  useEffect(() => {
    const onPaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files = [];
      for (const it of items) {
        if (it.type.startsWith("image/")) {
          const f = it.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length) {
        e.preventDefault();
        addFiles(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-secondary text-sm">
        正在载入…
      </div>
    );
  }

  if (!work || !draft) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold mb-4">找不到这个作品</h1>
          <p className="text-secondary text-sm mb-8">它可能已经被删除了。</p>
          <button
            onClick={() => navigate("/admin")}
            className="px-6 py-3 bg-white text-black text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            返回作品管理
          </button>
        </div>
      </div>
    );
  }

  const media = mediaOf(draft);
  const categories = deriveCategories(works);

  const handleDeleteWork = async () => {
    if (!window.confirm(`确定删除「${draft.title}」吗？删掉就找不回来了。`)) return;
    await persist(works.filter((w) => w.id !== draft.id));
    navigate("/admin");
  };

  const moveImage = (index, delta) => {
    mutateMedia((cur) => {
      const target = index + delta;
      if (target < 0 || target >= cur.length) return cur;
      const next = [...cur];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 顶栏 */}
      <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border px-4 md:px-6 py-3 md:py-4">
        <div className="max-w-custom mx-auto flex flex-wrap justify-between items-center gap-3">
          <button
            onClick={() => navigate("/admin")}
            className="flex items-center gap-2 text-secondary hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            <span className="text-xs md:text-sm">作品管理</span>
          </button>
          <div className="flex items-center gap-2 md:gap-3">
            <span className="text-[10px] md:text-xs text-secondary">
              {busy || (dirty ? "保存中…" : savedAt ? `已自动保存 · ${savedAt.toLocaleTimeString("zh-CN")}` : "暂无改动")}
            </span>
            {draft.slug && (
              <button
                onClick={() => window.open(`/work/${draft.slug}`, "_blank")}
                className="flex items-center gap-1.5 px-3 py-2 border border-border text-secondary hover:text-white hover:bg-white/5 transition-colors text-xs md:text-sm"
              >
                <ExternalLink size={13} />
                前台预览
              </button>
            )}
            <button
              onClick={handleDeleteWork}
              className="flex items-center gap-1.5 px-3 py-2 border border-red-500/40 text-red-400 hover:bg-red-600/20 transition-colors text-xs md:text-sm"
            >
              <Trash2 size={13} />
              删除作品
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 py-8 md:py-12">
        <div className="max-w-custom mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
          {/* 左：图片 */}
          <div className="lg:col-span-7">
            <div className="mb-5 md:mb-6">
              <h2 className="text-lg md:text-xl font-bold mb-1">作品素材</h2>
              <p className="text-secondary text-xs md:text-sm">
                共 {media.length} 个 · 其中图片 {media.filter((m) => m.type === "image").length} 张
                {media.some((m) => m.type === "video") &&
                  `、视频 ${media.filter((m) => m.type === "video").length} 段`}
                {media.some((m) => m.type === "embed") &&
                  `、外链 ${media.filter((m) => m.type === "embed").length} 个`}
                · <b className="text-primary">第一位是封面</b>，列表和首页都用它。
                可以点箭头调整顺序。
              </p>
            </div>

            <div
              className={`border-2 border-dashed p-4 md:p-6 text-center cursor-pointer transition-colors mb-5 md:mb-6 ${
                dragOver ? "border-white bg-white/5" : "border-border hover:border-white"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                addFiles(e.dataTransfer.files);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={(e) => addFiles(e.target.files)}
                className="hidden"
              />
              <Upload size={20} className="mx-auto mb-2 text-secondary" />
              <p className="text-secondary text-xs md:text-sm mb-1">
                添加图片或视频：点击选择、拖进来，或直接 Ctrl+V 粘贴图片
              </p>
              <p className="text-[10px] md:text-xs text-secondary/60">
                图片自动压到 1800px 以内；视频请先压到 10MB 以内（浏览器端不压视频）
              </p>
            </div>

            <div className="mb-5 md:mb-6">
              <label className="block text-xs md:text-sm text-secondary mb-1.5 md:mb-2">
                或者贴一个视频链接（B 站 / YouTube）
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={embedUrl}
                  onChange={(e) => setEmbedUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addEmbed();
                    }
                  }}
                  placeholder="https://www.bilibili.com/video/BVxxxxxxxxx"
                  className={inputCls}
                />
                <button
                  onClick={addEmbed}
                  className="px-4 border border-border text-secondary hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap text-xs md:text-sm"
                >
                  添加
                </button>
              </div>
              <p className="text-[10px] md:text-xs text-secondary/60 mt-1.5">
                长视频建议走这条：B 站负责转码和分发，不占仓库体积
              </p>
            </div>

            {media.length === 0 ? (
              <div className="border border-border bg-surface/30 py-14 text-center text-secondary text-sm">
                还没有素材，先加一张图或一段视频吧
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {media.map((m, i) => (
                  <div key={i} className="group relative border border-border bg-black">
                    <div className="aspect-square overflow-hidden">
                      {m.type === "image" && (
                        <img src={m.src} alt={`${draft.title} - ${i + 1}`} className="w-full h-full object-cover" />
                      )}
                      {m.type === "video" &&
                        (m.poster ? (
                          <img src={m.poster} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full grid place-items-center text-secondary text-xs">视频</div>
                        ))}
                      {m.type === "embed" && (
                        <div className="w-full h-full grid place-items-center text-secondary text-xs px-3 text-center">
                          外链视频
                          <br />
                          <span className="text-[10px] text-secondary/50 break-all">{m.src.slice(0, 34)}…</span>
                        </div>
                      )}
                    </div>

                    {i === 0 && (
                      <span className="absolute top-2 left-2 bg-white text-black text-[9px] md:text-[10px] font-medium px-1.5 py-0.5 flex items-center gap-1">
                        <Star size={9} />
                        封面
                      </span>
                    )}
                    {m.type !== "image" && (
                      <span className="absolute bottom-12 left-2 bg-black/75 text-white text-[9px] px-1.5 py-0.5">
                        {m.type === "video" ? "视频" : "外链"}
                      </span>
                    )}
                    <span className="absolute top-2 right-2 bg-black/70 text-white text-[9px] md:text-[10px] px-1.5 py-0.5">
                      {i + 1}/{media.length}
                    </span>

                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 flex items-center justify-between gap-1">
                      <div className="flex gap-1">
                        <button
                          onClick={() => moveImage(i, -1)}
                          disabled={i === 0}
                          title="前移"
                          className="p-1.5 bg-black/60 border border-white/15 text-white disabled:opacity-25 hover:bg-black/90 transition-colors"
                        >
                          <ChevronLeft size={12} />
                        </button>
                        <button
                          onClick={() => moveImage(i, 1)}
                          disabled={i === media.length - 1}
                          title="后移"
                          className="p-1.5 bg-black/60 border border-white/15 text-white disabled:opacity-25 hover:bg-black/90 transition-colors"
                        >
                          <ChevronRight size={12} />
                        </button>
                      </div>
                      <div className="flex gap-1">
                        {i !== 0 && (
                          <button
                            onClick={() => mutateMedia((cur) => [cur[i], ...cur.filter((_, k) => k !== i)])}
                            title="设为封面"
                            className="px-2 py-1.5 bg-black/60 border border-white/15 text-white text-[10px] hover:bg-black/90 transition-colors"
                          >
                            设为封面
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (window.confirm(`删除第 ${i + 1} 个素材？`)) {
                              mutateMedia((cur) => cur.filter((_, k) => k !== i));
                            }
                          }}
                          title="删除这张"
                          className="p-1.5 bg-black/60 border border-white/15 text-white hover:bg-red-600 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 右：文字信息 */}
          <div className="lg:col-span-5">
            <div className="mb-5 md:mb-6">
              <h2 className="text-lg md:text-xl font-bold mb-1">文字信息</h2>
              <p className="text-secondary text-xs md:text-sm">改完自动保存，不用点确认。</p>
            </div>

            <div className="space-y-4 md:space-y-5">
              <Field label="作品标题">
                <input
                  type="text"
                  value={draft.title || ""}
                  onChange={(e) => patch({ title: e.target.value })}
                  className={inputCls}
                />
              </Field>

              <Field label="分类">
                <input
                  type="text"
                  list="admin-category-list"
                  value={draft.category || ""}
                  onChange={(e) => patch({ category: e.target.value })}
                  className={inputCls}
                />
                <datalist id="admin-category-list">
                  {categories.filter((c) => c !== "全部").map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>

              <Field label="简短描述">
                <input
                  type="text"
                  value={draft.desc || ""}
                  onChange={(e) => patch({ desc: e.target.value })}
                  className={inputCls}
                />
              </Field>

              <Field label="Slug（网址标识，别留空、别重名）">
                <input
                  type="text"
                  value={draft.slug || ""}
                  onChange={(e) => patch({ slug: e.target.value })}
                  className={inputCls}
                />
                {!draft.slug?.trim() && (
                  <p className="text-amber-400/80 text-[11px] mt-1.5">
                    留空的话详情页打不开，前台预览按钮也不会出现。
                  </p>
                )}
              </Field>

              <Field label="详情页标题">
                <input
                  type="text"
                  value={draft.detail?.title || ""}
                  onChange={(e) => patchDetail({ title: e.target.value })}
                  className={inputCls}
                />
              </Field>

              <Field label="使用软件 / 渲染器（详情页右上角那行小字）">
                <input
                  type="text"
                  value={draft.detail?.category || ""}
                  onChange={(e) => patchDetail({ category: e.target.value })}
                  className={inputCls}
                  placeholder="例如：Blender + Cycles"
                />
              </Field>

              <Field label="详情描述">
                <textarea
                  rows={6}
                  value={draft.detail?.description || ""}
                  onChange={(e) => patchDetail({ description: e.target.value })}
                  className={inputCls}
                />
              </Field>

              {/* 标签：输入回车添加，点 × 删除 */}
              <Field label="标签">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const t = tagInput.trim();
                        if (t && !(draft.detail?.tags || []).includes(t)) {
                          patchDetail({ tags: [...(draft.detail?.tags || []), t] });
                        }
                        setTagInput("");
                      }
                    }}
                    placeholder="输入后按回车添加"
                    className={inputCls}
                  />
                  <button
                    onClick={() => {
                      const t = tagInput.trim();
                      if (t && !(draft.detail?.tags || []).includes(t)) {
                        patchDetail({ tags: [...(draft.detail?.tags || []), t] });
                      }
                      setTagInput("");
                    }}
                    className="px-4 border border-border text-secondary hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                {(draft.detail?.tags || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {(draft.detail.tags || []).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 text-[10px] md:text-xs px-2 py-1 border border-border text-secondary"
                      >
                        {tag}
                        <button
                          onClick={() =>
                            patchDetail({ tags: draft.detail.tags.filter((t) => t !== tag) })
                          }
                          className="hover:text-white transition-colors"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </Field>
            </div>

            {/* 前台预览缩略 */}
            <div className="mt-8 md:mt-10 pt-6 md:pt-8 border-t border-border">
              <h3 className="text-xs md:text-sm text-secondary uppercase tracking-widest mb-3">
                列表卡片预览
              </h3>
              <div className="w-64">
                <div className="aspect-[4/3] overflow-hidden bg-black border border-border relative">
                  {draft.image ? (
                    <img
                      src={draft.image}
                      alt=""
                      style={{ objectPosition: draft.imagePos || "50% 50%" }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-secondary text-xs">
                      暂无图片
                    </div>
                  )}
                  <div className="absolute top-2 left-2 bg-black/60 px-2 py-0.5 text-[10px] text-white">
                    {draft.category}
                  </div>
                </div>
                <h4 className="text-sm font-medium text-primary mt-2 mb-0.5">
                  {draft.title || "（未填标题）"}
                </h4>
                <p className="text-xs text-secondary">{draft.desc}</p>
              </div>

              {draft.image && (
                <Field label="卡片裁切焦点（竖构图作品用得上）" className="mt-5">
                  <div className="flex gap-2">
                    {["50% 50%", "50% 14%", "50% 30%", "50% 70%"].map((p) => (
                      <button
                        key={p}
                        onClick={() => patch({ imagePos: p })}
                        className={`px-3 py-1.5 text-[11px] border transition-colors ${
                          (draft.imagePos || "50% 50%") === p
                            ? "border-white text-white"
                            : "border-border text-secondary hover:text-white"
                        }`}
                      >
                        {p === "50% 50%" ? "居中" : p === "50% 14%" ? "偏上" : p === "50% 30%" ? "略上" : "偏下"}
                      </button>
                    ))}
                  </div>
                </Field>
              )}
            </div>
          </div>
        </div>
      </div>

      {busy && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-5 py-3 bg-white text-black text-xs md:text-sm font-medium shadow-lg">
          {busy}
        </div>
      )}
    </div>
  );
}

/* ---------- 后台通用小组件 ---------- */
const inputCls =
  "w-full px-3 md:px-4 py-2 bg-surface border border-border text-white text-sm focus:border-white focus:outline-none transition-colors";

function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <label className="block text-xs md:text-sm text-secondary mb-1.5 md:mb-2">{label}</label>
      {children}
    </div>
  );
}

function blankWork() {
  return {
    title: "",
    category: "",
    image: "",
    desc: "",
    slug: "",
    detail: {
      title: "",
      category: "",
      description: "",
      tags: [],
      images: [],
    },
  };
}


// --- 首页组件（修复版，移除滚动动画）---
function HomePage() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);

  // Hero 背景自动轮播
  useEffect(() => {
    const timer = setInterval(() => {
      setHeroIndex(i => (i + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      const checkMobile = () => {
        const width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        setIsMobile(width < 768);
      };
      checkMobile();
      window.addEventListener("resize", checkMobile);
      return () => window.removeEventListener("resize", checkMobile);
    } catch (e) {
      console.error("Mobile detection error:", e);
    }
  }, []);

  const handleProjectClick = (category) => {
    navigate(`/portfolio?category=${encodeURIComponent(category)}`);
  };

  return (
    <>
      {/* 导航栏 - 移除了 mix-blend-difference */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 md:px-6 py-3 md:py-6 bg-background/80 backdrop-blur-sm text-white">
        <div className="max-w-custom mx-auto flex justify-between items-center">
          <span className="text-base md:text-lg font-bold tracking-wider">
            {PROFILE.name.toUpperCase()}
          </span>
          <div className="hidden md:flex gap-8 text-sm tracking-wide text-secondary items-center">
            <a href="#about" className="hover:text-white transition-colors">关于</a>
            <a href="#work" className="hover:text-white transition-colors">作品</a>
            <a href="#skills" className="hover:text-white transition-colors">优势</a>
            <a href="#contact" className="hover:text-white transition-colors">联系</a>
            <Link to="/login" className="flex items-center gap-1 hover:text-white transition-colors" title="作者中心">
              <Settings size={16} />
              <span className="text-xs">作者中心</span>
            </Link>
          </div>
          <Link to="/login" className="md:hidden text-white" title="作者中心">
            <Settings size={20} />
          </Link>
        </div>
      </nav>

      {/* Hero 区域 —— 真实作品图轮播背景 */}
      <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0 bg-background">
          {HERO_SLIDES.map((slide, i) => (
            <img
              key={slide.src}
              src={slide.src}
              alt=""
              aria-hidden="true"
              style={{ objectPosition: slide.position }}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1600ms] ease-in-out ${
                i === heroIndex ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
          {/* 压暗 + 上下渐隐，保证文字可读 */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/65 via-background/35 to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(5,5,5,0.15)_0%,rgba(5,5,5,0.8)_100%)]" />
          {/* 标题区域再加一层柔和的径向暗角，避免文字压在亮部上 */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_center,rgba(5,5,5,0.55)_0%,transparent_75%)]" />
        </div>
        <div className="relative z-10 text-center px-4 max-w-4xl">
          <p className="text-secondary tracking-[0.3em] md:tracking-[0.4em] text-[10px] md:text-sm mb-4 md:mb-6 uppercase">
            {PROFILE.title}
          </p>
          <h1 className="text-4xl md:text-8xl font-bold tracking-tighter leading-none mb-6 md:mb-8">
            {PROFILE.name}
          </h1>
          <p className="text-base md:text-xl text-secondary font-light max-w-xl mx-auto">
            {PROFILE.tagline}
          </p>
        </div>
        {/* 轮播指示条 */}
        <div className="absolute bottom-8 md:bottom-10 right-4 md:right-8 z-10 flex items-center gap-2">
          {HERO_SLIDES.map((slide, i) => (
            <button
              key={slide.src}
              onClick={() => setHeroIndex(i)}
              aria-label={`切换到第 ${i + 1} 张：${slide.label}`}
              title={slide.label}
              className={`h-[2px] transition-all duration-500 ${
                i === heroIndex ? "w-8 bg-white" : "w-4 bg-white/30 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
        <div className="absolute bottom-8 md:bottom-10 left-1/2 -translate-x-1/2 text-secondary">
          <ArrowDown size={20} />
        </div>
      </section>

      {/* 关于我 */}
      <section id="about" className="py-16 md:py-32 px-4 md:px-6">
        <div className="max-w-custom mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-16 items-start">
          <div className="lg:col-span-4">
            <div className="aspect-[3/4] w-full bg-surface border border-border overflow-hidden relative group">
              <img
                src={IMG.essentialOil}
                alt="精油产品场景渲染 · 树影与玻璃瓶身细节"
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            </div>
            <p className="text-[10px] md:text-xs text-secondary mt-3">
              精油产品场景渲染 · Blender + Cycles
            </p>
          </div>
          <div className="lg:col-span-8 pt-4 md:pt-8">
            <SectionTitle subtitle="About Me">个人简介</SectionTitle>
            <p className="text-base md:text-2xl leading-relaxed text-secondary font-light mb-8 md:mb-12">
              {PROFILE.bio}
            </p>
            <div className="grid grid-cols-3 gap-4 md:gap-8 border-t border-border pt-6 md:pt-8 mb-8 md:mb-12">
              {PROFILE.stats.map((stat, i) => (
                <div key={i}>
                  <div className="text-2xl md:text-4xl font-light text-primary mb-1">{stat.value}</div>
                  <div className="text-[10px] md:text-xs text-secondary tracking-widest uppercase">{stat.label}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 md:gap-4">
              <a href={`mailto:${PROFILE.contact.email}`} className="px-6 md:px-8 py-2.5 md:py-3 bg-white text-black text-xs md:text-sm font-medium hover:bg-gray-200 transition-colors">
                发送邮件
              </a>
              <Link to="/portfolio" className="px-6 md:px-8 py-2.5 md:py-3 border border-border text-white text-xs md:text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-2">
                查看完整作品集 <ExternalLink size={12} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 精选项目 */}
      <section id="work" className="py-16 md:py-32 px-4 md:px-6 bg-surface/30">
        <div className="max-w-custom mx-auto">
          <SectionTitle subtitle="Selected Works">精选项目</SectionTitle>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {PROJECTS.map((project, index) => (
              <div 
                key={project.id}
                className="group block cursor-pointer"
                onClick={() => handleProjectClick(project.category)}
              >
                <div className="aspect-[4/3] overflow-hidden bg-black border border-border mb-4 md:mb-6 relative">
                  <img
                    src={project.cover}
                    alt={project.title}
                    loading="lazy"
                    style={{ objectPosition: project.imagePos || "50% 50%" }}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                  <div className="absolute bottom-3 right-3 md:bottom-4 md:right-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    点击查看该分类作品 →
                  </div>
                </div>

                <div className="flex justify-between items-baseline mb-2 md:mb-3">
                  <h3 className="text-lg md:text-2xl font-medium text-primary group-hover:text-white transition-colors">
                    {project.title}
                  </h3>
                  <span className="text-[10px] md:text-xs text-secondary tracking-wider uppercase">
                    {project.categoryLabel}
                  </span>
                </div>

                <p className="text-secondary text-xs md:text-sm leading-relaxed mb-3 md:mb-4 max-w-lg">
                  {project.desc}
                </p>

                <div className="flex flex-wrap gap-1.5 md:gap-2">
                  {project.tags.map(tag => (
                    <span key={tag} className="text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 md:py-1 border border-border text-secondary rounded-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 专业优势与核心技能 */}
      <section id="skills" className="py-16 md:py-32 px-4 md:px-6">
        <div className="max-w-custom mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-24">
            <div>
              <SectionTitle subtitle="Advantages">专业优势</SectionTitle>
              <div className="space-y-8 md:space-y-12">
                {ADVANTAGES.map((adv, i) => (
                  <div key={i} className="border-l border-border pl-4 md:pl-6 hover:border-white transition-colors duration-300">
                    <h4 className="text-base md:text-lg font-medium text-primary mb-1.5 md:mb-2">{adv.title}</h4>
                    <p className="text-secondary text-xs md:text-sm leading-relaxed">{adv.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <SectionTitle subtitle="Tech Stack">核心技能</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {SKILLS.map((skill, i) => (
                  <div key={i} className="p-4 md:p-5 border border-border bg-surface/50 hover:bg-surface transition-colors group">
                    <div className="flex justify-between items-center mb-2 md:mb-3">
                      <div className="flex items-center gap-2 md:gap-3 text-primary group-hover:text-white">
                        {skill.icon}
                        <span className="text-sm md:text-base font-medium">{skill.name}</span>
                      </div>
                      <span className="text-[10px] md:text-xs text-secondary">{skill.level}%</span>
                    </div>
                    <div className="w-full h-[2px] bg-border overflow-hidden">
                      <div
                        className="h-full bg-white transition-all duration-1000"
                        style={{ width: `${skill.level}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 联系 */}
      <section id="contact" className="min-h-screen flex flex-col justify-center px-4 md:px-6 border-t border-border relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap pointer-events-none select-none opacity-[0.03]">
          <span className="text-[25vw] md:text-[20vw] font-bold leading-none">CONTACT</span>
        </div>
        <div className="max-w-custom mx-auto w-full relative z-10">
          <p className="text-secondary tracking-[0.3em] text-xs md:text-sm mb-6 md:mb-8 uppercase">Get In Touch</p>
          <h2 className="text-3xl md:text-8xl font-bold tracking-tighter mb-10 md:mb-16 break-words">
            期待与您<br />共创视觉佳作
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 border-t border-border pt-8 md:pt-12">
            <div>
              <h5 className="text-[10px] md:text-xs text-secondary uppercase tracking-widest mb-3 md:mb-4">Email</h5>
              <a href={`mailto:${PROFILE.contact.email}`} className="text-base md:text-2xl hover:text-secondary transition-colors break-all">
                {PROFILE.contact.email}
              </a>
            </div>
            <div>
              <h5 className="text-[10px] md:text-xs text-secondary uppercase tracking-widest mb-3 md:mb-4">Phone</h5>
              <a href={`tel:${PROFILE.contact.phone}`} className="text-base md:text-2xl hover:text-secondary transition-colors">
                {PROFILE.contact.phone}
              </a>
            </div>
            <div>
              <h5 className="text-[10px] md:text-xs text-secondary uppercase tracking-widest mb-3 md:mb-4">Location</h5>
              <p className="text-base md:text-2xl">{PROFILE.contact.city}</p>
            </div>
          </div>
          <div className="mt-20 md:mt-32 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 text-secondary text-[10px] md:text-xs">
            <p>© {new Date().getFullYear()} {PROFILE.name}. All Rights Reserved.</p>
            <p>Designed for 3D Artistry</p>
          </div>
        </div>
      </section>
    </>
  );
}

// --- 完整作品集页面 ---
function PortfolioPage() {
  const [activeCategory, setActiveCategory] = useState("全部");
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // 读作者中心改过的数据；没改过就是代码里的 ALL_WORKS
  const { works } = useWorks();
  const CATEGORIES = useMemo(() => deriveCategories(works), [works]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const category = params.get("category");
    if (category && CATEGORIES.includes(category)) {
      setActiveCategory(category);
    }
  }, [location.search, CATEGORIES]);

  const filteredWorks = works.filter(work => {
    const matchesCategory = activeCategory === "全部" || work.category === activeCategory;
    const haystack = `${work.title || ""} ${work.desc || ""}`.toLowerCase();
    return matchesCategory && haystack.includes(searchTerm.toLowerCase());
  });

  const getCategoryCount = (category) => {
    if (category === "全部") return works.length;
    return works.filter(work => work.category === category).length;
  };

  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    if (category === "全部") {
      navigate("/portfolio");
    } else {
      navigate(`/portfolio?category=${encodeURIComponent(category)}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 md:px-6 py-3 md:py-4">
        <div className="max-w-custom mx-auto flex justify-between items-center">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-secondary hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            <span className="text-xs md:text-sm">返回首页</span>
          </button>
          <div className="flex items-center gap-3 md:gap-4">
            <span className="text-xs md:text-sm text-secondary">完整作品集</span>
            <Link to="/login" className="flex items-center gap-1 text-secondary hover:text-white transition-colors" title="作者中心">
              <Settings size={16} />
            </Link>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 pt-10 md:pt-16 pb-6 md:pb-8">
        <div className="max-w-custom mx-auto">
          <h1 className="text-3xl md:text-6xl font-bold tracking-tighter mb-3 md:mb-4">
            {activeCategory === "全部" ? "全部作品" : activeCategory}
          </h1>
          <p className="text-secondary text-sm md:text-lg max-w-2xl mb-3 md:mb-4">
            涵盖美妆个护、食品饮料、3C数码、硬表面与场景等3D创作方向
          </p>
          <div className="flex gap-4 md:gap-6 text-xs md:text-sm text-secondary">
            <span>共 {works.length} 个作品</span>
            <span>当前显示 {filteredWorks.length} 个</span>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 pb-4 md:pb-6">
        <div className="max-w-custom mx-auto">
          <input
            type="text"
            placeholder="搜索作品..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-96 px-3 md:px-4 py-2.5 md:py-3 bg-surface border border-border text-white text-sm placeholder-secondary focus:border-white focus:outline-none transition-colors"
          />
        </div>
      </div>

      <div className="px-4 md:px-6 pb-8 md:pb-12">
        <div className="max-w-custom mx-auto flex flex-wrap gap-2 md:gap-3">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-3 md:px-5 py-1.5 md:py-2 text-xs md:text-sm border transition-all duration-300 ${
                activeCategory === cat
                  ? "bg-white text-black border-white"
                  : "border-border text-secondary hover:border-white hover:text-white"
              }`}
            >
              {cat}
              <span className="ml-1.5 md:ml-2 text-[10px] md:text-xs opacity-60">
                ({getCategoryCount(cat)})
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 md:px-6 pb-16 md:pb-24">
        <div className="max-w-custom mx-auto">
          {filteredWorks.length === 0 ? (
            <div className="text-center py-16 md:py-20">
              <div className="text-4xl md:text-6xl mb-3 md:mb-4">🔍</div>
              <p className="text-secondary text-sm md:text-lg mb-3 md:mb-4">未找到相关作品</p>
              <button
                onClick={() => {
                  setActiveCategory("全部");
                  setSearchTerm("");
                  navigate("/portfolio");
                }}
                className="px-5 md:px-6 py-2 md:py-2.5 border border-border text-white text-xs md:text-sm hover:bg-white/5 transition-colors"
              >
                查看全部作品
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filteredWorks.map((work, index) => (
                <div
                  key={work.id}
                  className="group cursor-pointer"
                  onClick={() => navigate(`/work/${work.slug}`)}
                >
                  <div className="aspect-[4/3] overflow-hidden bg-black border border-border mb-3 md:mb-4 relative">
                    <img
                      src={coverOf(work)}
                      alt={work.title}
                      loading="lazy"
                      style={{ objectPosition: work.imagePos || "50% 50%" }}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                    />
                    <div className="absolute top-2 md:top-3 left-2 md:left-3 bg-black/60 backdrop-blur-sm px-2 md:px-3 py-0.5 md:py-1 text-[10px] md:text-xs text-white">
                      {work.category}
                    </div>
                    <div className="absolute bottom-3 md:bottom-4 right-3 md:right-4 bg-black/60 backdrop-blur-sm px-3 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      查看详情 →
                    </div>
                  </div>
                  <h3 className="text-base md:text-lg font-medium text-primary group-hover:text-white transition-colors mb-1">
                    {work.title}
                  </h3>
                  <p className="text-xs md:text-sm text-secondary">{work.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- 作品详情页 ---
function WorkDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { works, ready } = useWorks();
  const work = works.find((w) => w.slug === slug);
  const [selectedImage, setSelectedImage] = useState(work?.detail?.images?.[0] || "");

  useEffect(() => {
    if (work) {
      setSelectedImage(work.detail?.images?.[0] || "");
    }
  }, [slug, work]);

  // 数据是异步从浏览器存储里读的，等读完再判断「不存在」，避免刷新时闪一下 404
  if (!work && !ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-secondary text-sm">
        正在载入…
      </div>
    );
  }

  if (!work) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center">
          <h1 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4">作品不存在</h1>
          <button
            onClick={() => navigate("/portfolio")}
            className="px-5 md:px-6 py-2.5 md:py-3 bg-white text-black text-xs md:text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            返回作品集
          </button>
        </div>
      </div>
    );
  }

  // 作者中心可能把某些字段清空，这里统一兜底，避免详情页崩掉
  const detail = work.detail || {};
  const detailImages = (detail.images || []).filter(Boolean);
  const detailTags = detail.tags || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 md:px-6 py-3 md:py-4">
        <div className="max-w-custom mx-auto flex justify-between items-center">
          <button
            onClick={() => navigate("/portfolio")}
            className="flex items-center gap-2 text-secondary hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            <span className="text-xs md:text-sm">返回作品集</span>
          </button>
          <div className="flex items-center gap-3 md:gap-4">
            <span className="text-xs md:text-sm text-secondary">{work.category}</span>
            <Link to="/login" className="flex items-center gap-1 text-secondary hover:text-white transition-colors" title="作者中心">
              <Settings size={16} />
            </Link>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 pt-10 md:pt-16 pb-6 md:pb-8">
        <div className="max-w-custom mx-auto">
          <h1 className="text-2xl md:text-6xl font-bold tracking-tighter mb-4 md:mb-6">
            {detail.title || work.title}
          </h1>
          <p className="text-secondary text-sm md:text-lg leading-relaxed max-w-3xl mb-4 md:mb-6">
            {detail.description}
          </p>
          <div className="flex flex-wrap gap-1.5 md:gap-2">
            {detailTags.map(tag => (
              <span key={tag} className="text-[10px] md:text-xs px-2 md:px-3 py-0.5 md:py-1 border border-border text-secondary rounded-sm">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 pb-6 md:pb-8">
        <div className="max-w-custom mx-auto">
          {/* 用 contain 而不是 cover：作品图有横有竖，contain 能保证整张渲染完整呈现，
              深色底上的留白反而更像画框，不会被裁掉瓶盖或场景。 */}
          <div className="aspect-[16/10] bg-surface border border-border overflow-hidden flex items-center justify-center">
            <img
              src={selectedImage}
              alt={detail.title || work.title}
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      </div>

      {detailImages.length > 1 && (
        <div className="px-4 md:px-6 pb-16 md:pb-24">
          <div className="max-w-custom mx-auto">
            <h3 className="text-xs md:text-sm text-secondary uppercase tracking-widest mb-3 md:mb-4">
              作品图集
            </h3>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-4">
              {detailImages.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(img)}
                  className={`aspect-square overflow-hidden border transition-all duration-300 ${
                    selectedImage === img
                      ? "border-white"
                      : "border-border hover:border-secondary"
                  }`}
                >
                  <img
                    src={img}
                    alt={`${detail.title || work.title} - ${index + 1}`}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="px-4 md:px-6 pb-16 md:pb-24">
        <div className="max-w-custom mx-auto">
          <h3 className="text-xs md:text-sm text-secondary uppercase tracking-widest mb-4 md:mb-6">
            同分类其他作品
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
            {works
              .filter(w => w.category === work.category && w.id !== work.id)
              .slice(0, 3)
              .map(relatedWork => (
                <div
                  key={relatedWork.id}
                  className="group cursor-pointer"
                  onClick={() => {
                    navigate(`/work/${relatedWork.slug}`);
                  }}
                >
                  <div className="aspect-[4/3] overflow-hidden bg-black border border-border mb-2 md:mb-3 relative">
                    <img
                      src={relatedWork.image}
                      alt={relatedWork.title}
                      loading="lazy"
                      style={{ objectPosition: relatedWork.imagePos || "50% 50%" }}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                    />
                  </div>
                  <h4 className="text-xs md:text-sm font-medium text-primary group-hover:text-white transition-colors">
                    {relatedWork.title}
                  </h4>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- 404 页面 ---
function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap pointer-events-none select-none opacity-[0.03]">
        <span className="text-[40vw] md:text-[24vw] font-bold leading-none">404</span>
      </div>
      <div className="relative z-10">
        <p className="text-secondary tracking-[0.3em] text-[10px] md:text-xs mb-4 md:mb-6 uppercase">
          Page Not Found
        </p>
        <h1 className="text-4xl md:text-7xl font-bold tracking-tighter mb-4 md:mb-6">
          页面走丢了
        </h1>
        <p className="text-secondary text-sm md:text-base font-light mb-10 md:mb-14 max-w-md mx-auto">
          你访问的地址不存在，或者作品已经被移走了。不如回首页看看新的渲染？
        </p>
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
          <button
            onClick={() => navigate("/")}
            className="px-6 md:px-8 py-2.5 md:py-3 bg-white text-black text-xs md:text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            返回首页
          </button>
          <button
            onClick={() => navigate("/portfolio")}
            className="px-6 md:px-8 py-2.5 md:py-3 border border-border text-white text-xs md:text-sm font-medium hover:bg-white/5 transition-colors"
          >
            查看完整作品集
          </button>
        </div>
      </div>
    </div>
  );
}

// --- 主应用 ---
function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background selection:bg-white/20">
        <Routes>
          {/* 公开页面 = 工作室版视觉 */}
          <Route path="/" element={<StudioHome />} />
          <Route path="/portfolio" element={<StudioWorkList />} />
          <Route path="/works" element={<StudioWorkList />} />
          <Route path="/work/:slug" element={<StudioWorkDetail />} />
          <Route path="/portfolio/:slug" element={<StudioWorkDetail />} />
          {/* 作者中心 / 登录：仍是原来的 Tailwind 组件 */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/work/:id" element={<AdminWorkPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </ErrorBoundary>
  );
}

export default App;