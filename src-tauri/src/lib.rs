use tauri::{AppHandle, WebviewUrl};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn create_main_window(app: &AppHandle) {
    let monitor = match app.primary_monitor().unwrap_or(None) {
        Some(m) => m,
        None => {
            let _ = tauri::WebviewWindowBuilder::new(app, "main", WebviewUrl::App("/".into()))
                .title("EnguePad")
                .inner_size(1200.0, 800.0)
                .center()
                .build();
            return;
        }
    };

    let size = monitor.size();
    let width = (size.width as f64 * 0.5).round();
    let height = (size.height as f64 * 0.5).round();

    let _ = tauri::WebviewWindowBuilder::new(app, "main", WebviewUrl::App("/".into()))
        .title("EnguePad")
        .inner_size(width, height)
        .center()
        .build();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .setup(|app| {
            create_main_window(&app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
