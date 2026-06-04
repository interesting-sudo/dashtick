use rusqlite::{Connection, Result, params};
use std::sync::Mutex;

use crate::models::{Task, Idea, Reminder};

/// 解析日期时间字符串，支持带时区和不带时区的格式
/// 返回 NaiveDateTime（本地时间）
fn parse_datetime(s: &str) -> Option<chrono::NaiveDateTime> {
    // 先尝试带时区的格式
    if let Ok(dt) = chrono::DateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S%:z") {
        return Some(dt.naive_local());
    }
    if let Ok(dt) = chrono::DateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S%.f%:z") {
        return Some(dt.naive_local());
    }
    // 不带时区的格式（本地时间）
    if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S") {
        return Some(dt);
    }
    if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S%.f") {
        return Some(dt);
    }
    None
}

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn new(conn: Connection) -> Self {
        Self {
            conn: Mutex::new(conn),
        }
    }

    /// 初始化数据库表
    pub fn init(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS tasks (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                content     TEXT NOT NULL,
                due_date    TEXT,
                is_done     INTEGER DEFAULT 0,
                created_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                updated_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS ideas (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                content     TEXT NOT NULL,
                tags        TEXT,
                created_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                updated_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS reminders (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id     INTEGER NOT NULL,
                remind_at   TEXT NOT NULL,
                notified    INTEGER DEFAULT 0,
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
            );
            "
        )?;

        Ok(())
    }

    // ==================== 任务操作 ====================

    /// 获取所有任务
    pub fn get_tasks(&self) -> Result<Vec<Task>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, content, due_date, is_done, created_at, updated_at FROM tasks ORDER BY is_done ASC, due_date ASC, created_at DESC"
        )?;

        let tasks = stmt.query_map([], |row| {
            Ok(Task {
                id: row.get(0)?,
                content: row.get(1)?,
                due_date: row.get(2)?,
                is_done: row.get::<_, i32>(3)? != 0,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })?.collect::<Result<Vec<_>>>()?;

        Ok(tasks)
    }

    /// 添加任务（同时创建提醒）
    pub fn add_task(&self, content: &str, due_date: Option<&str>) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO tasks (content, due_date) VALUES (?1, ?2)",
            params![content, due_date],
        )?;
        let task_id = conn.last_insert_rowid();

        // 如果有截止时间，自动创建提醒（提前5分钟）
        if let Some(due) = due_date {
            if let Some(dt) = parse_datetime(due) {
                let remind_at = dt - chrono::Duration::minutes(5);
                let remind_str = remind_at.format("%Y-%m-%dT%H:%M:%S").to_string();
                conn.execute(
                    "INSERT INTO reminders (task_id, remind_at) VALUES (?1, ?2)",
                    params![task_id, remind_str],
                )?;
                println!("✅ 已创建提醒: task_id={}, remind_at={}", task_id, remind_str);
            } else {
                eprintln!("⚠️ 无法解析日期: {}", due);
            }
        }

        Ok(task_id)
    }

    /// 切换任务完成状态（完成时删除提醒）
    pub fn toggle_task(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE tasks SET is_done = CASE WHEN is_done = 0 THEN 1 ELSE 0 END, updated_at = datetime('now', 'localtime') WHERE id = ?1",
            params![id],
        )?;
        // 如果标记完成，删除提醒
        conn.execute("DELETE FROM reminders WHERE task_id = ?1", params![id])?;
        Ok(())
    }

    /// 删除任务
    pub fn delete_task(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM tasks WHERE id = ?1", params![id])?;
        Ok(())
    }

    /// 更新任务截止时间（同时更新提醒）
    pub fn update_task_due_date(&self, id: i64, due_date: Option<&str>) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE tasks SET due_date = ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
            params![due_date, id],
        )?;

        // 删除旧提醒
        conn.execute("DELETE FROM reminders WHERE task_id = ?1", params![id])?;

        // 如果有新的截止时间，创建新提醒（提前5分钟）
        if let Some(due) = due_date {
            if let Some(dt) = parse_datetime(due) {
                let remind_at = dt - chrono::Duration::minutes(5);
                let remind_str = remind_at.format("%Y-%m-%dT%H:%M:%S").to_string();
                conn.execute(
                    "INSERT INTO reminders (task_id, remind_at) VALUES (?1, ?2)",
                    params![id, remind_str],
                )?;
                println!("✅ 已更新提醒: task_id={}, remind_at={}", id, remind_str);
            }
        }

        Ok(())
    }

    // ==================== 灵感操作 ====================

    /// 获取所有灵感
    pub fn get_ideas(&self) -> Result<Vec<Idea>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, content, tags, created_at, updated_at FROM ideas ORDER BY created_at DESC"
        )?;

        let ideas = stmt.query_map([], |row| {
            Ok(Idea {
                id: row.get(0)?,
                content: row.get(1)?,
                tags: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })?.collect::<Result<Vec<_>>>()?;

        Ok(ideas)
    }

    /// 添加灵感
    pub fn add_idea(&self, content: &str, tags: Option<&str>) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO ideas (content, tags) VALUES (?1, ?2)",
            params![content, tags],
        )?;
        Ok(conn.last_insert_rowid())
    }

    /// 删除灵感
    pub fn delete_idea(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM ideas WHERE id = ?1", params![id])?;
        Ok(())
    }

    // ==================== 提醒操作 ====================

    /// 获取到期的提醒
    pub fn get_due_reminders(&self) -> Result<Vec<(Reminder, Task)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "
            SELECT r.id, r.task_id, r.remind_at, r.notified,
                   t.id, t.content, t.due_date, t.is_done, t.created_at, t.updated_at
            FROM reminders r
            JOIN tasks t ON r.task_id = t.id
            WHERE r.notified = 0
              AND t.is_done = 0
              AND r.remind_at <= strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')
            "
        )?;

        let results = stmt.query_map([], |row| {
            let reminder = Reminder {
                id: row.get(0)?,
                task_id: row.get(1)?,
                remind_at: row.get(2)?,
                notified: row.get::<_, i32>(3)? != 0,
            };
            let task = Task {
                id: row.get(4)?,
                content: row.get(5)?,
                due_date: row.get(6)?,
                is_done: row.get::<_, i32>(7)? != 0,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            };
            Ok((reminder, task))
        })?.collect::<Result<Vec<_>>>()?;

        Ok(results)
    }

    /// 标记提醒已通知
    pub fn mark_reminder_notified(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE reminders SET notified = 1 WHERE id = ?1",
            params![id],
        )?;
        Ok(())
    }

    /// 调试：列出所有提醒
    pub fn debug_list_reminders(&self) -> Result<String> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT r.id, r.task_id, r.remind_at, r.notified, t.content, t.due_date
             FROM reminders r JOIN tasks t ON r.task_id = t.id
             ORDER BY r.id DESC LIMIT 20"
        )?;

        let mut lines = Vec::new();
        let now = chrono::Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();
        lines.push(format!("当前时间: {}", now));
        lines.push(String::from("---"));

        let rows = stmt.query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, i32>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, Option<String>>(5)?,
            ))
        })?.collect::<Result<Vec<_>>>()?;

        if rows.is_empty() {
            lines.push(String::from("提醒表为空"));
        }

        for (id, task_id, remind_at, notified, content, due_date) in rows {
            lines.push(format!(
                "提醒#{}: task_id={}, content='{}', due_date={:?}, remind_at={}, notified={}",
                id, task_id, content, due_date, remind_at, notified
            ));
        }

        Ok(lines.join("\n"))
    }
}
