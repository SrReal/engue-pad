pub mod terminal;

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::collections::HashMap;
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
fn search_files(path: String, query: String) -> Result<Vec<String>, String> {
    let root = Path::new(&path);
    if !root.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }
    let q = query.to_lowercase();
    let mut results = Vec::new();
    fn walk(dir: &Path, q: &str, results: &mut Vec<String>) -> Result<(), std::io::Error> {
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let name = entry.file_name().to_string_lossy().to_string();
            if should_ignore(&name) {
                continue;
            }
            let path_str = entry.path().to_string_lossy().to_string();
            if name.to_lowercase().contains(q) {
                results.push(path_str.clone());
            }
            if entry.path().is_dir() {
                walk(&entry.path(), q, results)?;
            }
        }
        Ok(())
    }
    walk(root, &q, &mut results).map_err(|e| e.to_string())?;
    results.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));
    Ok(results)
}

#[tauri::command]
fn list_project_files(path: String) -> Result<Vec<String>, String> {
    let root = Path::new(&path);
    if !root.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }
    let mut files = Vec::new();
    fn walk(dir: &Path, files: &mut Vec<String>) -> Result<(), std::io::Error> {
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let name = entry.file_name().to_string_lossy().to_string();
            if should_ignore(&name) {
                continue;
            }
            let path_str = entry.path().to_string_lossy().to_string();
            if entry.path().is_dir() {
                walk(&entry.path(), files)?;
            } else {
                files.push(path_str);
            }
        }
        Ok(())
    }
    walk(root, &mut files).map_err(|e| e.to_string())?;
    files.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));
    Ok(files)
}

#[derive(Debug, Serialize)]
pub struct SearchMatch {
    path: String,
    line: usize,
    text: String,
}

#[tauri::command]
fn find_in_file(path: String, query: String) -> Result<Vec<SearchMatch>, String> {
    let content = fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))?;
    let q = query.to_lowercase();
    let mut matches = Vec::new();
    for (i, line) in content.lines().enumerate() {
        if line.to_lowercase().contains(&q) {
            matches.push(SearchMatch {
                path: path.clone(),
                line: i + 1,
                text: line.to_string(),
            });
        }
    }
    Ok(matches)
}

#[tauri::command]
fn find_in_project(path: String, query: String) -> Result<Vec<SearchMatch>, String> {
    let root = Path::new(&path);
    if !root.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }
    let q = query.to_lowercase();
    let mut matches = Vec::new();
    fn walk(dir: &Path, q: &str, matches: &mut Vec<SearchMatch>) -> Result<(), std::io::Error> {
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let name = entry.file_name().to_string_lossy().to_string();
            if should_ignore(&name) {
                continue;
            }
            let path_str = entry.path().to_string_lossy().to_string();
            if entry.path().is_dir() {
                walk(&entry.path(), q, matches)?;
            } else if entry.path().is_file() {
                if let Ok(content) = fs::read_to_string(&entry.path()) {
                    for (i, line) in content.lines().enumerate() {
                        if line.to_lowercase().contains(q) {
                            matches.push(SearchMatch {
                                path: path_str.clone(),
                                line: i + 1,
                                text: line.to_string(),
                            });
                        }
                    }
                }
            }
        }
        Ok(())
    }
    walk(root, &q, &mut matches).map_err(|e| e.to_string())?;
    Ok(matches)
}

#[tauri::command]
fn dir_exists(path: String) -> Result<bool, String> {
    Ok(Path::new(&path).is_dir())
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
fn write_file_bytes(path: String, contents: Vec<u8>) -> Result<(), String> {
    fs::write(&path, contents).map_err(|e| format!("Failed to write file bytes: {}", e))
}

#[tauri::command]
fn remove_file(path: String) -> Result<(), String> {
    fs::remove_file(&path).map_err(|e| format!("Failed to remove file: {}", e))
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

    #[cfg(target_os = "macos")]
    let mut cmd = {
        let escaped_args: Vec<String> = input.args.iter().map(|a| {
            if a.contains(' ') || a.contains('\'') || a.contains('"') {
                format!("'{}'", a.replace('\'', "'\"'\"'"))
            } else {
                a.clone()
            }
        }).collect();
        let shell_cmd = format!("{} {}", &input.command, escaped_args.join(" "));
        let mut c = Command::new("zsh");
        c.args(["-ilc", &shell_cmd]);
        c
    };
    #[cfg(not(target_os = "macos"))]
    let mut cmd = {
        let mut c = Command::new(&input.command);
        c.args(&input.args);
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            c.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }
        c
    };

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
fn remove_dir_all(path: String) -> Result<(), String> {
    fs::remove_dir_all(&path).map_err(|e| format!("Failed to remove dir: {}", e))
}

#[tauri::command]
fn git_status(cwd: String) -> Result<GitStatus, String> {
    use std::process::Command;

    #[cfg(windows)]
    fn new_git_command() -> Command {
        use std::os::windows::process::CommandExt;
        let mut c = Command::new("git");
        c.creation_flags(0x08000000); // CREATE_NO_WINDOW
        c
    }
    #[cfg(not(windows))]
    fn new_git_command() -> Command {
        Command::new("git")
    }

    let is_repo = new_git_command()
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

    let branch = new_git_command()
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
    if let Ok(output) = new_git_command()
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
fn get_app_stats() -> Result<AppStats, String> {
    use std::sync::Mutex;
    use sysinfo::{Pid, System};

    // Reuse a single System instance across calls so cpu_usage() has a valid baseline delta.
    static SYSTEM: Mutex<Option<System>> = Mutex::new(None);
    let mut guard = SYSTEM.lock().map_err(|_| "System lock failed")?;
    // Use new_all() once so CPU baselines are properly initialised; keep the same System afterwards.
    let system = guard.get_or_insert_with(System::new_all);

    let pid = Pid::from(std::process::id() as usize);
    // Refresh ALL processes to ensure cpu_usage() has a valid global baseline.
    system.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
    system.refresh_cpu_usage();

    if let Some(proc) = system.process(pid) {
        Ok(AppStats {
            cpu: proc.cpu_usage(),
            memory_mb: proc.memory() / 1024 / 1024,
        })
    } else {
        Ok(AppStats {
            cpu: 0.0,
            memory_mb: 0,
        })
    }
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
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(Arc::clone(&terminal_manager))
        .invoke_handler(tauri::generate_handler![greet, list_directory, list_project_files, read_file, read_file_bytes, write_file, write_file_bytes, remove_file, ensure_dir, dir_exists, read_file_meta, get_app_data_dir, exit_app, rename_file, remove_dir_all, run_command, git_status, search_files, find_in_file, find_in_project, terminal::create_terminal, terminal::write_terminal, terminal::resize_terminal, terminal::get_terminal_cwd, terminal::kill_terminal, terminal::get_terminal_processes, get_app_stats])
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
