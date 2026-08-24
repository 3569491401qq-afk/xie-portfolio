import React from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Mail, Phone, MapPin, ExternalLink,
  Box, Layers, Cpu, Eye, ArrowDown
} from "lucide-react";

const PROFILE = {
  name: "谢曙浩",
  title: "3D Artist / 3D建模师",
  tagline: "光影重构现实 · 极致视觉表达",
  bio: "1.5年经验的独立3D艺术家，深耕3D建模与渲染领域。精通Cinema 4D与Blender双软件工作流，熟练使用Octane/Redshift/Cycles等主流渲染器。聚焦广告设计方向，擅长产品视觉化与场景构建，追求照片级渲染品质。",
  contact: {
    phone: "193 8854 5612",
    email: "your.email@example.com",
    city: "China",
    portfolio: "#"
  },
  stats: [
    { label: "从业年限", value: "1.5+" },
    { label: "交付项目", value: "20+" },
    { label: "精通软件", value: "6+" },
  ]
};

const SKILLS = [
  { name: "Cinema 4D", level: 95, icon: <Box size={20} /> },
  { name: "Blender", level: 90, icon: <Layers size={20} /> },
  { name: "Octane Render", level: 85, icon: <Cpu size={20} /> },
  { name: "Redshift", level: 80, icon: <Cpu size={20} /> },
  { name: "Cycles", level: 85, icon: <Eye size={20} /> },
  { name: "Eevee", level: 80, icon: <Eye size={20} /> },
];

const PROJECTS = [
  {
    id: 1,
    title: "高端美妆产品超写实渲染",
    category: "C4D + Octane",
    desc: "针对唇釉、精华液等化妆品进行精细建模与材质还原。攻克液体质感、玻璃瓶身反射与细腻材质细节，产出具有高级商业广告质感的超写实视觉图像。",
    tags: ["硬表面建模", "材质节点", "光影控制", "产品可视化"],
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4f9d?q=80&w=2000&auto=format&fit=crop"
  },
  {
    id: 2,
    title: "大型游戏场景资产开发",
    category: "Blender + Cycles",
    desc: "负责游戏场景环境资产制作：构建地形、建筑及环境装饰物等大规模资产。优化模型拓扑与场景结构，结合Cycles引擎调试环境光影，保证视觉冲击力与空间逻辑统一。",
    tags: ["场景构筑", "资产开发", "拓扑优化", "环境光照"],
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2000&auto=format&fit=crop"
  }
];

const ADVANTAGES = [
  { title: "跨软件工作流", desc: "精通C4D与Blender，根据项目需求灵活选择最高效工具链" },
  { title: "独立交付能力", desc: "长期自由职业经历，习惯从需求理解到最终渲染交付的完整闭环" },
  { title: "扎实建模功底", desc: "硬表面、产品与场景建模兼备，对模型拓扑与细节要求严格" },
  { title: "极致渲染审美", desc: "熟悉光影、材质与构图表达，追求照片级商业渲染品质" },
];

const SectionTitle = ({ children, subtitle }) => (
  <div className="mb-16 md:mb-24">
    {subtitle && <span className="text-xs tracking-[0.3em] text-secondary uppercase mb-3 block">{subtitle}</span>}
    <h2 className="text-3xl md:text-5xl font-light tracking-tight text-primary">{children}</h2>
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

export default function App() {
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  return (
    <div className="min-h-screen bg-background selection:bg-white/20">

      {/* 导航 */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 mix-blend-difference text-white">
        <div className="max-w-custom mx-auto flex justify-between items-center">
          <span className="text-lg font-bold tracking-wider">{PROFILE.name.toUpperCase()}</span>
          <div className="hidden md:flex gap-8 text-sm tracking-wide text-secondary">
            <a href="#about" className="hover:text-white transition-colors">关于</a>
            <a href="#work" className="hover:text-white transition-colors">作品</a>
            <a href="#skills" className="hover:text-white transition-colors">优势</a>
            <a href="#contact" className="hover:text-white transition-colors">联系</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
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

      {/* About */}
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
                <a href={PROFILE.contact.portfolio} target="_blank" rel="noreferrer" className="px-8 py-3 border border-border text-white text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-2">
                  查看完整作品集 <ExternalLink size={14} />
                </a>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Projects */}
      <section id="work" className="py-32 px-6 bg-surface/30">
        <div className="max-w-custom mx-auto">
          <FadeIn>
            <SectionTitle subtitle="Selected Works">精选项目</SectionTitle>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {PROJECTS.map((project, index) => (
              <FadeIn key={project.id} delay={index * 0.2}>
                <div className="group cursor-pointer">
                  <div className="aspect-[4/3] overflow-hidden bg-black border border-border mb-6 relative">
                    <img
                      src={project.image}
                      alt={project.title}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out"
                    />
                  </div>
                  <div className="flex justify-between items-baseline mb-3">
                    <h3 className="text-2xl font-medium text-primary">{project.title}</h3>
                    <span className="text-xs text-secondary tracking-wider uppercase">{project.category}</span>
                  </div>
                  <p className="text-secondary text-sm leading-relaxed mb-4 max-w-lg">{project.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map(tag => (
                      <span key={tag} className="text-[10px] px-2 py-1 border border-border text-secondary rounded-sm">{tag}</span>
                    ))}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Skills & Advantages */}
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
                          transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
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

      {/* Contact */}
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

    </div>
  );
}