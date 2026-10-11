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
const DRAFT_KEY = "works-draft";
const LS_DRAFT_KEY = "xie-portfolio:works-draft";
const LS_PUBLISHED_HASH = "xie-portfolio:published-hash";
const LS_GH_CONFIG = "xie-portfolio:gh-config";

/** 线上数据的地址（构建时被拷进 dist 根目录） */
const PUBLISHED_URL = "/works.json";

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
    const req = tx.objectStore(STORE_NAME).get(DRAFT_KEY);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbWrite(value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, DRAFT_KEY);
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
  if (typeof window !== "undefined" && Array.isArray(window.__WORKS_JSON__)) {
    return clone(window.__WORKS_JSON__);
  }
  try {
    const res = await fetch(PUBLISHED_URL, { cache: "no-cache" });
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
    const local = lsGet(LS_DRAFT_KEY);
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

  const ok = lsSet(LS_DRAFT_KEY, next);
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
  return lsGet(LS_PUBLISHED_HASH) || null;
}

function setPublishedHash(h) {
  lsSet(LS_PUBLISHED_HASH, h);
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

  // 1. 抽出所有 base64 图片，替换成路径
  const next = clone(works);
  const jobs = [];
  for (const w of next) {
    const imgs = w.detail?.images || [];
    for (let i = 0; i < imgs.length; i++) {
      if (typeof imgs[i] !== "string" || !imgs[i].startsWith("data:")) continue;
      const name = safeName(w.slug, w.id, i);
      const dataUrl = imgs[i];
      imgs[i] = `/works/${name}`;
      jobs.push({ path: `public/works/${name}`, dataUrl, name });
    }
    // 封面永远跟随第一张
    w.image = imgs[0] || "";
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
  onProgress("写入 works.json…");
  await putFile("public/works.json", toBase64(JSON.stringify(next, null, 2)), "更新作品数据");

  // 4. 本地草稿同步成刚发布的版本（图片路径已换成线上路径，本地占用也小了）
  await saveWorks(next);
  publishedCache = next;
  setPublishedHash(hashStr(JSON.stringify(next)));

  return { ok: true, images: jobs.length, works: next.length };
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
