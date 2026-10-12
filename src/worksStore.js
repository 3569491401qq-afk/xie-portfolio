/**
 * 作品数据的读写层。
 *
 * 数据分三层，优先级从高到低：
 *
 *   1. 本地草稿（IndexedDB / localStorage）—— 作者在后台改的东西。
 *      只存在作者自己这台电脑的浏览器里，访客完全接触不到。
 *   2. 线上数据（public/works.json）—— 点「发布到线上」后提交进仓库的文件。
 *      访客看到的就是这一份；Vercel 重新构建后全网生效。
 *   3. 代码兜底（App.jsx 里的 ALL_WORKS）—— works.json 还没生成时的种子数据，
 *      也是离线单文件预览（file://）时的数据来源。
 *
 * 用 IndexedDB 而不是 localStorage 存草稿：localStorage 只有 ~5MB，
 * 一张渲染图转成 base64 就 2~3MB，两张就爆了。
 */

const DB_NAME = "xie-portfolio";
const DB_VERSION = 1;
const STORE_NAME = "kv";
const LS_GH_CONFIG = "xie-portfolio:gh-config";

/* ---------- 两位作者，各一份数据 ----------
   草稿、线上文件、发布目标全部按人分开；切人时把内存缓存清掉重新读。
   谢曙浩沿用老的存储键名，他这台电脑上已有的草稿不会丢。 */
const PERSONS = {
  hao: {
    draftKey: "works-draft",
    lsDraft: "xie-portfolio:works-draft",
    lsHash: "xie-portfolio:published-hash",
    url: "/works.json",
    repoFile: "public/works.json",
  },
  yong: {
    draftKey: "works-draft-yong",
    lsDraft: "xie-portfolio:works-draft-yong",
    lsHash: "xie-portfolio:published-hash-yong",
    url: "/works-yong.json",
    repoFile: "public/works-yong.json",
  },
};

let activePerson = "hao";

/** 切到哪位作者。换人后必须重新 loadWorks。 */
export function setActivePerson(key) {
  const next = PERSONS[key] ? key : "hao";
  if (next === activePerson) return activePerson;
  activePerson = next;
  draftCache = null;
  publishedCache = null;
  return activePerson;
}

export function getActivePerson() {
  return activePerson;
}

const PC = () => PERSONS[activePerson];

/** 内存缓存 */
let draftCache = null;
let publishedCache = null;

/** 订阅者：任何一处保存后通知所有组件重渲染 */
const listeners = new Set();

/**
 * IndexedDB 一旦超时/报错就永久标记为不可用，后续直接走 localStorage。
 * 原因：某些环境（无头浏览器、隐私模式、配置被锁的浏览器）里
 * indexedDB.open() 既不触发 onsuccess 也不触发 onerror，会永久挂起。
 * 不设超时的话整个页面会卡在「正在载入」。
 */
let idbBroken = false;
const IDB_TIMEOUT = 1500;

const clone = (v) => JSON.parse(JSON.stringify(v));

