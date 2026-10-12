import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SRC = 'C:/Users/Administrator/Documents/xwechat_files/wxid_s4c0adi70zie22_cd7c/msg/file/2026-10/谢俊勇-3D产品渲染作品集-完整版.html';
const OUT_IMG = 'C:/Users/Administrator/xie-portfolio/public/previews/assets/jy';
mkdirSync(OUT_IMG, { recursive: true });

const html = readFileSync(SRC, 'utf8').replace(/\r\n/g, '\n');
const start = html.indexOf('const WORKS = [');
const arrText = html.slice(start, html.indexOf('\n];', start));

// 逐个作品对象切分
const chunks = arrText.split(/\n  \{\n/).slice(1);
const works = [];
let n = 0;

for (const c of chunks) {
  const str = (key) => {
    const m = c.match(new RegExp(key + ':"((?:[^"\\\\]|\\\\.)*)"'));
    return m ? m[1] : '';
  };
  const bool = (key) => new RegExp('\\b' + key + ':true').test(c);

  const slug = str('t').replace(/[·\\s]+/g, '-').replace(/-+/g, '-').toLowerCase();
  const rec = {
    title: str('t'),
    en: str('en'),
    cat: str('cat'),
    ar: str('ar') || '4/5',
    badge: str('badge'),
    yr: str('yr'),
    size: str('size'),
    desc: str('d'),
    tags: ((c.match(/tags:\[([^\]]*)\]/) || [null, ''])[1].match(/"([^"]+)"/g) || []).map((s) => s.slice(1, -1)),
    wide: bool('wide'),
    tall: bool('tall'),
    badgePlay: bool('badgePlay'),
  };

  const img = c.match(/img:"data:image\/jpeg;base64,([A-Za-z0-9+/=]+)"/);
  if (img) {
    const f = `jy-${++n}.jpg`;
    writeFileSync(`${OUT_IMG}/${f}`, Buffer.from(img[1], 'base64'));
    rec.img = `/previews/assets/jy/${f}`;
  }
  const vid = c.match(/video:"data:video\/mp4;base64,([A-Za-z0-9+/=]+)"/);
  if (vid) {
    const f = `jy-${n}.mp4`;
    writeFileSync(`${OUT_IMG}/${f}`, Buffer.from(vid[1], 'base64'));
    rec.video = `/previews/assets/jy/${f}`;
    const var_ = c.match(/videoAr:"([^"]+)"/);
    rec.videoAr = var_ ? var_[1] : '16/9';
  }
  works.push(rec);
}

writeFileSync('C:/Users/Administrator/xie-portfolio/public/previews/junyong-works.json', JSON.stringify(works, null, 2));
console.log('works:', works.length, 'images:', n);
console.log(works.map((w) => `${w.title} | ${w.cat} | ${w.ar} | ${w.img} | ${w.video || '-'} | ${w.size}`).join('\n'));
