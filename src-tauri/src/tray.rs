use tauri::{
    AppHandle, Manager,
    tray::{TrayIconBuilder, TrayIconEvent, MouseButton, MouseButtonState},
    menu::{Menu, MenuItem},
};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Default, Clone)]
pub struct WindowPosition {
    pub x: f64,
    pub y: f64,
}

/// 加载保存的窗口位置
fn load_position(app: &AppHandle) -> Option<WindowPosition> {
    let path = app.path().app_data_dir().ok()?.join("window_position.json");
    let data = std::fs::read_to_string(path).ok()?;
    serde_json::from_str::<WindowPosition>(&data).ok()
}

/// 保存窗口位置（过滤明显无效的坐标）
pub fn save_position(app: &AppHandle, position: &WindowPosition) {
    // 过滤掉隐藏窗口时产生的无效坐标（Windows 下可能是 -32000）
    if position.x < -1000.0 || position.y < -1000.0 {
        return;
    }
    if let Some(dir) = app.path().app_data_dir().ok() {
        let _ = std::fs::create_dir_all(&dir);
        let path = dir.join("window_position.json");
        let _ = std::fs::write(&path, serde_json::to_string(&position).unwrap_or_default());
    }
}

/// 创建系统托盘
pub fn create_tray(app: &AppHandle) -> tauri::Result<()> {
    // 创建托盘菜单
    let show_item = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .tooltip("DashTick - 闪小条\nAlt+Space 唤出")
        .on_menu_event(move |app, event| {
            match event.id.as_ref() {
                "show" => {
                    show_window(app);
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                show_window(app);
            }
        })
        .build(app)?;

    Ok(())
}

/// 显示主窗口
pub fn show_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        // 如果已可见（可能最小化了），恢复并聚焦
        if window.is_visible().unwrap_or(false) {
            let _ = window.unminimize();
            let _ = window.set_focus();
            return;
        }
        // 恢复保存的位置，否则居中
        if let Some(pos) = load_position(app) {
            let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                x: pos.x as i32,
                y: pos.y as i32,
            }));
        } else {
            let _ = window.center();
        }
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// 隐藏主窗口
pub fn hide_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}
