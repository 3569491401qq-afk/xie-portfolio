/**
 * 从 src/App.jsx 里把 ALL_WORKS 抽出来，生成 public/works.json。
 *
 * 这是「线上数据」的初始版本 —— 也就是已经发布、访客能看到的那一份。
 * 平时不用手动跑，作者中心的「发布到线上」会自动更新它。
 * 只有在想把代码里的种子数据重新同步成线上数据时才需要执行。
 *
 * 用法：node scripts/dump-works-seed.mjs
 */
import fs from "node:fs";

const SRC = "src/App.jsx";
const OUT = "public/works.json";

const src = fs.readFileSync(SRC, "utf8");

/* 1. 取出 IMG 图片注册表 */
const imgBlock = src.match(/const IMG = \{[\s\S]*?\n\};/);
if (!imgBlock) throw new Error("找不到 IMG 定义");
const IMG = new Function(`${imgBlock[0]}\nreturn IMG;`)();

/* 2. 按括号配平截取 ALL_WORKS 数组（跳过字符串里的括号） */
const anchor = src.indexOf("const ALL_WORKS = [");
if (anchor < 0) throw new Error("找不到 ALL_WORKS 定义");
const bodyStart = src.indexOf("[", anchor);

let depth = 0;
let end = -1;
let quote = null;
for (let i = bodyStart; i < src.length; i++) {
  const c = src[i];
  if (quote) {
    if (c === "\\") i++;
    else if (c === quote) quote = null;
    continue;
  }
  if (c === '"' || c === "'" || c === "`") {
    quote = c;
    continue;
  }
  if (c === "[") depth++;
  else if (c === "]") {
    depth--;
    if (depth === 0) {
      end = i;
      break;
    }
  }
}
if (end < 0) throw new Error("ALL_WORKS 数组没有正确闭合");

const arrText = src.slice(bodyStart, end + 1);
const ALL_WORKS = new Function("IMG", `return ${arrText};`)(IMG);

/* 3. 健全性检查 */
if (!Array.isArray(ALL_WORKS) || ALL_WORKS.length === 0) {
  throw new Error("解析结果不是数组");
}
for (const w of ALL_WORKS) {
  if (!w.slug || !w.title || !w.detail) {
    throw new Error(`作品条目缺字段：${JSON.stringify(w).slice(0, 80)}`);
  }
  if (!Array.isArray(w.detail.images) || w.detail.images.length === 0) {
    throw new Error(`作品「${w.title}」没有图片`);
  }
}

fs.writeFileSync(OUT, JSON.stringify(ALL_WORKS, null, 2) + "\n", "utf8");
console.log(`已写入 ${OUT}`);
console.log(`作品数：${ALL_WORKS.length}`);
console.log(`图片总数：${ALL_WORKS.reduce((n, w) => n + w.detail.images.length, 0)}`);
console.log(`体积：${(fs.statSync(OUT).size / 1024).toFixed(1)} KB`);
