import { useStore } from "../store/useStore";

export default function TabSwitch() {
  const { activeTab, setActiveTab, tasks, ideas } = useStore();

  const pendingTasks = tasks.filter((t) => !t.is_done).length;

  return (
    <div className="tab-group">
      <button
        onClick={() => setActiveTab("tasks")}
        className={`tab-btn ${activeTab === "tasks" ? "active-task" : ""}`}
      >
        📋 待办
        {pendingTasks > 0 && (
          <span className={`tab-count ${activeTab === "tasks" ? "active-task" : "inactive-task"}`}>
            {pendingTasks}
          </span>
        )}
      </button>
      <button
        onClick={() => setActiveTab("ideas")}
        className={`tab-btn ${activeTab === "ideas" ? "active-idea" : ""}`}
      >
        💡 灵感
        {ideas.length > 0 && (
          <span className={`tab-count ${activeTab === "ideas" ? "active-idea" : "inactive-idea"}`}>
            {ideas.length}
          </span>
        )}
      </button>
    </div>
  );
}