function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label}超时（${ms}ms）`)), ms);
    }),
  ]);
}

/* ---------- IndexedDB 基本操作 ---------- */

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("当前环境不支持 IndexedDB"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IndexedDB 打开失败"));
  });
}

async function idbRead() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(PC().draftKey);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbWrite(value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, PC().draftKey);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

/* ---------- localStorage 兜底 ---------- */

function lsGet(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn("localStorage 写入失败：", e);
    return false;
  }
}

/* ---------- 轻量哈希（只用来判断「有没有改过」） ---------- */

function hashStr(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16);
}

/* ---------- 读取 ---------- */

/** 线上数据：优先用构建时注入的全局变量（离线单文件预览），否则 fetch */
async function fetchPublished() {
  // 注入的全局变量只有谢曙浩那一份，另一位的必须走 fetch
  if (activePerson === "hao" && typeof window !== "undefined" && Array.isArray(window.__WORKS_JSON__)) {
    return clone(window.__WORKS_JSON__);
  }
  try {
    const res = await fetch(PC().url, { cache: "no-cache" });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) && data.length ? data : null;
  } catch {
    return null;
  }
}

/**
 * 读取作品列表（作者视角：草稿优先）。
 * @param {Array} fallback 代码里的兜底数据（App.jsx 的 ALL_WORKS）
 */
export async function loadWorks(fallback) {
  if (draftCache) return draftCache;

  publishedCache = await fetchPublished();

  let draft = null;
  if (!idbBroken) {
    try {
      draft = await withTimeout(idbRead(), IDB_TIMEOUT, "IndexedDB 读取");
    } catch (e) {
      idbBroken = true;
      console.warn("IndexedDB 不可用，改用 localStorage：", e.message);
    }
  }
  if (!Array.isArray(draft) || draft.length === 0) {
    const local = lsGet(PC().lsDraft);
    if (Array.isArray(local) && local.length) draft = local;
  }

  draftCache = draft || publishedCache || clone(fallback);
  return draftCache;
}

/** 同步拿缓存（首屏渲染用） */
export function getCachedWorks() {
  return draftCache;
}

/** 线上那一份（用来做「有没有未发布改动」的对比） */
export function getPublishedWorks() {
  return publishedCache;
}

/* ---------- 保存草稿 ---------- */

export async function saveWorks(works) {
  const next = clone(works);
  draftCache = next;
  listeners.forEach((fn) => fn(next));

  if (!idbBroken) {
    try {
      await withTimeout(idbWrite(next), IDB_TIMEOUT, "IndexedDB 写入");
      return { ok: true, backend: "indexeddb" };
    } catch (e) {
      idbBroken = true;
      console.warn("IndexedDB 写入失败，改用 localStorage：", e.message);
    }
  }

  const ok = lsSet(PC().lsDraft, next);
  return ok
    ? { ok: true, backend: "localstorage" }
    : { ok: false, backend: "none", error: new Error("本地存储写入被拒绝（多半是配额满了）") };
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getBackend() {
  return idbBroken ? "localstorage" : "indexeddb";
}

/** 丢掉本地草稿，回到线上那一份 */
export async function discardDraft(fallback) {
  const target = publishedCache || clone(fallback);
  return saveWorks(target);
}

/** 从线上重新拉一份，覆盖本地草稿 */
export async function pullFromRemote(fallback) {
  publishedCache = await fetchPublished();
  const target = publishedCache || clone(fallback);
  await saveWorks(target);
  setPublishedHash(hashStr(JSON.stringify(target)));
  return target;
}

/* ---------- 「未发布改动」判断 ---------- */

export function getPublishedHash() {
  return lsGet(PC().lsHash) || null;
}

function setPublishedHash(h) {
  lsSet(PC().lsHash, h);
}

/** 当前草稿是否和已发布的版本不一致 */
export function hasUnpublishedChanges() {
  const current = draftCache;
  if (!current) return false;
  const stored = getPublishedHash();
  if (!stored) {
    // 从来没发布过：和线上数据比
    const published = publishedCache;
    if (!published) return true;
    return hashStr(JSON.stringify(current)) !== hashStr(JSON.stringify(published));
  }
  return hashStr(JSON.stringify(current)) !== stored;
}

/* ---------- 发布到 GitHub ---------- */

export function getGhConfig() {
  return (
    lsGet(LS_GH_CONFIG) || {
      owner: "3569491401qq-afk",
      repo: "xie-portfolio",
      branch: "main",
      token: "",
    }
  );
}

export function saveGhConfig(cfg) {
  return lsSet(LS_GH_CONFIG, cfg);
}

export function clearGhConfig() {
  try {
    localStorage.removeItem(LS_GH_CONFIG);
    return true;
  } catch {
    return false;
  }
}

/** UTF-8 安全的 base64（btoa 遇到中文会炸） */
function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function safeName(slug, id, index) {
  const base = /^[A-Za-z0-9._-]+$/.test(slug || "") ? slug : `work-${id}`;
  return `${base}-${String(index + 1).padStart(2, "0")}.jpg`;
}

/**
 * 把作品数据发布到 GitHub 仓库。
 * 上传的图片会被写成 public/works/ 下的真实文件，数据里的 base64 换成路径，
 * 最后把作品数据写进 public/works.json。Vercel 检测到 push 会自动重新构建。
 *
 * @param {Array} works
 * @param {object} cfg { owner, repo, branch, token }
 * @param {(msg:string)=>void} onProgress
 */
export async function publishWorks(works, cfg, onProgress = () => {}) {
  const { owner, repo, branch = "main", token } = cfg;
  if (!token) throw new Error("还没填 GitHub Token");

  const root = `https://api.github.com/repos/${owner}/${repo}/contents`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  /** 把 GitHub 的原始报错翻译成「人话 + 下一步怎么办」 */
  function explain(status, rawText) {
    const trimmed = (rawText || "").replace(/\s+/g, " ").slice(0, 150);
    if (status === 401) {
      return "Token 无效或已过期。请到 GitHub 重新生成一个，再到「仓库」里粘一次。";
    }
    if (status === 403 && /not accessible by personal access token/i.test(rawText || "")) {
      return [
        "这个 Token 只能读、不能写。",
        "去 GitHub 打开这个 Token：Repository access 要选 Only select repositories 并勾上 " + repo + "；",
        "Permissions → Contents 改成 Read and write。改权限不用重新生成 Token，改完直接再发布一次。",
      ].join("");
    }
    if (status === 403) {
      return "权限不足。检查 Token 的 Contents 权限是不是 Read and write（原始信息：" + trimmed + "）";
    }
    if (status === 404) {
      return `找不到仓库或分支。检查「仓库」设置里的用户名/仓库名/分支对不对（当前：${owner}/${repo} @ ${branch}）。`;
    }
    if (status === 409) {
      return "文件冲突，通常是分支上有新提交。回作品管理点一次「拉取线上」再发布。";
    }
    return `GitHub 返回 ${status}：${trimmed}`;
  }

  async function getSha(path) {
    const res = await fetch(`${root}/${encodeURIComponent(path)}?ref=${branch}`, { headers });
    if (res.status === 404) return undefined;
    if (!res.ok) throw new Error(explain(res.status, await res.text()));
    const json = await res.json();
    return json.sha;
  }

  async function putFile(path, contentB64, message) {
    const sha = await getSha(path);
    const res = await fetch(`${root}/${encodeURIComponent(path)}`, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        content: contentB64,
        branch,
        ...(sha ? { sha } : {}),
      }),
    });
    if (!res.ok) {
      throw new Error(`写入 ${path} 失败 —— ${explain(res.status, await res.text())}`);
    }
    return res.json();
  }

  // 1. 抽出所有 base64 资源（图片 + 视频 + 视频封面），替换成路径
  const next = clone(works);
  const jobs = [];
  for (const w of next) {
    const detail = w.detail || {};

    // 1a. 图片列表
    const imgs = detail.images || [];
    for (let i = 0; i < imgs.length; i++) {
      if (!isDataUrl(imgs[i])) continue;
      const name = safeName(w.slug, w.id, i);
      jobs.push({ path: `public/works/${name}`, dataUrl: imgs[i], name });
      imgs[i] = `/works/${name}`;
    }

    // 1b. media 里的视频与外链
    if (Array.isArray(detail.media) && detail.media.length) {
      for (let i = 0; i < detail.media.length; i++) {
        const m = detail.media[i];
        if (!m || !m.src) continue;
        if (m.type === "image") {
          if (isDataUrl(m.src)) {
            const ext = extFromDataUrl(m.src);
            const name = `${safeName(w.slug, w.id, i).replace(/\.jpg$/, "")}-img.${ext}`;
            jobs.push({ path: `public/works/${name}`, dataUrl: m.src, name });
            m.src = `/works/${name}`;
          }
        } else if (m.type === "video") {
          if (isDataUrl(m.src)) {
            const ext = extFromDataUrl(m.src);
            const name = `${safeName(w.slug, w.id, i).replace(/\.jpg$/, "")}-v.${ext}`;
            jobs.push({ path: `public/works/${name}`, dataUrl: m.src, name });
            m.src = `/works/${name}`;
          }
          if (isDataUrl(m.poster)) {
            const name = `${safeName(w.slug, w.id, i).replace(/\.jpg$/, "")}-poster.jpg`;
            jobs.push({ path: `public/works/${name}`, dataUrl: m.poster, name });
            m.poster = `/works/${name}`;
          }
        } else if (m.type === "embed") {
          m.src = toEmbedUrl(m.src);
        }
      }
    }

    // 封面：优先第一个视频的封面，否则第一张图
    const first = (detail.media || []).find((m) => m && m.src);
    if (first && first.type === "video" && first.poster) {
      w.image = first.poster;
    } else {
      w.image = imgs[0] || (first && first.type === "image" ? first.src : "") || "";
    }
  }

  // 2. 逐张上传图片
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    onProgress(`上传图片 ${i + 1}/${jobs.length}：${job.name}`);
    const b64 = job.dataUrl.split(",")[1];
    if (!b64) continue;
    await putFile(job.path, b64, `上传作品图 ${job.name}`);
  }

  // 3. 写数据文件
  onProgress(`写入 ${PC().repoFile}…`);
  await putFile(PC().repoFile, toBase64(JSON.stringify(next, null, 2)), "更新作品数据");

  // 4. 本地草稿同步成刚发布的版本（图片路径已换成线上路径，本地占用也小了）
  await saveWorks(next);
  publishedCache = next;
  setPublishedHash(hashStr(JSON.stringify(next)));

  return { ok: true, images: jobs.length, works: next.length };
}

