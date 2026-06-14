import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

// 类型定义
export interface Task {
  id: number;
  content: string;
  due_date: string | null;
  is_done: boolean;
  created_at: string;
  updated_at: string;
}

export interface Idea {
  id: number;
  content: string;
  tags: string | null;
  created_at: string;
  updated_at: string;
}

type TabType = "tasks" | "ideas";

export type SelectableItem = { type: "task"; data: Task } | { type: "idea"; data: Idea };

interface AppState {
  // 标签状态
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;

  // 选中条目
  selectedItem: SelectableItem | null;
  setSelectedItem: (item: SelectableItem | null) => void;

  // 任务状态
  tasks: Task[];
  fetchTasks: () => Promise<void>;
  addTask: (content: string, dueDate?: string) => Promise<void>;
  toggleTask: (id: number) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  updateTaskDueDate: (id: number, dueDate: string | null) => Promise<void>;

  // 灵感状态
  ideas: Idea[];
  fetchIdeas: () => Promise<void>;
  addIdea: (content: string, tags?: string) => Promise<void>;
  deleteIdea: (id: number) => Promise<void>;

  // 输入状态
  inputText: string;
  setInputText: (text: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  // 标签状态
  activeTab: "tasks",
  setActiveTab: (tab) => set({ activeTab: tab, selectedItem: null }),

  // 选中条目
  selectedItem: null,
  setSelectedItem: (item) => set({ selectedItem: item }),

  // 任务状态
  tasks: [],
  fetchTasks: async () => {
    try {
      const tasks = await invoke<Task[]>("get_tasks");
      set({ tasks });
    } catch (e) {
      console.error("获取任务失败:", e);
    }
  },
  addTask: async (content, dueDate) => {
    try {
      await invoke("add_task", { content, dueDate: dueDate || null });
      await get().fetchTasks();
    } catch (e) {
      console.error("添加任务失败:", e);
    }
  },
  toggleTask: async (id) => {
    try {
      await invoke("toggle_task", { id });
      await get().fetchTasks();
    } catch (e) {
      console.error("切换任务状态失败:", e);
    }
  },
  deleteTask: async (id) => {
    try {
      await invoke("delete_task", { id });
      const { selectedItem } = get();
      if (selectedItem?.type === "task" && selectedItem.data.id === id) {
        set({ selectedItem: null });
      }
      await get().fetchTasks();
    } catch (e) {
      console.error("删除任务失败:", e);
    }
  },
  updateTaskDueDate: async (id, dueDate) => {
    try {
      await invoke("update_task_due_date", { id, dueDate });
      await get().fetchTasks();
    } catch (e) {
      console.error("更新截止时间失败:", e);
    }
  },

  // 灵感状态
  ideas: [],
  fetchIdeas: async () => {
    try {
      const ideas = await invoke<Idea[]>("get_ideas");
      set({ ideas });
    } catch (e) {
      console.error("获取灵感失败:", e);
    }
  },
  addIdea: async (content, tags) => {
    try {
      await invoke("add_idea", { content, tags: tags || null });
      await get().fetchIdeas();
    } catch (e) {
      console.error("添加灵感失败:", e);
    }
  },
  deleteIdea: async (id) => {
    try {
      await invoke("delete_idea", { id });
      const { selectedItem } = get();
      if (selectedItem?.type === "idea" && selectedItem.data.id === id) {
        set({ selectedItem: null });
      }
      await get().fetchIdeas();
    } catch (e) {
      console.error("删除灵感失败:", e);
    }
  },

  // 输入状态
  inputText: "",
  setInputText: (text) => set({ inputText: text }),
}));
