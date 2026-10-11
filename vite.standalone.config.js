import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { resolve } from 'node:path'

// 专供「单文件离线预览」用的构建配置。
//
// 普通 vite build 会把代码拆成多个 ES module chunk（如 worksStore 被单独拆出去），
// 互相用 `import ... from "./xxx.js"` 引用。这种静态 import 在沙箱 iframe（opaque origin）
// 里会被浏览器拦掉，导致整页黑屏；就算降级成普通 <script>，静态 import 也是语法错误。
//
// 这里用 IIFE 单文件格式 + 强制内联所有 chunk，让产物是一个完全自包含的 .js，
// 没有任何 import/export —— 双击、离线、沙箱面板里都能跑。
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-standalone',
    cssCodeSplit: false,
    // 图片我们自己在 build-standalone.py 里 inline 成 data URI，这里别让 vite 提前转成 base64
    assetsInlineLimit: 0,
    rollupOptions: {
      // 单文件版直接打包正式站入口（工作室版视觉已经合进主站 index.html 了）
      input: resolve(import.meta.dirname, 'index.html'),
      output: {
        format: 'iife',
        // 关键：把所有 chunk（含 worksStore）合并进一个文件，消除 import
        inlineDynamicImports: true,
        entryFileNames: 'assets/standalone.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
})
