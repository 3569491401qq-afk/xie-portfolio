"""把 assets-src/images-source 下的原始渲染图压缩为 Web 尺寸，输出到 public/works/。

- 最长边限制 1800px（只缩不放）
- JPEG quality 82 / progressive / optimize，剥离元数据
- 文件名语义化（英文 slug），避免中文路径在 URL 里的编码问题
- 最后生成 1200x630 的分享卡片图 public/og-cover.jpg

原始大图与 .blend 工程文件都放在 assets-src/（已 gitignore），不会进打包产物。
换图流程：把新图丢进 assets-src/images-source/ → 在 IMAGE_MAP 里加一行 → 重跑本脚本。
"""
import os
from PIL import Image

SRC = os.path.join("assets-src", "images-source")
DST = os.path.join("public", "works")

MAX_EDGE = 1800
QUALITY = 82

# 源文件名 -> 输出文件名
# 注意：已核对 md5，4.png 与「游戏手柄_01_后期.png」完全重复，132.png 与 2.png 完全重复，
#      各只保留一份。Enhance_*.png 带 AI 生成水印、贴纸.gif 是平面标签设计，均不收录。
IMAGE_MAP = [
    # --- 美妆个护 ---
    ("香奈儿香水.jpg",           "perfume-coco.jpg"),        # COCO 香水 · 岩石静物
    ("coco-studio-gray.png",    "coco-studio-gray.jpg"),   # COCO · 渐变灰底主图
    ("coco-studio-white.png",   "coco-studio-white.jpg"),  # COCO · 白底主图
    ("coco-studio-glass.png",   "coco-studio-glass.jpg"),  # COCO · 玻璃质感特写
    ("coco-studio-label.png",   "coco-studio-label.jpg"),  # COCO · 标签特写
    ("1.png",                   "serum-dropper.jpg"),      # 精华液滴管瓶（SWY）
    ("精油最终版.png",            "essential-oil.jpg"),       # 精油瓶 · 木桩场景
    ("blue-perfume-01.png",     "blue-perfume-01.jpg"),    # 蓝色香氛瓶 · 水波光影
    ("blue-perfume-02.png",     "blue-perfume-02.jpg"),
    ("blue-perfume-03.png",     "blue-perfume-03.jpg"),
    # PARFUM 商用交付套图（A 组 3:4 竖构图 / B 组方构图）
    ("parfum-a0.png",           "parfum-a0.jpg"),
    ("parfum-a1.png",           "parfum-a1.jpg"),
    ("parfum-a2.png",           "parfum-a2.jpg"),
    ("parfum-a3.png",           "parfum-a3.jpg"),
    ("parfum-a4.png",           "parfum-a4.jpg"),
    ("parfum-b1.png",           "parfum-b1.jpg"),
    ("parfum-b2.png",           "parfum-b2.jpg"),
    ("parfum-b3.png",           "parfum-b3.jpg"),
    ("parfum-b4.png",           "parfum-b4.jpg"),
    # --- 食品饮料 ---
    ("6.png",                   "gummy-candy.jpg"),        # 软糖 · 玻璃罐倾倒
    ("5.png",                   "shell-study.jpg"),        # 扇贝 · 材质研究
    # --- 3C数码 ---
    ("4.png",                   "gamepad-retro.jpg"),      # 复古游戏手柄 · 蓝幕
    ("goggles-hero.png",        "goggles-hero.jpg"),       # 滑雪镜 · 白底主图
    ("goggles-front.png",       "goggles-front.jpg"),      # 滑雪镜 · 正面
    ("goggles-vs-real.png",     "goggles-vs-real.jpg"),    # 滑雪镜 · 渲染与实拍比对
    # --- 硬表面与场景 ---
    ("2.png",                   "prop-weapon.jpg"),        # 枪械道具 · 静物场景
    ("weapon-neutral.png",      "weapon-neutral.jpg"),     # 枪械道具 · 中性底另一种构图
    ("3.png",                   "scene-geometry.jpg"),     # 极简几何场景 · 暖橙
]

# OG 分享卡片：从哪张图裁切 1200x630
OG_SOURCE = "2.png"


def main():
    if not os.path.isdir(SRC):
        raise SystemExit(f"找不到素材目录：{SRC}")

    os.makedirs(DST, exist_ok=True)

    total_before = total_after = 0
    missing = []

    for src_name, out_name in IMAGE_MAP:
        src_path = os.path.join(SRC, src_name)
        if not os.path.exists(src_path):
            missing.append(src_name)
            continue
        out_path = os.path.join(DST, out_name)

        im = Image.open(src_path)
        if im.mode not in ("RGB", "L"):
            im = im.convert("RGB")

        before = os.path.getsize(src_path)
        if max(im.size) > MAX_EDGE:
            im.thumbnail((MAX_EDGE, MAX_EDGE), Image.LANCZOS)

        im.save(out_path, "JPEG", quality=QUALITY, optimize=True, progressive=True)
        after = os.path.getsize(out_path)
        total_before += before
        total_after += after
        print(f"{src_name:26} -> {out_name:26} {im.size[0]}x{im.size[1]:<5} "
              f"{before / 1e6:6.2f}MB -> {after / 1e3:7.1f}KB")

    print(f"\n合计: {total_before / 1e6:.1f}MB -> {total_after / 1e3:.0f}KB "
          f"(压缩到原来的 {total_after / total_before * 100:.1f}%)")
    if missing:
        print("\n⚠️ 以下源文件缺失，已跳过：")
        for m in missing:
            print("   -", m)

    # --- 分享卡片图（OG image）：1200x630 ---
    og_src_path = os.path.join(SRC, OG_SOURCE)
    if os.path.exists(og_src_path):
        og_src = Image.open(og_src_path).convert("RGB")
        w, h = og_src.size
        crop_h = int(w / (1200 / 630))
        top = max(0, (h - crop_h) // 2)
        og = og_src.crop((0, top, w, top + crop_h)).resize((1200, 630), Image.LANCZOS)
        og_path = os.path.join("public", "og-cover.jpg")
        og.save(og_path, "JPEG", quality=84, optimize=True, progressive=True)
        print(f"\nOG 分享图 -> public/og-cover.jpg 1200x630 {os.path.getsize(og_path) / 1e3:.1f}KB")


if __name__ == "__main__":
    main()
