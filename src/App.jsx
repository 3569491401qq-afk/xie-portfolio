import React, { useState, useEffect, useRef } from "react";
import { Routes, Route, Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Mail, Phone, MapPin, ExternalLink, ArrowLeft,
  Box, Layers, Cpu, Eye, ArrowDown, Settings, LogOut,
  Plus, Trash2, Edit3, Save, X, Image as ImageIcon, Lock,
  Upload, ClipboardPaste, Check
} from "lucide-react";

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
  stats: [
    { label: "从业年限", value: "1.5+" },
    { label: "交付项目", value: "20+" },
    { label: "精通软件", value: "6+" },
  ]
};

// 作者账号信息
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

// 所有作品数据（按分类）- 每个产品有独立详情
const ALL_WORKS = [
  // 美妆产品
  {
    id: 1,
    title: "高端唇釉渲染",
    category: "美妆产品",
    image: "/images/1.png",
    desc: "唇釉液体质感表现",
    slug: "lip-gloss",
    detail: {
      title: "高端唇釉超写实渲染",
      category: "C4D + Octane",
      description: "为美妆品牌进行唇釉产品可视化建模与渲染。重点攻克液体质感、玻璃瓶身反射与细腻材质细节，通过精准的光影控制，产出具有高级商业广告质感的超写实视觉图像。",
      tags: ["硬表面建模", "液体材质", "光影控制", "产品可视化"],
      images: ["/images/1.png", "/images/2.png", "/images/3.png"]
    }
  },
  {
    id: 2,
    title: "精华液产品渲染",
    category: "美妆产品",
    image: "/images/2.png",
    desc: "玻璃瓶身反射细节",
    slug: "serum",
    detail: {
      title: "精华液产品超写实渲染",
      category: "C4D + Octane",
      description: "精华液产品可视化渲染，重点表现玻璃瓶身质感、液体通透度与光影反射效果。",
      tags: ["玻璃材质", "液体渲染", "产品可视化"],
      images: ["/images/2.png", "/images/1.png", "/images/3.png"]
    }
  },
  {
    id: 3,
    title: "美妆套装展示",
    category: "美妆产品",
    image: "/images/3.png",
    desc: "多产品组合场景渲染",
    slug: "beauty-set",
    detail: {
      title: "美妆套装组合展示",
      category: "C4D + Octane",
      description: "美妆产品组合场景渲染，展现产品之间的材质对比与整体视觉统一性。",
      tags: ["场景搭建", "多产品渲染", "商业可视化"],
      images: ["/images/3.png", "/images/1.png", "/images/2.png"]
    }
  },
  
  // 3C数码
  {
    id: 4,
    title: "智能手机渲染",
    category: "3C数码",
    image: "/images/4.png",
    desc: "金属材质与屏幕反射表现",
    slug: "smartphone",
    detail: {
      title: "智能手机商业渲染",
      category: "Blender + Cycles",
      description: "智能手机产品可视化渲染，重点表现金属边框质感、屏幕玻璃反射与精密结构细节。",
      tags: ["硬表面建模", "金属材质", "屏幕反射"],
      images: ["/images/4.png", "/images/5.png", "/images/6.png"]
    }
  },
  {
    id: 5,
    title: "无线耳机渲染",
    category: "3C数码",
    image: "/images/5.png",
    desc: "磨砂表面质感表现",
    slug: "earbuds",
    detail: {
      title: "无线耳机商业渲染",
      category: "Blender + Cycles",
      description: "无线耳机产品渲染，重点表现磨砂表面质感、金属充电触点与产品细节。",
      tags: ["磨砂材质", "产品细节", "商业渲染"],
      images: ["/images/5.png", "/images/4.png", "/images/6.png"]
    }
  },
  {
    id: 6,
    title: "智能手表渲染",
    category: "3C数码",
    image: "/images/6.png",
    desc: "科技感光影调试",
    slug: "smartwatch",
    detail: {
      title: "智能手表商业渲染",
      category: "Blender + Cycles",
      description: "智能手表产品渲染，重点表现表盘玻璃反射、金属表带质感与科技感光影效果。",
      tags: ["金属材质", "玻璃反射", "科技感光影"],
      images: ["/images/6.png", "/images/4.png", "/images/5.png"]
    }
  },
  
  // 日化产品
  {
    id: 7,
    title: "洗发水产品渲染",
    category: "日化产品",
    image: "/images/7.png",
    desc: "塑料瓶身与液体质感",
    slug: "shampoo",
    detail: {
      title: "洗发水产品商业渲染",
      category: "C4D + Octane",
      description: "洗发水产品可视化渲染，重点表现塑料瓶身质感、液体透明度与标签贴图细节。",
      tags: ["塑料材质", "液体渲染", "标签贴图"],
      images: ["/images/7.png"]
    }
  },
  {
    id: 8,
    title: "沐浴露产品渲染",
    category: "日化产品",
    image: "/images/7.png",
    desc: "日化产品组合展示",
    slug: "body-wash",
    detail: {
      title: "沐浴露产品商业渲染",
      category: "C4D + Octane",
      description: "沐浴露产品渲染，重点表现瓶身弧度、液体质感与品牌标签设计。",
      tags: ["产品建模", "液体材质", "商业可视化"],
      images: ["/images/7.png"]
    }
  },
  
  // 家电产品
  {
    id: 9,
    title: "扫地机器人渲染",
    category: "家电产品",
    image: "/images/8.png",
    desc: "智能家电产品可视化",
    slug: "robot-vacuum",
    detail: {
      title: "扫地机器人商业渲染",
      category: "Blender + Cycles",
      description: "扫地机器人产品可视化渲染，重点表现机身哑光质感、传感器细节与科技感外观设计。",
      tags: ["硬表面建模", "哑光材质", "科技产品"],
      images: ["/images/8.png"]
    }
  },
  {
    id: 10,
    title: "电磁炉产品渲染",
    category: "家电产品",
    image: "/images/8.png",
    desc: "厨房家电产品可视化",
    slug: "induction-cooker",
    detail: {
      title: "电磁炉产品商业渲染",
      category: "Blender + Cycles",
      description: "电磁炉产品渲染，重点表现玻璃面板反射、金属边框质感与操作界面细节。",
      tags: ["玻璃面板", "金属材质", "家电渲染"],
      images: ["/images/8.png"]
    }
  },
];

