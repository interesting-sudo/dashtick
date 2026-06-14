import Markdown from "react-markdown";
import { type Task, type Idea } from "../store/useStore";
import { convertFileSrc } from "@tauri-apps/api/core";

interface DetailPanelProps {
  item: Task | Idea;
  type: "task" | "idea";
  onClose: () => void;
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:${min}`;
}

export default function DetailPanel({ item, type, onClose }: DetailPanelProps) {
  return (
    <div className="detail-panel">
      <div className="detail-panel-header">
        <span className={`detail-panel-type ${type}`}>
          {type === "task" ? "📋 待办" : "💡 灵感"}
        </span>
        <button className="detail-panel-close" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div className="detail-panel-body">
        <Markdown
          components={{
            h1: ({ children }) => <h1>{children}</h1>,
            h2: ({ children }) => <h2>{children}</h2>,
            h3: ({ children }) => <h3>{children}</h3>,
            p: ({ children }) => <p>{children}</p>,
            ul: ({ children }) => <ul>{children}</ul>,
            ol: ({ children }) => <ol>{children}</ol>,
            li: ({ children }) => <li>{children}</li>,
            code: ({ children }) => <code>{children}</code>,
            pre: ({ children }) => <pre>{children}</pre>,
            blockquote: ({ children }) => <blockquote>{children}</blockquote>,
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
            ),
            strong: ({ children }) => <strong>{children}</strong>,
            em: ({ children }) => <em>{children}</em>,
            hr: () => <hr />,
            img: ({ src, alt }) => {
              // 本地图片路径转换（支持绝对路径和相对路径）
              const imageSrc = src && !src.startsWith("http")
                ? convertFileSrc(src)
                : src;
              return <img src={imageSrc} alt={alt || "图片"} style={{ maxWidth: "100%", borderRadius: 8 }} />;
            },
          }}
        >
          {item.content}
        </Markdown>
      </div>

      <div className="detail-panel-footer">
        <span>创建于 {formatTime(item.created_at)}</span>
        {"due_date" in item && item.due_date && (
          <span> · 截止 {formatTime(item.due_date)}</span>
        )}
        {"tags" in item && item.tags && (
          <span> · 标签 {item.tags}</span>
        )}
      </div>
    </div>
  );
}
