use std::collections::HashMap;
use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager};
use uuid::Uuid;

const HEARTBEAT_INTERVAL_SECS: u64 = 30;
const STALE_THRESHOLD_SECS: u64 = 90;
const RUNTIME_DIR: &str = "runtime";
const INSTANCES_FILE: &str = "instances.json";

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct InstanceInfo {
    pub instance_id: String,
    pub workspace_id: Option<String>,
    pub project_name: Option<String>,
    pub root_path: Option<String>,
    pub pid: u32,
    pub last_heartbeat: u64,
    pub ipc_address: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ExternalEvent {
    pub event: String,
    #[serde(default)]
    pub payload: serde_json::Value,
}

#[derive(Debug, Default, serde::Serialize, serde::Deserialize)]
struct InstancesFile {
    instances: HashMap<String, InstanceInfo>,
}

pub struct InstanceManager {
    data: Arc<Mutex<InstanceData>>,
}

struct InstanceData {
    instance_id: String,
    runtime_path: PathBuf,
    ipc_address: String,
}

impl InstanceManager {
    pub fn new(app_handle: AppHandle) -> Self {
        let instance_id = Uuid::new_v4().to_string();
        let data_dir = app_handle
            .path()
            .app_data_dir()
            .unwrap_or_else(|_| PathBuf::from("."));
        let runtime_path = data_dir.join(RUNTIME_DIR);
        let _ = fs::create_dir_all(&runtime_path);

        let ipc_address = Self::ipc_address(&instance_id, &runtime_path);

        let data = Arc::new(Mutex::new(InstanceData {
            instance_id: instance_id.clone(),
            runtime_path: runtime_path.clone(),
            ipc_address: ipc_address.clone(),
        }));

        let data_clone = Arc::clone(&data);
        std::thread::spawn(move || {
            let mut last_cleanup = 0u64;
            loop {
                std::thread::sleep(std::time::Duration::from_secs(HEARTBEAT_INTERVAL_SECS));

                let now = current_timestamp();
                let info = {
                    let d = data_clone.lock().unwrap();
                    InstanceInfo {
                        instance_id: d.instance_id.clone(),
                        workspace_id: None,
                        project_name: None,
                        root_path: None,
                        pid: std::process::id(),
                        last_heartbeat: now,
                        ipc_address: d.ipc_address.clone(),
                    }
                };

                if let Err(e) = Self::write_heartbeat(&runtime_path, &info) {
                    eprintln!("[instance] heartbeat write failed: {}", e);
                }

                if now.saturating_sub(last_cleanup) > STALE_THRESHOLD_SECS {
                    if let Err(e) = Self::cleanup_stale(&runtime_path) {
                        eprintln!("[instance] cleanup failed: {}", e);
                    }
                    last_cleanup = now;
                }
            }
        });

        Self { data }
    }

    pub fn start_ipc_server(&self, app_handle: AppHandle) {
        let d = self.data.lock().unwrap();
        let ipc_path = d.ipc_address.clone();
        drop(d);

        std::thread::spawn(move || {
            #[cfg(unix)]
            {
                use std::os::unix::net::UnixListener;
                let socket_path = PathBuf::from(&ipc_path);
                let _ = std::fs::remove_file(&socket_path);
                let listener = match UnixListener::bind(&socket_path) {
                    Ok(l) => l,
                    Err(e) => {
                        eprintln!("[ipc] failed to bind unix socket: {}", e);
                        return;
                    }
                };
                eprintln!("[ipc] listening on {}", socket_path.display());
                let app = app_handle.clone();
                for stream in listener.incoming() {
                    match stream {
                        Ok(stream) => {
                            let reader = BufReader::new(stream);
                            for line in reader.lines() {
                                if let Ok(line) = line {
                                    if line.trim().is_empty() {
                                        continue;
                                    }
                                    match serde_json::from_str::<ExternalEvent>(&line) {
                                        Ok(event) => {
                                            let _ = app.emit("external-event", event);
                                        }
                                        Err(e) => {
                                            eprintln!("[ipc] invalid json: {}", e);
                                        }
                                    }
                                }
                            }
                        }
                        Err(e) => {
                            eprintln!("[ipc] connection error: {}", e);
                        }
                    }
                }
            }

            #[cfg(windows)]
            {
                use std::os::windows::io::{FromRawHandle, IntoRawHandle, RawHandle};
                use std::ptr;
                use windows_sys::Win32::System::Pipes::CreateNamedPipeW;
                // Simplified: on Windows we use a local TCP port since named pipes require unsafe Win32 API
                let port = Self::parse_port_from_ipc(&ipc_path);
                let listener = match std::net::TcpListener::bind(format!("127.0.0.1:{}", port)) {
                    Ok(l) => l,
                    Err(e) => {
                        eprintln!("[ipc] failed to bind tcp: {}", e);
                        return;
                    }
                };
                eprintln!("[ipc] listening on 127.0.0.1:{}", port);
                let app = app_handle.clone();
                for stream in listener.incoming() {
                    match stream {
                        Ok(stream) => {
                            let reader = BufReader::new(stream);
                            for line in reader.lines() {
                                if let Ok(line) = line {
                                    if line.trim().is_empty() {
                                        continue;
                                    }
                                    match serde_json::from_str::<ExternalEvent>(&line) {
                                        Ok(event) => {
                                            let _ = app.emit("external-event", event);
                                        }
                                        Err(e) => {
                                            eprintln!("[ipc] invalid json: {}", e);
                                        }
                                    }
                                }
                            }
                        }
                        Err(e) => {
                            eprintln!("[ipc] connection error: {}", e);
                        }
                    }
                }
            }
        });
    }

    pub fn set_workspace(&self, workspace_id: String, project_name: String, root_path: String) {
        let d = self.data.lock().unwrap();
        let now = current_timestamp();
        let info = InstanceInfo {
            instance_id: d.instance_id.clone(),
            workspace_id: Some(workspace_id),
            project_name: Some(project_name),
            root_path: Some(root_path),
            pid: std::process::id(),
            last_heartbeat: now,
            ipc_address: d.ipc_address.clone(),
        };
        let _ = Self::write_heartbeat(&d.runtime_path, &info);
    }

    pub fn instance_id(&self) -> String {
        self.data.lock().unwrap().instance_id.clone()
    }

    fn ipc_address(instance_id: &str, _runtime_path: &PathBuf) -> String {
        #[cfg(unix)]
        {
            let hash = &instance_id[..8];
            format!("/tmp/enguepad-{}.sock", hash)
        }
        #[cfg(windows)]
        {
            let hash = &instance_id[..8];
            let port = 50000u16 + hash.chars().map(|c| c as u16).sum::<u16>() % 10000;
            format!("127.0.0.1:{}", port)
        }
    }

    #[cfg(windows)]
    fn parse_port_from_ipc(ipc: &str) -> u16 {
        ipc.split(':').nth(1).and_then(|s| s.parse().ok()).unwrap_or(50000)
    }

    fn write_heartbeat(runtime_path: &PathBuf, info: &InstanceInfo) -> Result<(), String> {
        let file_path = runtime_path.join(INSTANCES_FILE);
        let mut file = Self::read_instances_file(&file_path)?;
        file.instances.insert(info.instance_id.clone(), info.clone());
        Self::write_instances_file(&file_path, &file)?;
        Ok(())
    }

    fn cleanup_stale(runtime_path: &PathBuf) -> Result<(), String> {
        let file_path = runtime_path.join(INSTANCES_FILE);
        let mut file = Self::read_instances_file(&file_path)?;
        let now = current_timestamp();
        let before = file.instances.len();
        file.instances.retain(|_, info| {
            let mut alive = now.saturating_sub(info.last_heartbeat) < STALE_THRESHOLD_SECS;
            if !alive {
                let sys = sysinfo::System::new_all();
                alive = sys.process(sysinfo::Pid::from(info.pid as usize)).is_some();
            }
            alive
        });
        let after = file.instances.len();
        if before != after {
            Self::write_instances_file(&file_path, &file)?;
        }
        Ok(())
    }

    fn read_instances_file(path: &PathBuf) -> Result<InstancesFile, String> {
        if !path.exists() {
            return Ok(InstancesFile::default());
        }
        let raw = fs::read_to_string(path).map_err(|e| format!("Read failed: {}", e))?;
        serde_json::from_str(&raw).map_err(|e| format!("Parse failed: {}", e))
    }

    fn write_instances_file(path: &PathBuf, file: &InstancesFile) -> Result<(), String> {
        let raw = serde_json::to_string_pretty(file).map_err(|e| format!("Serialize failed: {}", e))?;
        fs::write(path, raw).map_err(|e| format!("Write failed: {}", e))
    }
}

fn current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

#[tauri::command]
pub fn get_instance_info(state: tauri::State<Arc<InstanceManager>>) -> Result<InstanceInfo, String> {
    let manager = state.inner();
    let id = manager.instance_id();
    let file_path = {
        let d = manager.data.lock().unwrap();
        d.runtime_path.join(INSTANCES_FILE)
    };
    let file = InstanceManager::read_instances_file(&file_path)?;
    file.instances
        .get(&id)
        .cloned()
        .ok_or_else(|| "Instance not registered".to_string())
}

#[tauri::command]
pub fn list_instances(state: tauri::State<Arc<InstanceManager>>) -> Result<Vec<InstanceInfo>, String> {
    let manager = state.inner();
    let file_path = {
        let d = manager.data.lock().unwrap();
        d.runtime_path.join(INSTANCES_FILE)
    };
    InstanceManager::cleanup_stale(&{
        let d = manager.data.lock().unwrap();
        d.runtime_path.clone()
    }).ok();
    let file = InstanceManager::read_instances_file(&file_path)?;
    Ok(file.instances.values().cloned().collect())
}

#[tauri::command]
pub fn set_instance_workspace(
    state: tauri::State<Arc<InstanceManager>>,
    workspace_id: String,
    project_name: String,
    root_path: String,
) -> Result<(), String> {
    state.set_workspace(workspace_id, project_name, root_path);
    Ok(())
}

#[tauri::command]
pub fn send_event_to_instance(
    ipc_address: String,
    event: String,
    payload: serde_json::Value,
) -> Result<(), String> {
    let message = serde_json::to_string(&ExternalEvent { event, payload })
        .map_err(|e| format!("Serialize failed: {}", e))?;

    #[cfg(unix)]
    {
        use std::os::unix::net::UnixStream;
        let mut stream = UnixStream::connect(&ipc_address)
            .map_err(|e| format!("Connect failed: {}", e))?;
        stream.write_all(message.as_bytes()).map_err(|e| format!("Write failed: {}", e))?;
        stream.write_all(b"\n").map_err(|e| format!("Write failed: {}", e))?;
    }

    #[cfg(windows)]
    {
        use std::io::Write;
        let mut stream = std::net::TcpStream::connect(&ipc_address)
            .map_err(|e| format!("Connect failed: {}", e))?;
        stream.write_all(message.as_bytes()).map_err(|e| format!("Write failed: {}", e))?;
        stream.write_all(b"\n").map_err(|e| format!("Write failed: {}", e))?;
    }

    Ok(())
}
