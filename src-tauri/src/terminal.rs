use portable_pty::{CommandBuilder, NativePtySystem, PtyPair, PtySize, PtySystem};
use std::collections::{HashMap, HashSet};
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use sysinfo::{Pid, System};
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, serde::Serialize)]
struct TerminalOutput {
    terminal_id: String,
    data: Vec<u8>,
}

#[derive(Debug, Clone, serde::Serialize)]
struct TerminalClosed {
    terminal_id: String,
}

pub struct TerminalSession {
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    _pair: PtyPair,
    _child: Box<dyn portable_pty::Child + Send + Sync>,
    child_pid: Option<u32>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub cpu: f32,
    pub memory_mb: u64,
    pub cwd: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct TerminalProcessTree {
    pub processes: Vec<ProcessInfo>,
    pub total_cpu: f32,
    pub total_memory_mb: u64,
}

pub struct TerminalManager {
    sessions: Arc<Mutex<HashMap<String, TerminalSession>>>,
    terminal_pids: Arc<Mutex<HashMap<String, u32>>>,
}

impl TerminalManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
            terminal_pids: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    fn kill_process_tree(&self, root_pid: u32) {
        let mut system = System::new_all();
        system.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

        let mut pids_to_kill = HashSet::new();
        pids_to_kill.insert(root_pid);

        let processes = system.processes();
        let mut changed = true;
        while changed {
            changed = false;
            for (pid, process) in processes {
                let pid_u32 = pid.as_u32();
                if pids_to_kill.contains(&pid_u32) {
                    continue;
                }
                if let Some(parent) = process.parent() {
                    if pids_to_kill.contains(&parent.as_u32()) {
                        pids_to_kill.insert(pid_u32);
                        changed = true;
                    }
                }
            }
        }

        for pid in pids_to_kill {
            if let Some(proc) = system.process(sysinfo::Pid::from(pid as usize)) {
                let _ = proc.kill();
            }
        }
    }