// 精选项目（首页展示4个版块）- 按2x2布局
const PROJECTS = [
  {
    id: 1,
    slug: "beauty",
    title: "高端美妆产品超写实渲染",
    category: "美妆产品",
    categoryLabel: "C4D + Octane",
    desc: "为美妆品牌进行产品可视化建模与渲染。针对唇釉、精华液等化妆品进行精细建模与材质还原，重点攻克液体质感、玻璃瓶身反射与细腻材质细节。",
    tags: ["硬表面建模", "材质节点搭建", "光影控制", "产品可视化"],
    cover: "/images/1.png",
    images: ["/images/1.png", "/images/2.png", "/images/3.png"]
  },
  {
    id: 2,
    slug: "daily",
    title: "日化产品商业渲染",
    category: "日化产品",
    categoryLabel: "C4D + Octane",
    desc: "为日化品牌进行产品可视化建模与渲染。针对洗发水、沐浴露等日化产品进行精细建模与材质还原，重点攻克塑料瓶身质感与液体透明度。",
    tags: ["硬表面建模", "液体材质", "标签贴图", "商业可视化"],
    cover: "/images/7.png",
    images: ["/images/7.png"]
  },
  {
    id: 3,
    slug: "digital",
    title: "3C数码产品商业渲染",
    category: "3C数码",
    categoryLabel: "Blender + Cycles",
    desc: "为3C数码品牌进行产品可视化建模与渲染。针对手机、耳机、智能手表等数码产品进行高精度建模与材质还原，重点攻克金属拉丝质感与屏幕玻璃反射。",
    tags: ["硬表面建模", "金属材质", "产品渲染", "商业可视化"],
    cover: "/images/4.png",
    images: ["/images/4.png", "/images/5.png", "/images/6.png"]
  },
  {
    id: 4,
    slug: "appliance",
    title: "家电产品商业渲染",
    category: "家电产品",
    categoryLabel: "Blender + Cycles",
    desc: "为家电品牌进行产品可视化建模与渲染。针对扫地机器人、电磁炉等家电产品进行高精度建模与材质还原，重点攻克哑光质感与科技感外观设计。",
    tags: ["硬表面建模", "哑光材质", "科技产品", "商业可视化"],
    cover: "/images/8.png",
    images: ["/images/8.png"]
  }
];

const ADVANTAGES = [
  { title: "跨软件工作流", desc: "精通C4D与Blender，根据项目需求灵活选择最高效工具链" },
  { title: "独立交付能力", desc: "长期自由职业经历，习惯从需求理解到最终渲染交付的完整闭环" },
  { title: "扎实建模功底", desc: "硬表面、产品与场景建模兼备，对模型拓扑与细节要求严格" },
  { title: "极致渲染审美", desc: "熟悉光影、材质与构图表达，追求照片级商业渲染品质" },
];

// 动态生成分类（只显示有作品的分类）
const CATEGORIES = ["全部", ...new Set(ALL_WORKS.map(work => work.category))];