/* ---------- 媒体（图片 / 视频 / 外链） ---------- */

/**
 * 媒体项统一成 { type, src, poster? }
 *   image —— 站内图片
 *   video —— 站内视频（发布时上传到 public/works/）
 *   embed —— 外链播放器（B 站等）
 *
 * 兼容策略：老数据只有 detail.images。当作品里出现视频/外链时，才写入
 * detail.media（完整有序列表）；没有 media 的就地按 images 推导。
 * 这样旧数据、旧代码、主站都不受影响。
 */
export function mediaOf(work) {
  const detail = work?.detail || {};
  if (Array.isArray(detail.media) && detail.media.length) {
    return detail.media.filter((m) => m && m.src);
  }
  return (detail.images || []).filter(Boolean).map((src) => ({ type: "image", src }));
}

/** data URL 的 mime 推扩展名 */
export function extFromDataUrl(dataUrl) {
  const m = /^data:([^;,]+)/.exec(dataUrl || "");
  const mime = m ? m[1] : "";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("quicktime") || mime.includes("mov")) return "mov";
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("video")) return "mp4";
  return "jpg";
}

/** 卡片封面：优先 work.image，其次第一个媒体（视频用它的封面） */
export function coverOf(work) {
  if (work?.image) return work.image;
  const first = mediaOf(work)[0];
  if (!first) return "";
  if (first.type === "video") return first.poster || "";
  if (first.type === "embed") return "";
  return first.src;
}

