use std::sync::Arc;
use std::time::Duration;
use chrono::{Datelike, TimeZone};
use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

use crate::db::Database;

/// 将原始日期时间字符串格式化为中文友好格式
fn format_due_date(date_str: &str) -> String {
    let now = chrono::Local::now();
    let naive = match chrono::NaiveDateTime::parse_from_str(date_str, "%Y-%m-%dT%H:%M:%S") {
        Ok(dt) => dt,
        Err(_) => return date_str.to_string(),
    };

    // 转为带时区的 Local 时间进行比较
    let dt = chrono::Local.from_local_datetime(&naive).single().unwrap_or_else(|| naive.and_local_timezone(chrono::Local).unwrap());
    let diff = dt.signed_duration_since(now);

    // 已过期
    if diff.num_seconds() < 0 {
        return "已过期".to_string();
    }

    let time_str = format!("{:02}:{:02}", dt.format("%H"), dt.format("%M"));

    // 今天
    if dt.format("%Y-%m-%d").to_string() == now.format("%Y-%m-%d").to_string() {
        return format!("今天 {}", time_str);
    }

    // 明天
    let tomorrow = now + chrono::Duration::days(1);
    if dt.format("%Y-%m-%d").to_string() == tomorrow.format("%Y-%m-%d").to_string() {
        return format!("明天 {}", time_str);
    }

    // 一周内
    let weekday = match dt.weekday() {
        chrono::Weekday::Mon => "周一",
        chrono::Weekday::Tue => "周二",
        chrono::Weekday::Wed => "周三",
        chrono::Weekday::Thu => "周四",
        chrono::Weekday::Fri => "周五",
        chrono::Weekday::Sat => "周六",
        chrono::Weekday::Sun => "周日",
    };

    if diff.num_days() < 7 {
        return format!("{} {}", weekday, time_str);
    }

    // 更远的日期
    format!("{}/{} {}", dt.format("%-m"), dt.format("%-d"), time_str)
}

/// 启动提醒检查线程
pub fn start_reminder_thread(app: AppHandle, db: Arc<Database>) {
    std::thread::spawn(move || {
        println!("🔔 提醒线程已启动，每15秒检查一次");

        loop {
            std::thread::sleep(Duration::from_secs(15));

            // 用 catch_unwind 防止单次错误导致线程退出
            let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                check_and_notify(&app, &db)
            }));

            if let Err(e) = result {
                eprintln!("❌ 提醒检查出现异常（线程将继续运行）: {:?}", e);
            }
        }
    });
}

fn check_and_notify(app: &AppHandle, db: &Arc<Database>) {
    let now = chrono::Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();
    match db.get_due_reminders() {
        Ok(reminders) => {
            if !reminders.is_empty() {
                println!("🔔 [{}] 发现 {} 条到期提醒", now, reminders.len());
            }
            for (reminder, task) in reminders {
                let due_date_str = task.due_date.as_deref().map(|d| format_due_date(d)).unwrap_or_else(|| "未设置".to_string());

                // 发送 Windows 原生通知
                let result = app
                    .notification()
                    .builder()
                    .title("📋 闪小条 — 待办提醒")
                    .body(format!("{}\n截止时间：{}", task.content, due_date_str))
                    .show();

                match result {
                    Ok(()) => println!("✅ 通知已发送: {}", task.content),
                    Err(e) => eprintln!("❌ 通知发送失败: {}", e),
                }

                // 标记已通知（忽略错误，避免重复通知）
                if let Err(e) = db.mark_reminder_notified(reminder.id) {
                    eprintln!("❌ 标记提醒已通知失败: {}", e);
                }
            }
        }
        Err(e) => {
            eprintln!("❌ 检查提醒失败: {}", e);
        }
    }
}
