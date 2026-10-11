import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// 线上（http/https）走 BrowserRouter，路径干净；
// 但用 file:// 直接打开时（比如 scripts/build-standalone.py 产出的离线单文件预览），
// BrowserRouter 会把文件路径当成路由，结果落到 404 页。
// 所以这里按协议自动切换成 HashRouter。
const isFileProtocol =
  typeof window !== 'undefined' && window.location.protocol === 'file:'
const Router = isFileProtocol ? HashRouter : BrowserRouter

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>,
)