export function isDataUrl(s) {
  return typeof s === "string" && s.startsWith("data:");
}

export function isVideoFile(file) {
  return Boolean(file && /^video\//.test(file.type));
}

/** 读成 data URL（视频也走这条路：Blob 不是 JSON 可序列化的，存不进草稿） */
export function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error || new Error("文件读取失败"));
    r.readAsDataURL(file);
  });
}

/**
 * 从视频里抽一帧当封面。没有封面的话，卡片和列表上会是黑块。
 * @returns {Promise<string|null>} 封面 data URL
 */
export function makeVideoPoster(file, maxEdge = 1280) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    let done = false;

    const finish = (val) => {
      if (done) return;
      done = true;
      URL.revokeObjectURL(url);
      resolve(val);
    };

    const draw = () => {
      try {
        const w0 = v.videoWidth || 0;
        const h0 = v.videoHeight || 0;
        if (!w0 || !h0) return null;
        const scale = Math.min(1, maxEdge / Math.max(w0, h0));
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(w0 * scale));
        c.height = Math.max(1, Math.round(h0 * scale));
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#0a0a0f";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(v, 0, 0, c.width, c.height);
        return c.toDataURL("image/jpeg", 0.82);
      } catch {
        return null;
      }
    };

    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";

    v.onloadeddata = () => {
      // 目标是第 1 秒（避开淡入黑帧），但**不能只靠 seeked** ——
      // 有些环境里 seek 不会触发事件，必须有个兜底。
      try {
        v.currentTime = Math.min(1, (v.duration || 1) * 0.1);
      } catch {
        /* 忽略，走下面的兜底 */
      }
      setTimeout(() => finish(draw()), 900);
    };
    // 跳转成功就立刻用这一帧（比首帧更有代表性）
    v.onseeked = () => finish(draw());
    v.onerror = () => finish(null);
    // 彻底兜底：无论如何别让调用方一直等
    setTimeout(() => finish(null), 5000);

    v.src = url;
  });
}

/** 外链转播放器地址：B 站分享链接 → player.bilibili.com */
export function toEmbedUrl(url) {
  const raw = (url || "").trim();
  if (!raw) return "";
  const bv = /(BV[0-9A-Za-z]+)/.exec(raw);
  if (bv) {
    return `https://player.bilibili.com/player.html?bvid=${bv[1]}&autoplay=0&high_quality=1`;
  }
  const yt = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{6,})/.exec(raw);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  return raw;
}

/* ---------- 图片压缩 ---------- */

/**
 * 把用户选的图片压到合适尺寸再存。
 * 不压的话，一张 4K PNG 转 base64 就接近 10MB，很快把配额撑爆。
 * @returns {Promise<string>} data URL
 */
export function compressImageFile(file, maxEdge = 1800, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        // 深色打底，避免 PNG 透明区域在转 JPEG 后变成死黑或白边
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片解码失败"));
    };
    img.src = url;
  });
}
