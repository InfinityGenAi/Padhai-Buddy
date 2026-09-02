#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use tauri::{
  menu::{Menu, MenuItem},
  tray::{TrayIconBuilder, TrayIconEvent},
  Manager, SystemTray, SystemTrayEvent, SystemTrayMenu,
};

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_clipboard_manager::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_opener::init())
    .setup(|app| {
      // System tray
      let show = MenuItem::new(app, "Show Padhai Buddy", true, None::<&str>)?;
      let quit = MenuItem::new(app, "Quit", true, None::<&str>)?;
      let menu = Menu::new(app, &[&show, &quit])?;

      let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().cloned().unwrap())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| match event {
          TrayIconEvent::Click { .. } => {
            if let Some(window) = tray.app_handle().get_webview_window("main") {
              let _ = window.show();
              let _ = window.set_focus();
            }
          }
          TrayIconEvent::DoubleClick { .. } => {
            if let Some(window) = tray.app_handle().get_webview_window("main") {
              let _ = window.show();
              let _ = window.set_focus();
            }
          }
          _ => {}
        })
        .build(app)?;

      Ok(())
    })
    .on_window_event(|window, event| {
      if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        // Hide instead of close to keep app running in background
        window.hide().unwrap();
        api.prevent_close();
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}