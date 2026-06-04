import { useState } from "react";

interface TimePickerProps {
  value: string | null;
  onChange: (date: string | null) => void;
  onClose?: () => void;
}

// 快捷日期选项
const QUICK_DATES = [
  { label: "今天", getValue: () => getDateOffset(0) },
  { label: "明天", getValue: () => getDateOffset(1) },
  { label: "后天", getValue: () => getDateOffset(2) },
  { label: "下周", getValue: () => getDateOffset(7) },
];

// 快捷时间选项
const QUICK_TIMES = [
  "09:00",
  "12:00",
  "14:00",
  "18:00",
  "21:00",
];

function toLocalISOString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}:${s}`;
}

function getDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function TimePicker({ value, onChange, onClose }: TimePickerProps) {
  const [selectedDate, setSelectedDate] = useState(() => {
    if (value) return value.slice(0, 10);
    return new Date().toISOString().slice(0, 10);
  });

  const [selectedTime, setSelectedTime] = useState(() => {
    if (value) {
      const d = new Date(value);
      return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    }
    return "18:00";
  });

  const [mode, setMode] = useState<"quick" | "custom">("quick");

  const handleQuickSelect = (dateStr: string, time: string) => {
    const d = new Date(`${dateStr}T${time}:00`);
    onChange(toLocalISOString(d));
    onClose?.();
  };

  const handleCustomConfirm = () => {
    const dateStr = `${selectedDate}T${selectedTime}:00`;
    onChange(toLocalISOString(new Date(dateStr)));
    onClose?.();
  };

  const handleClear = () => {
    onChange(null);
    onClose?.();
  };

  return (
    <div className="time-picker" onClick={(e) => e.stopPropagation()}>
      {/* 模式切换 */}
      <div className="tp-header">
        <button
          className={`tp-mode-btn ${mode === "quick" ? "active" : ""}`}
          onClick={() => setMode("quick")}
        >
          快捷
        </button>
        <button
          className={`tp-mode-btn ${mode === "custom" ? "active" : ""}`}
          onClick={() => setMode("custom")}
        >
          自定义
        </button>
        <div className="tp-header-right">
          <button className="tp-clear-btn" onClick={handleClear}>
            清除时间
          </button>
        </div>
      </div>

      {mode === "quick" ? (
        /* 快捷选项 - 日期 + 时间矩阵 */
        <div className="tp-quick-grid">
          <div className="tp-quick-row">
            <span className="tp-quick-label">日期</span>
            <div className="tp-quick-items">
              {QUICK_DATES.map((opt) => (
                <button
                  key={opt.label}
                  className="tp-quick-item"
                  onClick={() => handleQuickSelect(opt.getValue(), selectedTime)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="tp-quick-row">
            <span className="tp-quick-label">时间</span>
            <div className="tp-quick-items">
              {QUICK_TIMES.map((time) => (
                <button
                  key={time}
                  className="tp-quick-item"
                  onClick={() => handleQuickSelect(selectedDate, time)}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* 自定义日期时间 */
        <div className="tp-custom">
          <div className="tp-field">
            <label className="tp-label">日期</label>
            <input
              type="date"
              className="tp-input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div className="tp-field">
            <label className="tp-label">时间</label>
            <input
              type="time"
              className="tp-input"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
            />
          </div>
          <button className="tp-confirm-btn" onClick={handleCustomConfirm}>
            确定
          </button>
        </div>
      )}
    </div>
  );
}
