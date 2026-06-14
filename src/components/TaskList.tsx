import { useState } from "react";
import { useStore, type Task } from "../store/useStore";
import { formatDate } from "../lib/timeParser";
import TimePicker from "./TimePicker";

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

interface TaskListProps {
  onOpenDetail?: (task: Task) => void;
}

export default function TaskList({ onOpenDetail }: TaskListProps) {
  const { tasks, toggleTask, deleteTask, updateTaskDueDate } = useStore();
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.is_done !== b.is_done) return a.is_done ? 1 : -1;
    if (a.due_date && !b.due_date) return -1;
    if (!a.due_date && b.due_date) return 1;
    if (a.due_date && b.due_date) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleDueDateChange = async (task: Task, date: string | null) => {
    await updateTaskDueDate(task.id, date);
    setEditingTaskId(null);
  };

  if (sortedTasks.length === 0) {
    return (
      <div className="list-empty">
        <span className="list-empty-icon">📋</span>
        <span className="list-empty-text">还没有待办事项</span>
        <span className="list-empty-sub">输入内容后按 Enter 创建待办</span>
      </div>
    );
  }

  return (
    <div>
      {sortedTasks.map((task) => (
        <div key={task.id} className={`task-item ${task.is_done ? "done" : ""}`}>
          <button
            onClick={() => toggleTask(task.id)}
            className={`task-checkbox ${task.is_done ? "checked" : ""}`}
          >
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </button>

          <div className="task-body" style={{ cursor: "pointer" }} onClick={() => onOpenDetail?.(task)}>
            <div className="task-content">{task.content}</div>
            <div className="task-meta">
              <span className="task-created">{formatCreatedTime(task.created_at)}</span>
              {task.due_date && (
                <span className="task-created-sep">·</span>
              )}
            </div>
          </div>

          {/* 截止时间 - 点击可编辑 */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <span
              className={`task-due ${task.due_date && new Date(task.due_date) < new Date() && !task.is_done ? "overdue" : ""} ${!task.due_date ? "no-time" : ""}`}
              onClick={() => setEditingTaskId(editingTaskId === task.id ? null : task.id)}
              style={{ cursor: "pointer" }}
              title="点击设置/修改时间"
            >
              {task.due_date ? formatDate(task.due_date) : "+ 时间"}
            </span>
            {editingTaskId === task.id && (
              <TimePicker
                value={task.due_date}
                onChange={(date) => handleDueDateChange(task, date)}
                onClose={() => setEditingTaskId(null)}
              />
            )}
          </div>

          <button
            onClick={() => deleteTask(task.id)}
            onMouseDown={(e) => e.stopPropagation()}
            className="task-delete"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
