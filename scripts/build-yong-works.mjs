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
    media.push({ type: 'video', src: `/works/${vf}`, poster: `/works/${file}` });
  }
  media.push({ type: 'image', src: `/works/${file}` });

  return {
    id: 100 + i,
    title: w.title,
    category: w.cat,
    image: `/works/${file}`,
    ar: w.ar,
    desc: w.desc.slice(0, 40) + (w.desc.length > 40 ? '…' : ''),
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

writeFileSync(`${ROOT}/public/works-yong.json`, JSON.stringify(works, null, 2));
console.log('写出', works.length, '件；含视频', works.filter((w) => w.detail.media.some((m) => m.type === 'video')).length, '件');
console.log('总大小 ~', Math.round(works.reduce((s, w) => s + statSync(`${DST}/${w.image.split('/').pop()}`).size, 0) / 1024), 'KB（图）');
