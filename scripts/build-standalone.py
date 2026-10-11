"""把 vite 的 dist/ 打包成一个完全自包含的单文件 HTML。

用途：某些预览面板直接打开 http://127.0.0.1 会白屏（Vite 开发版的 HMR 脚本
在沙箱 iframe 里会被拦掉）。这个脚本把 JS / CSS / 所有作品图全部内联进一个
.html 文件，双击就能在任何浏览器里看，不依赖任何服务器。

用法：python scripts/build-standalone.py [输出路径]
默认产出：<workspace>/preview/xie-portfolio-preview.html
"""
import base64
import mimetypes
import os
import re
import subprocess
import sys

# 单文件版必须先把站点打包成「自包含 IIFE 单文件」（见 vite.standalone.config.js），
# 否则产物里会有 `import ... from './worksStore.js'` 这种静态引用，沙箱里直接黑屏。
DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dist-standalone")
DIST = os.path.normpath(DIST)

PREVIEW_DIR = os.path.normpath(
    os.path.join(
        os.path.dirname(DIST),            # xie-portfolio
        "..",                             # C:/Users/Administrator
        "WorkBuddy",
        "2026-10-11-13-09-08",
        "preview",
    )
)

# 用法：python scripts/build-standalone.py [dist里的入口html] [输出路径]
#   · 不传参 → 打包正式站 dist/index.html
#   · 传 preview.html → 打包工作室版预览（人工对比用）
ENTRY = os.path.normpath(
    os.path.join(DIST, sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1]
    else os.path.join(DIST, "index.html")
)
if len(sys.argv) > 2 and sys.argv[2]:
    OUT = os.path.normpath(sys.argv[2])
elif os.path.basename(ENTRY) == "preview.html":
    OUT = os.path.join(PREVIEW_DIR, "studio-preview-standalone.html")
else:
    OUT = os.path.join(PREVIEW_DIR, "xie-portfolio-standalone.html")


def data_uri(path):
    """读文件转成 data: URI；找不到就原样返回占位，避免脚本中断。"""
    if not os.path.exists(path):
        print(f"  ! 缺文件: {path}")
        return ""
    mime = mimetypes.guess_type(path)[0] or "application/octet-stream"
    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("ascii")
    return f"data:{mime};base64,{b64}"


# 多入口构建时，每个页面的 JS 会相对引用共享 chunk（React 等）。
# 单文件离线打开时这个相对路径解析不了，模块直接不执行 → 页面空白。
# 这里把相对引用换成一个 data: URL 模块，就能把依赖也塞进同一个文件里。
_REL_IMPORT = re.compile(r"""(\bfrom\s*|import\s*\(\s*)(["'])(\./[^"']+)\2""")


def inline_relative_chunks(js, base_dir, depth=0):
    if depth > 5:
        return js

    def sub(m):
        rel = m.group(3)
        path = os.path.join(base_dir, rel[2:] if rel.startswith("./") else rel)
        if not os.path.exists(path):
            return m.group(0)
        code = open(path, encoding="utf-8").read()
        code = inline_relative_chunks(code, base_dir, depth + 1)
        b64 = base64.b64encode(code.encode("utf-8")).decode("ascii")
        return m.group(1) + '"data:text/javascript;base64,' + b64 + '"'

    return _REL_IMPORT.sub(sub, js)