    pub fn create_terminal(
        &self,
        app_handle: AppHandle,
        terminal_id: String,
        shell: String,
        cwd: Option<String>,
        cols: u16,
        rows: u16,
    ) -> Result<(), String> {
        // Kill any existing session for this terminal_id before creating a new one
        {
            let mut sessions = self.sessions.lock().unwrap();
            let existing = sessions.remove(&terminal_id);
            let mut terminal_pids = self.terminal_pids.lock().unwrap();
            terminal_pids.remove(&terminal_id);

            if let Some(session) = existing {
                if let Some(root_pid) = session.child_pid {
                    drop(sessions);
                    drop(terminal_pids);
                    self.kill_process_tree(root_pid);
                }
            }
        }

        let pty_system = NativePtySystem::default();

        let pair = pty_system
            .openpty(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to open pty: {}", e))?;

        let mut cmd = CommandBuilder::new(&shell);
        if let Some(dir) = cwd {
            cmd.cwd(dir);
        }

        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("Failed to spawn shell: {}", e))?;

        let child_pid = child.process_id();

        let mut reader = pair.master.try_clone_reader()
            .map_err(|e| format!("Failed to clone reader: {}", e))?;
        let writer = Arc::new(Mutex::new(
            pair.master.take_writer()
                .map_err(|e| format!("Failed to take writer: {}", e))?,
        ));

        // Immediately clear the screen for PowerShell to hide the startup banner
        if shell.to_lowercase().contains("powershell") || shell.to_lowercase().contains("pwsh") {
            let _ = writer.lock().unwrap().write_all(b"\x1b[2J\x1b[H");
            let _ = writer.lock().unwrap().flush();
        }

        let sessions = Arc::clone(&self.sessions);
        let id = terminal_id.clone();

        std::thread::spawn(move || {
            let mut buf = [0u8; 4096];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        let data = buf[..n].to_vec();
                        let _ = app_handle.emit("terminal-output", TerminalOutput {
                            terminal_id: id.clone(),
                            data,
                        });
                    }
                    Err(_) => break,
                }
            }
            sessions.lock().unwrap().remove(&id);
            let _ = app_handle.emit("terminal-closed", TerminalClosed {
                terminal_id: id.clone(),
            });
        });

        self.sessions.lock().unwrap().insert(
            terminal_id.clone(),
            TerminalSession {
                writer,
                _pair: pair,
                _child: child,
                child_pid,
            },
        );
        if let Some(pid) = child_pid {
            self.terminal_pids.lock().unwrap().insert(terminal_id, pid);
        }

        Ok(())
    }

    pub fn write(&self, terminal_id: String, data: Vec<u8>) -> Result<(), String> {
        let sessions = self.sessions.lock().unwrap();
        let session = sessions.get(&terminal_id).ok_or("Terminal not found")?;
        let mut writer = session.writer.lock().unwrap();
        writer.write_all(&data).map_err(|e| format!("Write error: {}", e))?;
        writer.flush().map_err(|e| format!("Flush error: {}", e))?;
        Ok(())
    }

    pub fn resize(&self, terminal_id: String, cols: u16, rows: u16) -> Result<(), String> {
        let sessions = self.sessions.lock().unwrap();
        let session = sessions.get(&terminal_id).ok_or("Terminal not found")?;
        session._pair.master.resize(portable_pty::PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        }).map_err(|e| format!("Resize error: {}", e))?;
        Ok(())
    }

    pub fn get_cwd(&self, terminal_id: String) -> Result<String, String> {
        let sessions = self.sessions.lock().unwrap();
        let session = sessions.get(&terminal_id).ok_or("Terminal not found")?;
        let pid = session.child_pid.ok_or("No process ID")?;

        let mut system = System::new_all();
        system.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

        let process = system.process(Pid::from(pid as usize))
            .ok_or("Process not found")?;
        let cwd = process.cwd()
            .ok_or("Process cwd not available")?;
        cwd.to_str()
            .map(|s| s.to_string())
            .ok_or("Invalid cwd path".to_string())
    }

    pub fn kill(&self, terminal_id: String) -> Result<(), String> {
        let mut sessions = self.sessions.lock().unwrap();
        let session = sessions.remove(&terminal_id);
        self.terminal_pids.lock().unwrap().remove(&terminal_id);
        
        if let Some(session) = session {
            if let Some(root_pid) = session.child_pid {
                // Must drop locks before calling kill_process_tree to avoid deadlock
                drop(sessions);
                self.kill_process_tree(root_pid);
            }
        }
        Ok(())
    }

    pub fn get_terminal_root_pids(&self) -> Vec<u32> {
        let terminal_pids = self.terminal_pids.lock().unwrap();
        terminal_pids.values().copied().collect()
    }

    pub fn get_terminal_processes(&self) -> TerminalProcessTree {
        let terminal_pids = self.terminal_pids.lock().unwrap();
        if terminal_pids.is_empty() {
            return TerminalProcessTree {
                processes: Vec::new(),
                total_cpu: 0.0,
                total_memory_mb: 0,
            };
        }

        let mut system = System::new_all();
        system.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
        system.refresh_cpu_usage();

        let root_pids: HashSet<u32> = terminal_pids.values().copied().collect();
        let mut app_pids = root_pids.clone();

        let processes = system.processes();
        let mut changed = true;
        while changed {
            changed = false;
            for (pid, process) in processes {
                if app_pids.contains(&(pid.as_u32())) {
                    continue;
                }
                if let Some(parent) = process.parent() {
                    if app_pids.contains(&(parent.as_u32())) {
                        app_pids.insert(pid.as_u32());
                        changed = true;
                    }
                }
            }
        }

        let child_pids: Vec<u32> = app_pids.into_iter()
            .filter(|pid| !root_pids.contains(pid))
            .collect();

        let mut result = Vec::new();
        let mut total_cpu = 0.0f32;
        let mut total_memory_mb = 0u64;

        for pid in child_pids {
            if let Some(proc) = system.process(Pid::from(pid as usize)) {
                let name = proc.name().to_string_lossy().to_string();
                let cpu = proc.cpu_usage();
                let memory_mb = proc.memory() / 1024 / 1024;
                let cwd = proc.cwd()
                    .and_then(|p| p.to_str())
                    .unwrap_or("-")
                    .to_string();
                total_cpu += cpu;
                total_memory_mb += memory_mb;
                result.push(ProcessInfo {
                    pid,
                    name,
                    cpu,
                    memory_mb,
                    cwd,
                });
            }
        }
        result.sort_by(|a, b| a.pid.cmp(&b.pid));

        TerminalProcessTree {
            processes: result,
            total_cpu,
            total_memory_mb,
        }
    }
}

#[tauri::command]
pub fn create_terminal(
    app_handle: AppHandle,
    state: tauri::State<Arc<TerminalManager>>,
    terminal_id: String,
    shell: String,
    cwd: Option<String>,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    state.create_terminal(app_handle, terminal_id, shell, cwd, cols, rows)
}

#[tauri::command]
pub fn write_terminal(
    state: tauri::State<Arc<TerminalManager>>,
    terminal_id: String,
    data: Vec<u8>,
) -> Result<(), String> {
    state.write(terminal_id, data)
}

#[tauri::command]
pub fn resize_terminal(
    state: tauri::State<Arc<TerminalManager>>,
    terminal_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    state.resize(terminal_id, cols, rows)
}

#[tauri::command]
pub fn get_terminal_cwd(
    state: tauri::State<Arc<TerminalManager>>,
    terminal_id: String,
) -> Result<String, String> {
    state.get_cwd(terminal_id)
}

#[tauri::command]
pub fn get_terminal_processes(
    state: tauri::State<Arc<TerminalManager>>,
) -> TerminalProcessTree {
    state.get_terminal_processes()
}

#[tauri::command]
pub fn kill_terminal(
    state: tauri::State<Arc<TerminalManager>>,
    terminal_id: String,
) -> Result<(), String> {
    state.kill(terminal_id)
}
