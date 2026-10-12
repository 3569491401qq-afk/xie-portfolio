/**
 * 把俊勇的作品数据转成站点用的 schema：public/works-yong.json
 * 媒体文件从 public/previews/assets/jy/ 搬到 public/works/（前缀 jy-）
 *
 * 运行：node scripts/build-yong-works.mjs
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync, statSync } from 'node:fs';

const ROOT = 'C:/Users/Administrator/xie-portfolio';
const SRC = `${ROOT}/public/previews/assets/jy`;
const DST = `${ROOT}/public/works`;

const list = JSON.parse(readFileSync(`${ROOT}/public/previews/junyong-works.json`, 'utf8'));

/* 卡片上的一句话摘要：按站内「三段 · 分隔」的口径写，信息只从他自己的描述里取，
   不加没有的说法。最终措辞由他本人过一遍。 */
const DESC = {
  '散粉 · 粉调氛围短片': '粉体漫光 · 镜面反射 · 浅景深',
  '早餐工厂 · 玩具场景': '塑料高饱和 · 传送带构图 · 明亮光比',
  '多通道护肤水 · 光影版': '磨砂玻璃 · 格栅硬光 · 透光与焦散',
  '双萃精华 · 红棕瓶身': '有色液体 · 金属压泵 · 白底电商布光',
  '绿色香水 · 磨砂展台': '竖纹折射 · 背光内发光 · 轮廓光',
  '运动相机 · 展台聚光': '哑光塑料 · 粗糙水泥 · 环形光倒影',
  '粉底液 · 亚克力方瓶': '亚克力折射 · 内部透光 · 同色系分层',
  '游戏手柄 · 悬浮展示': '曲面高光 · 按键细节 · 悬浮接地影',
  '头戴耳机 · 皮革质感': '皮革纹理 · 柔光渐变 · 反射卡补光',
};

const slugFromEn = (en, i) => {
  const base = (en || '').split('—')[0].trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return base ? `jy-${base}` : `jy-${i + 1}`;
};

const works = list.map((w, i) => {
  const srcImg = w.img.replace('/previews/assets/jy/', `${SRC}/`);
  const file = srcImg.split('/').pop();
  if (!existsSync(srcImg)) throw new Error('缺图：' + srcImg);
  copyFileSync(srcImg, `${DST}/${file}`);

  const media = [];
  if (w.video) {
    const vf = w.video.replace('/previews/assets/jy/', `${SRC}/`).split('/').pop();
    copyFileSync(`${SRC}/${vf}`, `${DST}/${vf}`);
    // 体积写在卡片上，客户知道要点开多大一份东西（俊勇原站的做法）
    media.push({ type: 'video', src: `/works/${vf}`, poster: `/works/${file}`, size: w.size || humanSize(`${DST}/${vf}`) });
  }
  media.push({ type: 'image', src: `/works/${file}` });

  return {
    id: 100 + i,
    title: w.title,
    category: w.cat,
    image: `/works/${file}`,
    ar: w.ar,
    desc: DESC[w.title] || w.desc.slice(0, 40),
    slug: slugFromEn(w.en, i),
    detail: {
      title: w.title,
      category: 'Cinema 4D + Octane Render',
      description: w.desc,
      tags: w.tags,
      images: [`/works/${file}`],
      media,
    },
  };
});

function humanSize(path) {
  const mb = statSync(path).size / 1048576;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(mb * 1024)} KB`;
}

writeFileSync(`${ROOT}/public/works-yong.json`, JSON.stringify(works, null, 2));
console.log('写出', works.length, '件；含视频', works.filter((w) => w.detail.media.some((m) => m.type === 'video')).length, '件');
console.log('总大小 ~', Math.round(works.reduce((s, w) => s + statSync(`${DST}/${w.image.split('/').pop()}`).size, 0) / 1024), 'KB（图）');
