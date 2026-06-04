import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import InputBar from "./components/InputBar";
import TabSwitch from "./components/TabSwitch";
import TaskList from "./components/TaskList";
import IdeaList from "./components/IdeaList";
import { useStore } from "./store/useStore";

function App() {
  const { activeTab, fetchTasks, fetchIdeas } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchTasks(), fetchIdeas()]).finally(() => setLoading(false));

    const refreshTimer = setInterval(() => {
      fetchTasks();
    }, 30_000);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        invoke("hide_window").catch(console.error);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearInterval(refreshTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [fetchTasks, fetchIdeas]);

  // 标题栏拖拽
  const handleTitleBarMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input")) return;
    getCurrentWindow().startDragging().catch(() => {});
  };

  // "-" 按钮 → 隐藏到托盘
  const handleHideToTray = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    invoke("hide_window").catch(console.error);
  };

  // "X" 按钮 → 最小化
  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    getCurrentWindow().minimize().catch(console.error);
  };

  if (loading) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#a09da8' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⚡</div>
          <div style={{ fontSize: 13 }}>加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* 标题栏 */}
      <div
        className="app-titlebar"
        onMouseDown={handleTitleBarMouseDown}
      >
        <div className="app-titlebar-left">
          <span className="app-logo">⚡</span>
          <span className="app-title">闪小条</span>
        </div>
        <div className="app-titlebar-right">
          {/* "-" 隐藏到托盘 */}
          <button
            className="window-btn minimize"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleHideToTray}
            title="隐藏到托盘"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          {/* "X" 最小化 */}
          <button
            className="window-btn close"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleMinimize}
            title="最小化"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* 快速输入框 */}
      <div className="app-input-area">
        <InputBar />
      </div>

      {/* 标签切换 */}
      <div className="app-tab-area">
        <TabSwitch />
      </div>

      {/* 内容区域 */}
      <div className="app-content">
        {activeTab === "tasks" ? <TaskList /> : <IdeaList />}
      </div>

      {/* 底部提示 */}
      <div className="app-footer">
        <span>Enter 回车</span>
        <span className="dot">·</span>
        <span>Esc 隐藏</span>
        <span className="dot">·</span>
        <span>Alt+Space 唤出</span>
      </div>
    </div>
  );
}

export default App;
