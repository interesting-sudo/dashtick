/**
 * 时间关键词解析器
 * 识别中文时间表达式，返回本地时间格式的日期时间字符串（无时区后缀）
 */

interface ParsedTime {
  dueDate: string | null;
  cleanText: string; // 移除时间关键词后的文本
}

/**
 * 将 Date 转为本地时间字符串（YYYY-MM-DDTHH:mm:ss），不含时区后缀
 * 避免 toISOString() 转 UTC 导致时区偏移
 */
function toLocalISOString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}:${s}`;
}

// 时间关键词映射
const TIME_PATTERNS: Array<{
  pattern: RegExp;
  handler: (match: RegExpMatchArray) => Date;
}> = [
  // "今天下午3点" / "今天15:00"
  {
    pattern: /今天\s*(上午|下午|晚上)?\s*(\d{1,2})[点时:：](\d{2})?分?/,
    handler: (match) => {
      const now = new Date();
      let hour = parseInt(match[2]);
      const minute = match[3] ? parseInt(match[3]) : 0;
      if (match[1] === "下午" && hour < 12) hour += 12;
      if (match[1] === "晚上" && hour < 12) hour += 12;
      now.setHours(hour, minute, 0, 0);
      return now;
    },
  },
  // "明天下午3点"
  {
    pattern: /明天\s*(上午|下午|晚上)?\s*(\d{1,2})[点时:：](\d{2})?分?/,
    handler: (match) => {
      const now = new Date();
      now.setDate(now.getDate() + 1);
      let hour = parseInt(match[2]);
      const minute = match[3] ? parseInt(match[3]) : 0;
      if (match[1] === "下午" && hour < 12) hour += 12;
      if (match[1] === "晚上" && hour < 12) hour += 12;
      now.setHours(hour, minute, 0, 0);
      return now;
    },
  },
  // "后天"
  {
    pattern: /后天\s*(上午|下午|晚上)?\s*(\d{1,2})?[点时]?/,
    handler: (match) => {
      const now = new Date();
      now.setDate(now.getDate() + 2);
      if (match[2]) {
        let hour = parseInt(match[2]);
        if (match[1] === "下午" && hour < 12) hour += 12;
        now.setHours(hour, 0, 0, 0);
      }
      return now;
    },
  },
  // "X分钟后"
  {
    pattern: /(\d+)\s*分钟[后以]/,
    handler: (match) => {
      const now = new Date();
      now.setMinutes(now.getMinutes() + parseInt(match[1]));
      return now;
    },
  },
  // "X小时后"
  {
    pattern: /(\d+)\s*小时[后以]/,
    handler: (match) => {
      const now = new Date();
      now.setHours(now.getHours() + parseInt(match[1]));
      return now;
    },
  },
  // "下周一/二/三..."
  {
    pattern: /下周([一二三四五六日天])\s*(上午|下午|晚上)?\s*(\d{1,2})?[点时]?/,
    handler: (match) => {
      const dayMap: Record<string, number> = {
        一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0,
      };
      const targetDay = dayMap[match[1]];
      const now = new Date();
      const currentDay = now.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      now.setDate(now.getDate() + daysUntil);
      if (match[3]) {
        let hour = parseInt(match[3]);
        if (match[2] === "下午" && hour < 12) hour += 12;
        now.setHours(hour, 0, 0, 0);
      }
      return now;
    },
  },
  // "周五" / "周六"
  {
    pattern: /(?:这|本)?周([一二三四五六日天])\s*(上午|下午|晚上)?\s*(\d{1,2})?[点时]?/,
    handler: (match) => {
      const dayMap: Record<string, number> = {
        一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0,
      };
      const targetDay = dayMap[match[1]];
      const now = new Date();
      const currentDay = now.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil < 0) daysUntil += 7;
      if (daysUntil === 0) daysUntil = 7; // 如果是今天，推到下周
      now.setDate(now.getDate() + daysUntil);
      if (match[3]) {
        let hour = parseInt(match[3]);
        if (match[2] === "下午" && hour < 12) hour += 12;
        now.setHours(hour, 0, 0, 0);
      }
      return now;
    },
  },
  // "15:00" / "15点"
  {
    pattern: /(\d{1,2})[点时:：](\d{2})?分?(?:\s|$)/,
    handler: (match) => {
      const now = new Date();
      let hour = parseInt(match[1]);
      const minute = match[2] ? parseInt(match[2]) : 0;
      if (hour < 6) hour += 12; // 假设凌晨的小时是下午
      now.setHours(hour, minute, 0, 0);
      // 如果时间已过，推到明天
      if (now < new Date()) {
        now.setDate(now.getDate() + 1);
      }
      return now;
    },
  },
];

/**
 * 解析输入文本中的时间信息
 * @param input 用户输入的文本
 * @returns 解析结果：dueDate (ISO 8601) 和清理后的文本
 */
export function parseTimeFromInput(input: string): ParsedTime {
  for (const { pattern, handler } of TIME_PATTERNS) {
    const match = input.match(pattern);
    if (match) {
      const date = handler(match);
      // 移除匹配到的时间关键词
      const cleanText = input.replace(match[0], "").trim();
      return {
        dueDate: toLocalISOString(date),
        cleanText: cleanText || input, // 如果清理后为空，保留原文
      };
    }
  }

  return {
    dueDate: null,
    cleanText: input,
  };
}

/**
 * 格式化日期为友好的中文显示
 */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  // 已过期
  if (diffMs < 0) return "已过期";

  // 今天内
  if (date.toDateString() === now.toDateString()) {
    return `今天 ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  }

  // 明天
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) {
    return `明天 ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  }

  // 一周内
  if (diffHours < 168) {
    const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return `${days[date.getDay()]} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  }

  // 更远的日期
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

/**
 * 判断输入是否包含时间关键词（用于智能分类）
 */
export function hasTimeKeyword(input: string): boolean {
  const timeKeywords = [
    /今天/, /明天/, /后天/, /下周/, /这?周[一二三四五六日天]/,
    /\d+[点时:：]/, /\d+分钟[后以]/, /\d+小时[后以]/,
    /上午/, /下午/, /晚上/,
  ];
  return timeKeywords.some((pattern) => pattern.test(input));
}
