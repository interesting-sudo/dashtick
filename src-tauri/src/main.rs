// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;
mod models;
mod reminders;
mod shortcuts;
mod tray;

use db::Database;
use rusqlite::Connection;
use std::sync::Arc;
use tauri::{Manager, State};
use tauri_plugin_notification::NotificationExt;

// ==================== Tauri Commands ====================

#[tauri::command]
fn get_tasks(db: State<'_, Arc<Database>>) -> Result<Vec<models::Task>, String> {
    db.get_tasks().map_err(|e| e.to_string())
}

#[tauri::command]
fn add_task(db: State<'_, Arc<Database>>, content: String, due_date: Option<String>) -> Result<i64, String> {
    db.add_task(&content, due_date.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
fn toggle_task(db: State<'_, Arc<Database>>, id: i64) -> Result<(), String> {
    db.toggle_task(id).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_task(db: State<'_, Arc<Database>>, id: i64) -> Result<(), String> {
    db.delete_task(id).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_task_due_date(db: State<'_, Arc<Database>>, id: i64, due_date: Option<String>) -> Result<(), String> {
    db.update_task_due_date(id, due_date.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_ideas(db: State<'_, Arc<Database>>) -> Result<Vec<models::Idea>, String> {
    db.get_ideas().map_err(|e| e.to_string())
}

#[tauri::command]
fn add_idea(db: State<'_, Arc<Database>>, content: String, tags: Option<String>) -> Result<i64, String> {
    db.add_idea(&content, tags.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_idea(db: State<'_, Arc<Database>>, id: i64) -> Result<(), String> {
    db.delete_idea(id).map_err(|e| e.to_string())
}

#[tauri::command]
fn hide_window(app: tauri::AppHandle) {
    tray::hide_window(&app);
}

/// 调试：手动触发通知测试
#[tauri::command]
fn debug_test_notification(app: tauri::AppHandle) -> Result<String, String> {
    app
        .notification()
        .builder()
        .title("📋 闪小条 — 测试")
        .body("这是一条手动测试通知")
        .show()
        .map_err(|e| e.to_string())?;
    Ok("通知已发送".to_string())
}

/// 调试：查看提醒表内容
#[tauri::command]
fn debug_get_reminders(db: State<'_, Arc<Database>>) -> Result<String, String> {
    db.debug_list_reminders().map_err(|e| e.to_string())
}

#[tauri::command]
fn show_window(app: tauri::AppHandle) {
    tray::show_window(&app);
}

/// 保存粘贴的图片到本地文件系统
#[tauri::command]
fn save_image(app: tauri::AppHandle, data: String, ext: String) -> Result<String, String> {
    use base64::Engine;

    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let images_dir = app_dir.join("images");
    std::fs::create_dir_all(&images_dir).map_err(|e| e.to_string())?;

    // 生成文件名：时间戳 + 随机数
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let filename = format!("img_{}.{}", timestamp, ext);
    let file_path = images_dir.join(&filename);

    // 解码 base64 并写入文件
    let image_data = base64::engine::general_purpose::STANDARD
        .decode(&data)
        .map_err(|e| format!("base64 解码失败: {}", e))?;
    std::fs::write(&file_path, &image_data).map_err(|e| e.to_string())?;

    // 返回绝对路径
    Ok(file_path.to_string_lossy().to_string())
}

// ==================== Main ====================

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // 第二个实例启动时，聚焦已有窗口
            tray::show_window(app);
        }))
        .setup(|app| {
            // 初始化数据库
            let app_dir = app.path().app_data_dir().expect("无法获取应用数据目录");
            std::fs::create_dir_all(&app_dir).expect("无法创建应用数据目录");

            let db_path = app_dir.join("dashtick.db");
            let conn = Connection::open(db_path).expect("无法打开数据库");
            let db = Arc::new(Database::new(conn));
            db.init().expect("无法初始化数据库");

            // 注册数据库到状态
            app.manage(db.clone());

            // 创建系统托盘
            tray::create_tray(app.handle())?;

            // 注册全局快捷键
            shortcuts::register_shortcuts(app.handle());

            // 启动提醒线程
            reminders::start_reminder_thread(app.handle().clone(), db);

            // 监听窗口移动，实时保存位置
            if let Some(window) = app.get_webview_window("main") {
                let app_handle = app.handle().clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::Moved(pos) = event {
                        let position = tray::WindowPosition {
                            x: pos.x as f64,
                            y: pos.y as f64,
                        };
                        tray::save_position(&app_handle, &position);
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_tasks,
            add_task,
            toggle_task,
            delete_task,
            update_task_due_date,
            get_ideas,
            add_idea,
            delete_idea,
            hide_window,
            show_window,
            save_image,
            debug_test_notification,
            debug_get_reminders,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
