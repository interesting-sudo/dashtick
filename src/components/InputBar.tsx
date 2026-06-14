import { useState, useRef, useEffect } from "react";
import { useStore } from "../store/useStore";
import { parseTimeFromInput, hasTimeKeyword } from "../lib/timeParser";

export default function InputBar() {
  const { inputText, setInputText, addTask, addIdea, activeTab } = useStore();
  const [isComposing, setIsComposing] = useState(false);
  const [pasting, setPasting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    const text = inputText.trim();
    if (!text) return;

    const hasTime = hasTimeKeyword(text);

    if (hasTime || activeTab === "tasks") {
      let cleanText = text;
      let dueDate: string | undefined;

      const parsed = parseTimeFromInput(text);
      dueDate = parsed.dueDate || undefined;
      cleanText = parsed.cleanText;

      await addTask(cleanText, dueDate);
    } else {
      await addIdea(text);
    }

    setInputText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // 处理粘贴图片
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;

        setPasting(true);
        try {
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          const imgText = `\n![图片](${dataUrl})\n`;
          setInputText(inputText + imgText);
        } catch (err) {
          console.error("粘贴图片失败:", err);
        } finally {
          setPasting(false);
        }
        return;
      }
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <div className="input-wrapper">
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder={pasting ? "⏳ 正在保存图片..." : "💡 记录一闪而过的想法..."}
          className="input-field"
        />
        <button onClick={handleSubmit} className="input-btn" title="提交 (Enter)">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M12 7L7 2M12 7L7 12M12 7H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* 提示信息 */}
      {inputText && (
        <div className="input-hint">
          <span className={`input-hint-dot ${hasTimeKeyword(inputText) ? "task" : "idea"}`}></span>
          <span>
            {hasTimeKeyword(inputText)
              ? "将归入待办"
              : "将归入灵感记录"}
          </span>
        </div>
      )}
    </div>
  );
}
