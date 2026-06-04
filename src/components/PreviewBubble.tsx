import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";

interface PreviewBubbleProps {
  content: string;
  position: { x: number; y: number };
}

export default function PreviewBubble({ content, position }: PreviewBubbleProps) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!bubbleRef.current) return;

    const rect = bubbleRef.current.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let x = position.x + 16;
    let y = position.y + 16;

    if (x + rect.width > windowWidth - 16) {
      x = position.x - rect.width - 16;
    }
    if (y + rect.height > windowHeight - 16) {
      y = position.y - rect.height - 16;
    }

    setAdjustedPos({ x, y });
  }, [position]);

  const hasMarkdown = /[#*`_\[\]>-]/.test(content) || content.includes("\n");
  if (!hasMarkdown) return null;

  return (
    <div
      ref={bubbleRef}
      className="preview-bubble"
      style={{ left: adjustedPos.x, top: adjustedPos.y }}
    >
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
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
