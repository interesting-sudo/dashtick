import Markdown from "react-markdown";
import { type Task, type Idea } from "../store/useStore";

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

// 将内容拆分为文本段和图片段
function parseContent(content: string): Array<{ type: "text"; value: string } | { type: "image"; src: string; alt: string }> {
  // 匹配 ![alt](src) 格式，src 可以是 data: URL 或普通路径
  const regex = /!\[([^\]]*)\]\((data:image\/[^)]+|[^)]+)\)/g;
  const parts: Array<{ type: "text"; value: string } | { type: "image"; src: string; alt: string }> = [];
  let lastIndex = 0;

  for (const match of content.matchAll(regex)) {
    const matchStart = match.index!;
    // 添加图片前的文本
    if (matchStart > lastIndex) {
      parts.push({ type: "text", value: content.slice(lastIndex, matchStart) });
    }
    // 添加图片
    parts.push({ type: "image", alt: match[1], src: match[2] });
    lastIndex = matchStart + match[0].length;
  }

  // 添加最后一段文本
  if (lastIndex < content.length) {
    parts.push({ type: "text", value: content.slice(lastIndex) });
  }

  return parts;
}

export default function DetailPanel({ item, type, onClose }: DetailPanelProps) {
  const parts = parseContent(item.content);

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
        {parts.map((part, i) => {
          if (part.type === "image") {
            return (
              <img
                key={i}
                src={part.src}
                alt={part.alt || "图片"}
                style={{ maxWidth: "100%", borderRadius: 8, margin: "12px 0" }}
              />
            );
          }
          // 文本段用 markdown 渲染
          return (
            <Markdown
              key={i}
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
              }}
            >
              {part.value}
            </Markdown>
          );
        })}
      </div>

      <div className="detail-panel-footer">
        <span>创建于 {formatTime(item.created_at)}</span>
        {"due_date" in item && item.due_date && (
          <span> · 截止 {formatTime(item.due_date)}</span>
        )}
      </div>
    </div>
  );
}
