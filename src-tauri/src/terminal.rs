use portable_pty::{CommandBuilder, NativePtySystem, PtySize, PtySystem};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, serde::Serialize)]
struct TerminalOutput {
    terminal_id: String,
    data: Vec<u8>,
}

pub struct TerminalSession {
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
}

pub struct TerminalManager {
    sessions: Arc<Mutex<HashMap<String, TerminalSession>>>,
}

impl TerminalManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
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

        let _child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("Failed to spawn shell: {}", e))?;

        let mut reader = pair.master.try_clone_reader()
            .map_err(|e| format!("Failed to clone reader: {}", e))?;
        let writer = Arc::new(Mutex::new(
            pair.master.take_writer()
                .map_err(|e| format!("Failed to take writer: {}", e))?,
        ));

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
        });

        self.sessions.lock().unwrap().insert(
            terminal_id, TerminalSession { writer });

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

    pub fn kill(&self, terminal_id: String) -> Result<(), String> {
        let mut sessions = self.sessions.lock().unwrap();
        sessions.remove(&terminal_id);
        Ok(())
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
pub fn kill_terminal(
    state: tauri::State<Arc<TerminalManager>>,
    terminal_id: String,
) -> Result<(), String> {
    state.kill(terminal_id)
}