// --- 通用组件 ---
const SectionTitle = ({ children, subtitle }) => (
  <div className="mb-16 md:mb-24">
    {subtitle && (
      <span className="text-xs tracking-[0.3em] text-secondary uppercase mb-3 block">
        {subtitle}
      </span>
    )}
    <h2 className="text-3xl md:text-5xl font-light tracking-tight text-primary">
      {children}
    </h2>
    <div className="w-20 h-[1px] bg-border mt-6"></div>
  </div>
);

const FadeIn = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay }}
  >
    {children}
  </motion.div>
);

// --- 登录页面组件 ---
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
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-white/5 border border-border rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock size={28} className="text-secondary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tighter mb-2">作者中心</h1>
          <p className="text-secondary text-sm">请输入账号和密码登录</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm text-secondary mb-2">账号</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入账号"
              className="w-full px-4 py-3 bg-surface border border-border text-white placeholder-secondary focus:border-white focus:outline-none transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-secondary mb-2">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="w-full px-4 py-3 bg-surface border border-border text-white placeholder-secondary focus:border-white focus:outline-none transition-colors"
              required
            />
          </div>
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
          <button
            type="submit"
            className="w-full px-6 py-3 bg-white text-black text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            登录
          </button>
        </form>

        <button
          onClick={() => navigate("/")}
          className="w-full mt-4 px-6 py-3 border border-border text-secondary text-sm hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft size={16} />
          返回首页
        </button>
      </div>
    </div>
  );
}

