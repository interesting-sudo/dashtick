import { useState } from "react";
import { useStore, type Idea } from "../store/useStore";
import PreviewBubble from "./PreviewBubble";

function formatCreatedTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");

  if (date.toDateString() === now.toDateString()) {
    return `今天 ${h}:${m}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `昨天 ${h}:${m}`;
  }

  return `${date.getMonth() + 1}/${date.getDate()} ${h}:${m}`;
}

export default function IdeaList() {
  const { ideas, deleteIdea } = useStore();
  const [hoveredIdea, setHoveredIdea] = useState<Idea | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (idea: Idea, e: React.MouseEvent) => {
    setHoveredIdea(idea);
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredIdea(null);
  };

  const sortedIdeas = [...ideas].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  if (sortedIdeas.length === 0) {
    return (
      <div className="list-empty">
        <span className="list-empty-icon">💡</span>
        <span className="list-empty-text">还没有灵感记录</span>
        <span className="list-empty-sub">输入内容自动创建灵感</span>
      </div>
    );
  }

  return (
    <>
      <div>
        {sortedIdeas.map((idea) => (
          <div
            key={idea.id}
            onMouseEnter={(e) => handleMouseEnter(idea, e)}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="idea-item"
          >
            <span className="idea-icon">💡</span>
            <div className="idea-body">
              <div className="idea-content">{idea.content}</div>
              <div className="idea-meta">
                <span className="idea-created">{formatCreatedTime(idea.created_at)}</span>
              </div>
            </div>
            <button
              onClick={() => deleteIdea(idea.id)}
              onMouseDown={(e) => e.stopPropagation()}
              className="idea-delete"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      {hoveredIdea && <PreviewBubble content={hoveredIdea.content} position={mousePos} />}
    </>
  );
}
