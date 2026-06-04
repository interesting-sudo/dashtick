use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

use crate::tray;

/// 注册全局快捷键 Alt+Space
pub fn register_shortcuts(app: &AppHandle) {
    let result = app.global_shortcut().on_shortcut(
        Shortcut::new(Some(Modifiers::ALT), Code::Space),
        move |_app, _shortcut, event| {
            if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                if let Some(window) = _app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        tray::hide_window(_app);
                    } else {
                        tray::show_window(_app);
                    }
                }
            }
        },
    );

    match result {
        Ok(()) => println!("✅ 全局快捷键 Alt+Space 已注册"),
        Err(e) => eprintln!("❌ 全局快捷键注册失败: {}", e),
    }
}
