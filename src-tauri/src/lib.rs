mod terminal;

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl};

#[derive(Debug, Serialize, Deserialize)]
pub struct FileContent {
    content: String,
    line_ending: String,
}

#[derive(Debug, Serialize)]
pub struct AppStats {
    cpu: f32,
    memory_mb: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileEntry {
    name: String,
    path: String,
    is_dir: bool,
    is_file: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RunCommandInput {
    command: String,
    args: Vec<String>,
    cwd: Option<String>,
    stdin: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct RunCommandOutput {
    stdout: String,
    stderr: String,
    exit_code: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DirListResult {
    entries: Vec<FileEntry>,
    path: String,
    truncated: bool,
}

#[derive(Debug, Serialize)]
pub struct GitStatus {
    is_repo: bool,
    branch: String,
    files: HashMap<String, String>,
}

fn should_ignore(name: &str) -> bool {
    matches!(name, ".git" | "node_modules" | ".svelte-kit" | ".DS_Store" | "target" | "dist" | "build")
}

const MAX_DIR_ENTRIES: usize = 1000;

#[tauri::command]
fn list_directory(path: String) -> Result<DirListResult, String> {
    let dir_path = Path::new(&path);
    if !dir_path.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

    let mut entries = Vec::new();
    let mut truncated = false;
    match fs::read_dir(dir_path) {
        Ok(read_dir) => {
            for entry in read_dir {
                if entries.len() >= MAX_DIR_ENTRIES {
                    truncated = true;
                    break;
                }
                if let Ok(entry) = entry {
                    let name = entry.file_name().to_string_lossy().to_string();
                    if should_ignore(&name) {
                        continue;
                    }
                    // Hide .enguepad/todo.md from file tree
                    if name == "todo.md" && dir_path.file_name().map(|n| n == ".enguepad").unwrap_or(false) {
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

    Ok(DirListResult { entries, path, truncated })
}

#[tauri::command]
fn ensure_dir(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory: {}", e))
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
fn read_file_meta(path: String) -> Result<FileContent, String> {
    let content = fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))?;
    let line_ending = if content.contains("\r\n") {
        "CRLF".to_string()
    } else {
        "LF".to_string()
    };
    Ok(FileContent { content, line_ending })
}

#[tauri::command]
fn write_file(path: String, contents: String) -> Result<(), String> {
    fs::write(&path, contents).map_err(|e| format!("Failed to write file: {}", e))
}

#[tauri::command]
fn get_app_data_dir(app_handle: AppHandle) -> Result<String, String> {
    let result = app_handle
        .path()
        .app_data_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| format!("Failed to get app data dir: {}", e));
    if let Ok(ref path) = result {
        println!("[rust] get_app_data_dir: {}", path);
    }
    result
}

#[tauri::command]
fn run_command(input: RunCommandInput) -> Result<RunCommandOutput, String> {
    use std::process::{Command, Stdio};
    use std::io::Write;

    let mut cmd = Command::new(&input.command);
    cmd.args(&input.args);
    if let Some(cwd) = &input.cwd {
        cmd.current_dir(cwd);
    }
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());
    cmd.stdin(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn command: {}", e))?;

    if let Some(stdin) = input.stdin {
        if let Some(mut child_stdin) = child.stdin.take() {
            let _ = child_stdin.write_all(stdin.as_bytes());
        }
    }

    let output = child.wait_with_output().map_err(|e| format!("Failed to read command output: {}", e))?;

    Ok(RunCommandOutput {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code().unwrap_or(-1),
    })
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn exit_app(app_handle: AppHandle) {
    app_handle.exit(0);
}

#[tauri::command]
fn rename_file(from: String, to: String) -> Result<(), String> {
    fs::rename(&from, &to).map_err(|e| format!("Failed to rename: {}", e))
}

#[tauri::command]
fn git_status(cwd: String) -> Result<GitStatus, String> {
    use std::process::Command;

    let is_repo = Command::new("git")
        .args(["rev-parse", "--is-inside-work-tree"])
        .current_dir(&cwd)
        .output()
        .map(|o| o.status.success() && String::from_utf8_lossy(&o.stdout).trim() == "true")
        .unwrap_or(false);

    if !is_repo {
        return Ok(GitStatus {
            is_repo: false,
            branch: String::new(),
            files: HashMap::new(),
        });
    }

    let branch = Command::new("git")
        .args(["branch", "--show-current"])
        .current_dir(&cwd)
        .output()
        .ok()
        .and_then(|o| {
            if o.status.success() {
                Some(String::from_utf8_lossy(&o.stdout).trim().to_string())
            } else {
                None
            }
        })
        .unwrap_or_default();

    let mut files = HashMap::new();
    if let Ok(output) = Command::new("git")
        .args(["status", "--porcelain"])
        .current_dir(&cwd)
        .output()
    {
        if output.status.success() {
            for line in String::from_utf8_lossy(&output.stdout).lines() {
                if line.len() >= 3 {
                    let status = &line[0..2];
                    let path_str = line[3..].trim().to_string();
                    files.insert(path_str, status.to_string());
                }
            }
        }
    }

    Ok(GitStatus { is_repo: true, branch, files })
}

#[tauri::command]
fn get_app_stats(
    state: tauri::State<Arc<terminal::TerminalManager>>,
) -> Result<AppStats, String> {
    use sysinfo::{Pid, System};
    let mut system = System::new_all();
    system.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
    system.refresh_cpu_usage();

    let terminal_root_pids: HashSet<u32> = state.get_terminal_root_pids().into_iter().collect();

    // Build full app tree (all descendants of main process).
    let root_pid = Pid::from(std::process::id() as usize);
    let mut app_pids = HashSet::new();
    app_pids.insert(root_pid);

    let processes = system.processes();
    let mut changed = true;
    while changed {
        changed = false;
        for (pid, process) in processes {
            if app_pids.contains(pid) {
                continue;
            }
            if let Some(parent) = process.parent() {
                if app_pids.contains(&parent) {
                    app_pids.insert(*pid);
                    changed = true;
                }
            }
        }
    }

    // Build terminal descendant tree.
    let mut terminal_pids = terminal_root_pids.clone();
    let mut t_changed = true;
    while t_changed {
        t_changed = false;
        for (pid, process) in processes {
            if terminal_pids.contains(&pid.as_u32()) {
                continue;
            }
            if let Some(parent) = process.parent() {
                if terminal_pids.contains(&parent.as_u32()) {
                    terminal_pids.insert(pid.as_u32());
                    t_changed = true;
                }
            }
        }
    }

    let mut total_cpu = 0.0f32;
    let mut total_memory = 0u64;
    for pid in &app_pids {
        if terminal_pids.contains(&pid.as_u32()) {
            continue;
        }
        if let Some(proc) = system.process(*pid) {
            total_cpu += proc.cpu_usage();
            total_memory += proc.memory();
        }
    }

    Ok(AppStats {
        cpu: total_cpu,
        memory_mb: total_memory / 1024 / 1024,
    })
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
    let terminal_manager = Arc::new(terminal::TerminalManager::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(Arc::clone(&terminal_manager))
        .invoke_handler(tauri::generate_handler![greet, list_directory, read_file, read_file_bytes, write_file, ensure_dir, read_file_meta, get_app_data_dir, exit_app, rename_file, run_command, git_status, terminal::create_terminal, terminal::write_terminal, terminal::resize_terminal, terminal::get_terminal_cwd, terminal::kill_terminal, terminal::get_terminal_processes, get_app_stats])
        .setup(|app| {
            create_main_window(&app.handle().clone());
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let app_handle = window.app_handle().clone();
                let _ = app_handle.emit("request-app-close", ());
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