// --- 作者中心管理页面 ---
function AdminPage() {
  const [works, setWorks] = useState(ALL_WORKS);
  const [editingWork, setEditingWork] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [pastedImages, setPastedImages] = useState([]);
  const [newWork, setNewWork] = useState({
    title: "",
    category: "美妆产品",
    image: "",
    desc: "",
    slug: "",
    detail: {
      title: "",
      category: "",
      description: "",
      tags: [],
      images: []
    }
  });
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // 检查登录状态
  useEffect(() => {
    const isLoggedIn = sessionStorage.getItem("isAuthorLoggedIn");
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem("isAuthorLoggedIn");
    navigate("/");
  };

  const handleDeleteWork = (id) => {
    if (window.confirm("确定要删除这个作品吗？")) {
      setWorks(works.filter(work => work.id !== id));
    }
  };

  const handleEditWork = (work) => {
    setEditingWork({ ...work });
  };

  const handleSaveEdit = () => {
    setWorks(works.map(work => 
      work.id === editingWork.id ? editingWork : work
    ));
    setEditingWork(null);
    alert("保存成功！");
  };

  // 处理粘贴图片
  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          const reader = new FileReader();
          reader.onload = (event) => {
            const imageUrl = event.target.result;
            setPastedImages(prev => [...prev, imageUrl]);
            // 自动设置第一张为封面
            if (pastedImages.length === 0) {
              setNewWork(prev => ({ ...prev, image: imageUrl }));
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  // 处理文件上传
  const handleFileUpload = (e) => {
    const files = e.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const imageUrl = event.target.result;
          setPastedImages(prev => [...prev, imageUrl]);
          if (pastedImages.length === 0) {
            setNewWork(prev => ({ ...prev, image: imageUrl }));
          }
        };
        reader.readAsDataURL(files[i]);
      }
    }
  };

  const handleAddWork = () => {
    const newId = Math.max(...works.map(w => w.id)) + 1;
    const workToAdd = {
      ...newWork,
      id: newId,
      image: pastedImages[0] || newWork.image,
      detail: {
        ...newWork.detail,
        images: pastedImages.length > 0 ? pastedImages : [newWork.image]
      }
    };
    setWorks([...works, workToAdd]);
    setShowAddForm(false);
    setPastedImages([]);
    setNewWork({
      title: "",
      category: "美妆产品",
      image: "",
      desc: "",
      slug: "",
      detail: {
        title: "",
        category: "",
        description: "",
        tags: [],
        images: []
      }
    });
    alert("添加成功！");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-6 py-4">
        <div className="max-w-custom mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-secondary hover:text-white transition-colors"
            >
              <ArrowLeft size={18} />
              <span className="text-sm">返回首页</span>
            </button>
            <span className="text-sm text-secondary">|</span>
            <span className="text-sm font-medium">作者中心</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-secondary hover:text-white transition-colors"
          >
            <LogOut size={18} />
            <span className="text-sm">退出登录</span>
          </button>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="px-6 py-12">
        <div className="max-w-custom mx-auto">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h1 className="text-4xl font-bold tracking-tighter mb-2">作品管理</h1>
              <p className="text-secondary">共 {works.length} 个作品</p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 bg-white text-black text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <Plus size={16} />
              添加作品
            </button>
          </div>

          {/* 添加作品弹窗 */}
          {showAddForm && (
            <div className="fixed inset-0 bg-black/50 z-20 flex items-center justify-center p-6">
              <div className="bg-background border border-border p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">添加新作品</h2>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="text-secondary hover:text-white"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* 图片粘贴区域 */}
                <div className="mb-6">
                  <label className="block text-sm text-secondary mb-2">作品图片（可直接粘贴或上传）</label>
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-white transition-colors"
                    onPaste={handlePaste}
                    onClick={() => fileInputRef.current?.click()}
                    tabIndex={0}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <ClipboardPaste size={32} className="mx-auto mb-3 text-secondary" />
                    <p className="text-secondary text-sm mb-2">
                      点击上传图片，或直接 Ctrl+V 粘贴图片
                    </p>
                    <p className="text-xs text-secondary/60">
                      支持多张图片，第一张将作为封面
                    </p>
                  </div>

                  {/* 已粘贴的图片预览 */}
                  {pastedImages.length > 0 && (
                    <div className="grid grid-cols-4 gap-3 mt-4">
                      {pastedImages.map((img, index) => (
                        <div key={index} className="relative aspect-square border border-border overflow-hidden group">
                          <img src={img} alt={`图片${index + 1}`} className="w-full h-full object-cover" />
                          {index === 0 && (
                            <span className="absolute top-1 left-1 bg-white text-black text-[10px] px-1.5 py-0.5 rounded-sm">
                              封面
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPastedImages(pastedImages.filter((_, i) => i !== index));
                            }}
                            className="absolute top-1 right-1 bg-black/60 p-1 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} className="text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-secondary mb-2">作品标题</label>
                    <input
                      type="text"
                      value={newWork.title}
                      onChange={(e) => setNewWork({...newWork, title: e.target.value})}
                      className="w-full px-4 py-2 bg-surface border border-border text-white focus:border-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-secondary mb-2">分类</label>
                    <select
                      value={newWork.category}
                      onChange={(e) => setNewWork({...newWork, category: e.target.value})}
                      className="w-full px-4 py-2 bg-surface border border-border text-white focus:border-white focus:outline-none"
                    >
                      {CATEGORIES.filter(cat => cat !== "全部").map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-secondary mb-2">简短描述</label>
                    <input
                      type="text"
                      value={newWork.desc}
                      onChange={(e) => setNewWork({...newWork, desc: e.target.value})}
                      className="w-full px-4 py-2 bg-surface border border-border text-white focus:border-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-secondary mb-2">Slug（URL标识）</label>
                    <input
                      type="text"
                      value={newWork.slug}
                      onChange={(e) => setNewWork({...newWork, slug: e.target.value})}
                      placeholder="例如：new-work"
                      className="w-full px-4 py-2 bg-surface border border-border text-white focus:border-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-secondary mb-2">详细标题</label>
                    <input
                      type="text"
                      value={newWork.detail.title}
                      onChange={(e) => setNewWork({...newWork, detail: {...newWork.detail, title: e.target.value}})}
                      className="w-full px-4 py-2 bg-surface border border-border text-white focus:border-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-secondary mb-2">详细描述</label>
                    <textarea
                      value={newWork.detail.description}
                      onChange={(e) => setNewWork({...newWork, detail: {...newWork.detail, description: e.target.value}})}
                      rows={4}
                      className="w-full px-4 py-2 bg-surface border border-border text-white focus:border-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-secondary mb-2">标签（用逗号分隔）</label>
                    <input
                      type="text"
                      value={newWork.detail.tags.join(", ")}
                      onChange={(e) => setNewWork({...newWork, detail: {...newWork.detail, tags: e.target.value.split(",").map(tag => tag.trim())}})}
                      placeholder="标签1, 标签2, 标签3"
                      className="w-full px-4 py-2 bg-surface border border-border text-white focus:border-white focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={handleAddWork}
                    className="w-full px-6 py-3 bg-white text-black text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    确认添加
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 编辑作品弹窗 */}
          {editingWork && (
            <div className="fixed inset-0 bg-black/50 z-20 flex items-center justify-center p-6">
              <div className="bg-background border border-border p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">编辑作品</h2>
                  <button
                    onClick={() => setEditingWork(null)}
                    className="text-secondary hover:text-white"
                  >
                    <X size={24} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-secondary mb-2">作品标题</label>
                    <input
                      type="text"
                      value={editingWork.title}
                      onChange={(e) => setEditingWork({...editingWork, title: e.target.value})}
                      className="w-full px-4 py-2 bg-surface border border-border text-white focus:border-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-secondary mb-2">分类</label>
                    <select
                      value={editingWork.category}
                      onChange={(e) => setEditingWork({...editingWork, category: e.target.value})}
                      className="w-full px-4 py-2 bg-surface border border-border text-white focus:border-white focus:outline-none"
                    >
                      {CATEGORIES.filter(cat => cat !== "全部").map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-secondary mb-2">封面图片URL</label>
                    <input
                      type="text"
                      value={editingWork.image}
                      onChange={(e) => setEditingWork({...editingWork, image: e.target.value})}
                      className="w-full px-4 py-2 bg-surface border border-border text-white focus:border-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-secondary mb-2">简短描述</label>
                    <input
                      type="text"
                      value={editingWork.desc}
                      onChange={(e) => setEditingWork({...editingWork, desc: e.target.value})}
                      className="w-full px-4 py-2 bg-surface border border-border text-white focus:border-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-secondary mb-2">详细标题</label>
                    <input
                      type="text"
                      value={editingWork.detail.title}
                      onChange={(e) => setEditingWork({...editingWork, detail: {...editingWork.detail, title: e.target.value}})}
                      className="w-full px-4 py-2 bg-surface border border-border text-white focus:border-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-secondary mb-2">详细描述</label>
                    <textarea
                      value={editingWork.detail.description}
                      onChange={(e) => setEditingWork({...editingWork, detail: {...editingWork.detail, description: e.target.value}})}
                      rows={4}
                      className="w-full px-4 py-2 bg-surface border border-border text-white focus:border-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-secondary mb-2">标签（用逗号分隔）</label>
                    <input
                      type="text"
                      value={editingWork.detail.tags.join(", ")}
                      onChange={(e) => setEditingWork({...editingWork, detail: {...editingWork.detail, tags: e.target.value.split(",").map(tag => tag.trim())}})}
                      className="w-full px-4 py-2 bg-surface border border-border text-white focus:border-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-secondary mb-2">详细图片URL（用逗号分隔）</label>
                    <input
                      type="text"
                      value={editingWork.detail.images.join(", ")}
                      onChange={(e) => setEditingWork({...editingWork, detail: {...editingWork.detail, images: e.target.value.split(",").map(img => img.trim())}})}
                      className="w-full px-4 py-2 bg-surface border border-border text-white focus:border-white focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={handleSaveEdit}
                    className="w-full px-6 py-3 bg-white text-black text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <Save size={16} />
                    保存修改
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 作品网格列表 - 仿照二级菜单布局 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {works.map((work, index) => (
              <motion.div
                key={work.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative"
              >
                <div className="aspect-[4/3] overflow-hidden bg-black border border-border mb-4 relative">
                  <img
                    src={work.image}
                    alt={work.title}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                  />
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1 text-xs text-white">
                    {work.category}
                  </div>
                  {/* 操作按钮 */}
                  <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditWork(work)}
                      className="p-2 bg-black/60 backdrop-blur-sm border border-white/20 text-white hover:bg-black/80 transition-colors"
                      title="编辑"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteWork(work.id)}
                      className="p-2 bg-black/60 backdrop-blur-sm border border-white/20 text-white hover:bg-red-600/80 transition-colors"
                      title="删除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <h3 className="text-lg font-medium text-primary group-hover:text-white transition-colors mb-1">
                  {work.title}
                </h3>
                <p className="text-sm text-secondary">{work.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- 首页组件 ---
function HomePage() {
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);
  const navigate = useNavigate();

  // 跳转到作品集并筛选对应分类
  const handleProjectClick = (category) => {
    navigate(`/portfolio?category=${encodeURIComponent(category)}`);
  };

  return (
    <>
      {/* 顶部导航 */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 mix-blend-difference text-white">
        <div className="max-w-custom mx-auto flex justify-between items-center">
          <span className="text-lg font-bold tracking-wider">
            {PROFILE.name.toUpperCase()}
          </span>
          <div className="hidden md:flex gap-8 text-sm tracking-wide text-secondary items-center">
            <a href="#about" className="hover:text-white transition-colors">关于</a>
            <a href="#work" className="hover:text-white transition-colors">作品</a>
            <a href="#skills" className="hover:text-white transition-colors">优势</a>
            <a href="#contact" className="hover:text-white transition-colors">联系</a>
            {/* 作者中心入口 */}
            <Link
              to="/login"
              className="flex items-center gap-1 hover:text-white transition-colors"
              title="作者中心"
            >
              <Settings size={16} />
              <span className="text-xs">作者中心</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* 1. Hero */}
      <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="w-full h-full bg-gradient-to-br from-[#0a0a0a] via-[#111] to-[#0a0a0a]" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background" />
        </div>
        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="relative z-10 text-center px-4 max-w-4xl"
        >
          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-secondary tracking-[0.4em] text-xs md:text-sm mb-6 uppercase"
          >
            {PROFILE.title}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8 }}
            className="text-5xl md:text-8xl font-bold tracking-tighter leading-none mb-8"
          >
            {PROFILE.name}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            className="text-lg md:text-xl text-secondary font-light max-w-xl mx-auto"
          >
            {PROFILE.tagline}
          </motion.p>
        </motion.div>
        <motion.div
          animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-secondary"
        >
          <ArrowDown size={24} />
        </motion.div>
      </section>

      {/* 2. About */}
      <section id="about" className="py-32 px-6">
        <div className="max-w-custom mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          <div className="lg:col-span-4">
            <FadeIn>
              <div className="aspect-[3/4] w-full bg-surface border border-border overflow-hidden relative group">
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000&auto=format&fit=crop"
                  alt="Profile"
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                />
              </div>
            </FadeIn>
          </div>
          <div className="lg:col-span-8 pt-8">
            <FadeIn delay={0.2}>
              <SectionTitle subtitle="About Me">个人简介</SectionTitle>
              <p className="text-xl md:text-2xl leading-relaxed text-secondary font-light mb-12">
                {PROFILE.bio}
              </p>
              <div className="grid grid-cols-3 gap-8 border-t border-border pt-8 mb-12">
                {PROFILE.stats.map((stat, i) => (
                  <div key={i}>
                    <div className="text-3xl md:text-4xl font-light text-primary mb-1">{stat.value}</div>
                    <div className="text-xs text-secondary tracking-widest uppercase">{stat.label}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-4">
                <a href={`mailto:${PROFILE.contact.email}`} className="px-8 py-3 bg-white text-black text-sm font-medium hover:bg-gray-200 transition-colors">
                  发送邮件
                </a>
                <Link to="/portfolio" className="px-8 py-3 border border-border text-white text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-2">
                  查看完整作品集 <ExternalLink size={14} />
                </Link>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* 3. Selected Works - 2x2布局：美妆+日化一行，3C+家电一行 */}
      <section id="work" className="py-32 px-6 bg-surface/30">
        <div className="max-w-custom mx-auto">
          <FadeIn>
            <SectionTitle subtitle="Selected Works">精选项目</SectionTitle>
          </FadeIn>

          {/* 第一行：美妆 + 日化 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {PROJECTS.slice(0, 2).map((project, index) => (
              <FadeIn key={project.id} delay={index * 0.15}>
                <div 
                  className="group block cursor-pointer"
                  onClick={() => handleProjectClick(project.category)}
                >
                  <div className="aspect-[4/3] overflow-hidden bg-black border border-border mb-6 relative">
                    <img
                      src={project.cover}
                      alt={project.title}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                    <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm px-4 py-2 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      点击查看该分类作品 →
                    </div>
                  </div>

                  <div className="flex justify-between items-baseline mb-3">
                    <h3 className="text-2xl font-medium text-primary group-hover:text-white transition-colors">
                      {project.title}
                    </h3>
                    <span className="text-xs text-secondary tracking-wider uppercase">
                      {project.categoryLabel}
                    </span>
                  </div>

                  <p className="text-secondary text-sm leading-relaxed mb-4 max-w-lg">
                    {project.desc}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {project.tags.map(tag => (
                      <span key={tag} className="text-[10px] px-2 py-1 border border-border text-secondary rounded-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>

          {/* 第二行：3C数码 + 家电 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {PROJECTS.slice(2, 4).map((project, index) => (
              <FadeIn key={project.id} delay={index * 0.15}>
                <div 
                  className="group block cursor-pointer"
                  onClick={() => handleProjectClick(project.category)}
                >
                  <div className="aspect-[4/3] overflow-hidden bg-black border border-border mb-6 relative">
                    <img
                      src={project.cover}
                      alt={project.title}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                    <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm px-4 py-2 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      点击查看该分类作品 →
                    </div>
                  </div>

                  <div className="flex justify-between items-baseline mb-3">
                    <h3 className="text-2xl font-medium text-primary group-hover:text-white transition-colors">
                      {project.title}
                    </h3>
                    <span className="text-xs text-secondary tracking-wider uppercase">
                      {project.categoryLabel}
                    </span>
                  </div>

                  <p className="text-secondary text-sm leading-relaxed mb-4 max-w-lg">
                    {project.desc}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {project.tags.map(tag => (
                      <span key={tag} className="text-[10px] px-2 py-1 border border-border text-secondary rounded-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Advantages & Skills */}
      <section id="skills" className="py-32 px-6">
        <div className="max-w-custom mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
            <div>
              <FadeIn>
                <SectionTitle subtitle="Advantages">专业优势</SectionTitle>
                <div className="space-y-12">
                  {ADVANTAGES.map((adv, i) => (
                    <div key={i} className="border-l border-border pl-6 hover:border-white transition-colors duration-300">
                      <h4 className="text-lg font-medium text-primary mb-2">{adv.title}</h4>
                      <p className="text-secondary text-sm leading-relaxed">{adv.desc}</p>
                    </div>
                  ))}
                </div>
              </FadeIn>
            </div>
            <div>
              <FadeIn delay={0.3}>
                <SectionTitle subtitle="Tech Stack">核心技能</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {SKILLS.map((skill, i) => (
                    <div key={i} className="p-5 border border-border bg-surface/50 hover:bg-surface transition-colors group">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3 text-primary group-hover:text-white">
                          {skill.icon}
                          <span className="font-medium">{skill.name}</span>
                        </div>
                        <span className="text-xs text-secondary">{skill.level}%</span>
                      </div>
                      <div className="w-full h-[2px] bg-border overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${skill.level}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                          className="h-full bg-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Footer / Contact */}
      <section id="contact" className="min-h-screen flex flex-col justify-center px-6 border-t border-border relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap pointer-events-none select-none opacity-[0.03]">
          <span className="text-[20vw] font-bold leading-none">CONTACT</span>
        </div>
        <div className="max-w-custom mx-auto w-full relative z-10">
          <FadeIn>
            <p className="text-secondary tracking-[0.3em] text-sm mb-8 uppercase">Get In Touch</p>
            <h2 className="text-5xl md:text-8xl font-bold tracking-tighter mb-16 break-words">
              期待与您<br />共创视觉佳作
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-border pt-12">
              <div>
                <h5 className="text-xs text-secondary uppercase tracking-widest mb-4">Email</h5>
                <a href={`mailto:${PROFILE.contact.email}`} className="text-xl md:text-2xl hover:text-secondary transition-colors break-all">
                  {PROFILE.contact.email}
                </a>
              </div>
              <div>
                <h5 className="text-xs text-secondary uppercase tracking-widest mb-4">Phone</h5>
                <a href={`tel:${PROFILE.contact.phone}`} className="text-xl md:text-2xl hover:text-secondary transition-colors">
                  {PROFILE.contact.phone}
                </a>
              </div>
              <div>
                <h5 className="text-xs text-secondary uppercase tracking-widest mb-4">Location</h5>
                <p className="text-xl md:text-2xl">{PROFILE.contact.city}</p>
              </div>
            </div>
            <div className="mt-32 flex justify-between items-end text-secondary text-xs">
              <p>© {new Date().getFullYear()} {PROFILE.name}. All Rights Reserved.</p>
              <p>Designed for 3D Artistry</p>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}

// --- 二级页面：完整作品集（支持URL参数筛选） ---
function PortfolioPage() {
  const [activeCategory, setActiveCategory] = useState("全部");
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // 从URL参数中读取分类
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const category = params.get("category");
    if (category && CATEGORIES.includes(category)) {
      setActiveCategory(category);
    }
  }, [location.search]);

  const filteredWorks = ALL_WORKS.filter(work => {
    const matchesCategory = activeCategory === "全部" || work.category === activeCategory;
    const matchesSearch = work.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         work.desc.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryCount = (category) => {
    if (category === "全部") return ALL_WORKS.length;
    return ALL_WORKS.filter(work => work.category === category).length;
  };

  // 更新URL参数
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
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-6 py-4">
        <div className="max-w-custom mx-auto flex justify-between items-center">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-secondary hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">返回首页</span>
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm text-secondary">完整作品集</span>
            <Link
              to="/login"
              className="flex items-center gap-1 text-secondary hover:text-white transition-colors"
              title="作者中心"
            >
              <Settings size={16} />
            </Link>
          </div>
        </div>
      </div>

      {/* 标题 */}
      <div className="px-6 pt-16 pb-8">
        <div className="max-w-custom mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4">
            {activeCategory === "全部" ? "全部作品" : activeCategory}
          </h1>
          <p className="text-secondary text-lg max-w-2xl mb-4">
            涵盖美妆产品、3C数码、日化产品、家电产品等3D创作方向
          </p>
          <div className="flex gap-6 text-sm text-secondary">
            <span>共 {ALL_WORKS.length} 个作品</span>
            <span>当前显示 {filteredWorks.length} 个</span>
          </div>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="px-6 pb-6">
        <div className="max-w-custom mx-auto">
          <input
            type="text"
            placeholder="搜索作品..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-96 px-4 py-3 bg-surface border border-border text-white placeholder-secondary focus:border-white focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* 分类筛选 */}
      <div className="px-6 pb-12">
        <div className="max-w-custom mx-auto flex flex-wrap gap-3">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-5 py-2 text-sm border transition-all duration-300 ${
                activeCategory === cat
                  ? "bg-white text-black border-white"
                  : "border-border text-secondary hover:border-white hover:text-white"
              }`}
            >
              {cat}
              <span className="ml-2 text-xs opacity-60">
                ({getCategoryCount(cat)})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 作品网格 */}
      <div className="px-6 pb-24">
        <div className="max-w-custom mx-auto">
          {filteredWorks.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-secondary text-lg mb-4">未找到相关作品</p>
              <button
                onClick={() => {
                  setActiveCategory("全部");
                  setSearchTerm("");
                  navigate("/portfolio");
                }}
                className="px-6 py-2 border border-border text-white text-sm hover:bg-white/5 transition-colors"
              >
                查看全部作品
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredWorks.map((work, index) => (
                <motion.div
                  key={work.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group cursor-pointer"
                  onClick={() => navigate(`/work/${work.slug}`)}
                >
                  <div className="aspect-[4/3] overflow-hidden bg-black border border-border mb-4 relative">
                    <img
                      src={work.image}
                      alt={work.title}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                    />
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1 text-xs text-white">
                      {work.category}
                    </div>
                    <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm px-4 py-2 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      查看详情 →
                    </div>
                  </div>
                  <h3 className="text-lg font-medium text-primary group-hover:text-white transition-colors mb-1">
                    {work.title}
                  </h3>
                  <p className="text-sm text-secondary">{work.desc}</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- 三级页面：产品详情页 ---
function WorkDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const work = ALL_WORKS.find(w => w.slug === slug);
  const [selectedImage, setSelectedImage] = useState(work?.detail.images[0] || "");

  // 当slug变化时重置选中的图片
  useEffect(() => {
    if (work) {
      setSelectedImage(work.detail.images[0]);
    }
  }, [slug]);

  if (!work) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">作品不存在</h1>
          <button
            onClick={() => navigate("/portfolio")}
            className="px-6 py-3 bg-white text-black text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            返回作品集
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-6 py-4">
        <div className="max-w-custom mx-auto flex justify-between items-center">
          <button
            onClick={() => navigate("/portfolio")}
            className="flex items-center gap-2 text-secondary hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">返回作品集</span>
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm text-secondary">{work.category}</span>
            <Link
              to="/login"
              className="flex items-center gap-1 text-secondary hover:text-white transition-colors"
              title="作者中心"
            >
              <Settings size={16} />
            </Link>
          </div>
        </div>
      </div>

      {/* 作品标题 */}
      <div className="px-6 pt-16 pb-8">
        <div className="max-w-custom mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-6">
            {work.detail.title}
          </h1>
          <p className="text-secondary text-lg leading-relaxed max-w-3xl mb-6">
            {work.detail.description}
          </p>
          <div className="flex flex-wrap gap-2">
            {work.detail.tags.map(tag => (
              <span key={tag} className="text-xs px-3 py-1 border border-border text-secondary rounded-sm">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 主图展示 */}
      <div className="px-6 pb-8">
        <div className="max-w-custom mx-auto">
          <div className="aspect-[16/9] bg-surface border border-border overflow-hidden">
            <img
              src={selectedImage}
              alt={work.detail.title}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* 缩略图列表 */}
      {work.detail.images.length > 1 && (
        <div className="px-6 pb-24">
          <div className="max-w-custom mx-auto">
            <h3 className="text-sm text-secondary uppercase tracking-widest mb-4">
              作品图集
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {work.detail.images.map((img, index) => (
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
                    alt={`${work.detail.title} - ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 相关作品推荐 */}
      <div className="px-6 pb-24">
        <div className="max-w-custom mx-auto">
          <h3 className="text-sm text-secondary uppercase tracking-widest mb-6">
            同分类其他作品
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ALL_WORKS
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
                  <div className="aspect-[4/3] overflow-hidden bg-black border border-border mb-3 relative">
                    <img
                      src={relatedWork.image}
                      alt={relatedWork.title}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                    />
                  </div>
                  <h4 className="text-sm font-medium text-primary group-hover:text-white transition-colors">
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

// --- 主应用 ---
export default function App() {
  return (
    <div className="min-h-screen bg-background selection:bg-white/20">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/work/:slug" element={<WorkDetailPage />} />
        <Route path="/portfolio/:slug" element={<WorkDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </div>
  );
}