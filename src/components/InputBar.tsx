import { useState, useRef, useEffect } from "react";
import { useStore } from "../store/useStore";
import { parseTimeFromInput, hasTimeKeyword } from "../lib/timeParser";
import TimePicker from "./TimePicker";

export default function InputBar() {
  const { inputText, setInputText, addTask, addIdea, activeTab, setActiveTab } = useStore();
  const [isComposing, setIsComposing] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [manualDueDate, setManualDueDate] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    const text = inputText.trim();
    if (!text) return;

    const hasTime = hasTimeKeyword(text);

    if (hasTime || activeTab === "tasks" || manualDueDate) {
      // 优先使用手动选择的时间，其次使用智能识别
      let dueDate = manualDueDate;
      let cleanText = text;

      if (!dueDate) {
        const parsed = parseTimeFromInput(text);
        dueDate = parsed.dueDate;
        cleanText = parsed.cleanText;
      }

      await addTask(cleanText, dueDate || undefined);
      setActiveTab("tasks");
    } else {
      await addIdea(text);
      setActiveTab("ideas");
    }

    setInputText("");
    setManualDueDate(null);
    setShowTimePicker(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isComposing) {
      e.preventDefault();
      handleSubmit();
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
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder="💡 记录一闪而过的想法..."
          className="input-field"
        />
        {/* 时间选择按钮 */}
        <button
          className={`input-time-btn ${manualDueDate ? "has-time" : ""}`}
          onClick={() => setShowTimePicker(!showTimePicker)}
          title="设置截止时间"
        >
          🕐
        </button>
        <button onClick={handleSubmit} className="input-btn">
          ↵
        </button>
      </div>

      {/* 提示信息 */}
      {inputText && !showTimePicker && (
        <div className="input-hint">
          <span className={`input-hint-dot ${hasTimeKeyword(inputText) || manualDueDate ? "task" : "idea"}`}></span>
          <span>
            {hasTimeKeyword(inputText) || manualDueDate
              ? `将归入待办${manualDueDate ? "（已设置时间）" : ""}`
              : "将归入灵感记录"}
          </span>
        </div>
      )}

      {/* 时间选择器 */}
      {showTimePicker && (
        <TimePicker
          value={manualDueDate}
          onChange={setManualDueDate}
          onClose={() => setShowTimePicker(false)}
        />
      )}
    </div>
  );
}
