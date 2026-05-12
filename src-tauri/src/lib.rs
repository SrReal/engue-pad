use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use tauri::{AppHandle, WebviewUrl};

#[derive(Debug, Serialize, Deserialize)]
pub struct FileEntry {
    name: String,
    path: String,
    is_dir: bool,
    is_file: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DirListResult {
    entries: Vec<FileEntry>,
    path: String,
}

fn should_ignore(name: &str) -> bool {
    matches!(name, ".git" | "node_modules" | ".svelte-kit" | ".DS_Store" | "target" | "dist" | "build")
}

#[tauri::command]
fn list_directory(path: String) -> Result<DirListResult, String> {
    let dir_path = Path::new(&path);
    if !dir_path.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

    let mut entries = Vec::new();
    match fs::read_dir(dir_path) {
        Ok(read_dir) => {
            for entry in read_dir {
                if let Ok(entry) = entry {
                    let name = entry.file_name().to_string_lossy().to_string();
                    if should_ignore(&name) {
                        continue;
                    }
                    let path_str = entry.path().to_string_lossy().to_string();
                    let is_dir = entry.path().is_dir();
                    let is_file = entry.path().is_file();
                    entries.push(FileEntry {
                        name,
                        path: path_str,
                        is_dir,
                        is_file,
                    });
                }
            }
            entries.sort_by(|a, b| {
                match (a.is_dir, b.is_dir) {
                    (true, false) => std::cmp::Ordering::Less,
                    (false, true) => std::cmp::Ordering::Greater,
                    _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
                }
            });
        }
        Err(e) => return Err(format!("Failed to read directory: {}", e)),
    }

    Ok(DirListResult { entries, path })
}

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
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![greet, list_directory])
        .setup(|app| {
            create_main_window(&app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