def main():
    # 1) 先用 IIFE 单文件配置构建，产出完全自包含的 dist（无 import 引用）
    root = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
    node = os.environ.get("NODE") or "node"
    cfg = os.path.join(root, "vite.standalone.config.js")
    print(f"构建单文件版（IIFE）：vite build --config vite.standalone.config.js")
    try:
        subprocess.run(
            [node, os.path.join(root, "node_modules", "vite", "bin", "vite.js"),
             "build", "--config", cfg, "--logLevel", "warn"],
            cwd=root, check=True,
        )
    except subprocess.CalledProcessError as e:
        raise SystemExit(f"vite 构建失败（退出码 {e.returncode}）")

    index_path = ENTRY
    if not os.path.exists(index_path):
        raise SystemExit(f"找不到 {index_path}，先跑 vite build")
    html = open(index_path, encoding="utf-8").read()

    # --- 1. 内联 CSS ---
    n_css = 0
    for tag in re.findall(r"<link[^>]+rel=\"stylesheet\"[^>]*>", html):
        href = re.search(r'href="([^"]+)"', tag)
        if not href:
            continue
        path = os.path.join(DIST, href.group(1).lstrip("/"))
        if os.path.exists(path):
            css = open(path, encoding="utf-8").read()
            html = html.replace(tag, f"<style>\n{css}\n</style>")
            n_css += 1

    # --- 2. 内联 JS，并把 bundle 里的 /works/xxx.jpg 换成 data URI ---
    n_js = 0
    n_img = 0
    for tag in re.findall(r"<script[^>]+src=\"[^\"]+\"[^>]*></script>", html):
        src = re.search(r'src="([^"]+)"', tag)
        if not src:
            continue
        path = os.path.join(DIST, src.group(1).lstrip("/"))
        if not os.path.exists(path):
            continue
        js = open(path, encoding="utf-8").read()

        def repl(m):
            nonlocal n_img
            uri = data_uri(os.path.join(DIST, m.group(2).lstrip("/")))
            if not uri:
                return m.group(0)
            n_img += 1
            return m.group(1) + uri + m.group(1)

        # 路径在压缩后的代码里可能是双引号、单引号或模板字符串（反引号）
        js = re.sub(r"([\"'`])(/works/[A-Za-z0-9._\-]+\.(?:jpg|jpeg|png|webp))\1", repl, js)
        # 关键：先把相对引用的兄弟 chunk 内联掉，否则 file:// 下模块加载失败。
        # 基准目录必须是被引用文件自己所在的目录（通常是 dist/assets/），不是 dist/。
        js = inline_relative_chunks(js, os.path.dirname(path))
        # ⚠️ 关键：必须输出成「普通脚本」而不是 `type="module"`。
        # 预览面板的 iframe 是 sandbox 的（origin 为 opaque），浏览器会直接
        # 拦掉模块脚本 → #root 永远是空的 → 看起来就是黑屏。
        # 这个包本身没有任何 ESM 专有语法（无顶层 import/export、无 import.meta），
        # 所以降级成经典脚本后功能完全一样，但在任何环境里都能跑。
        # 但经典脚本不会延迟执行：如果它写在 <head> 或 #root 之前，
        # createRoot(document.getElementById("root")) 会拿到 null →
        # React 报 #299「Target container is not a DOM element」。
        # 所以这里把 bundle 从原位置删除，统一挪到 </body> 之前，确保 DOM 已解析完。
        new_tag = f'<script>\n{js}\n</script>'
        html = html.replace(tag, "")          # 删掉原处的 <script src=...>
        html = html.replace("</body>", new_tag + "\n</body>", 1)  # 追加到 body 末尾
        n_js += 1

    # --- 3. 注入线上数据（离线单文件没有 fetch 的能力，直接塞成全局变量）---
    #    注意：里面的 /works/*.jpg 也必须一起换成 data URI，
    #    否则作品集网格在 file:// 下全是碎图。
    works_json = os.path.join(DIST, "works.json")
    if os.path.exists(works_json):
        data = open(works_json, encoding="utf-8").read()
        n_json_img = 0

        def repl_json(m):
            nonlocal n_json_img
            uri = data_uri(os.path.join(DIST, m.group(2).lstrip("/")))
            if not uri:
                return m.group(0)
            n_json_img += 1
            return m.group(1) + uri + m.group(1)

        data = re.sub(r"([\"'])(/works/[A-Za-z0-9._\-]+\.(?:jpg|jpeg|png|webp))\1", repl_json, data)
        html = html.replace(
            "</head>",
            f"<script>window.__WORKS_JSON__ = {data};</script>\n</head>",
            1,
        )
        print(f"注入 works.json: 另内联作品图 {n_json_img} 张")

    # --- 4. favicon 内联 ---
    for tag in re.findall(r"<link[^>]+rel=\"icon\"[^>]*>", html):
        href = re.search(r'href="([^"]+)"', tag)
        if not href:
            continue
        uri = data_uri(os.path.join(DIST, href.group(1).lstrip("/")))
        if uri:
            html = html.replace(tag, tag.replace(href.group(1), uri))
            break

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"内联 CSS {n_css} 个 / JS {n_js} 个 / 图片 {n_img} 张")
    print(f"入口: {os.path.basename(ENTRY)}")
    print(f"产出: {OUT}")
    print(f"体积: {os.path.getsize(OUT) / 1e6:.1f} MB（单文件，双击即可打开）")


if __name__ == "__main__":
    main()
