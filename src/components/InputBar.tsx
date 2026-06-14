import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useStore } from "../store/useStore";
import { parseTimeFromInput, hasTimeKeyword } from "../lib/timeParser";
import TimePicker from "./TimePicker";

export default function InputBar() {
  const { inputText, setInputText, addTask, addIdea, activeTab } = useStore();
  const [isComposing, setIsComposing] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [manualDueDate, setManualDueDate] = useState<string | null>(null);
  const [pasting, setPasting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 自动调整 textarea 高度
  useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  }, [inputText]);

  const handleSubmit = async () => {
    const text = inputText.trim();
    if (!text) return;

    const hasTime = hasTimeKeyword(text);

    if (hasTime || activeTab === "tasks" || manualDueDate) {
      let dueDate = manualDueDate;
      let cleanText = text;

      if (!dueDate) {
        const parsed = parseTimeFromInput(text);
        dueDate = parsed.dueDate;
        cleanText = parsed.cleanText;
      }

      await addTask(cleanText, dueDate || undefined);
    } else {
      await addIdea(text);
    }

    setInputText("");
    setManualDueDate(null);
    setShowTimePicker(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isComposing && !e.shiftKey) {
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
          // 读取文件为 base64
          const reader = new FileReader();
          const imageData = await new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              const result = reader.result as string;
              // 去掉 data:image/xxx;base64, 前缀
              resolve(result.split(",")[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          // 获取扩展名
          const ext = file.type.split("/")[1] || "png";

          // 调用 Rust 保存图片
          const filePath = await invoke<string>("save_image", { data: imageData, ext });

          // 在输入框中插入图片引用
          const imgText = `\n![图片](${filePath})\n`;
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
        <textarea
          ref={inputRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder={pasting ? "⏳ 正在保存图片..." : "💡 记录一闪而过的想法...（支持粘贴图片）"}
          className="input-field input-textarea"
          rows={1}
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
