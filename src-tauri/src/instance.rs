use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};
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

        let data = Arc::new(Mutex::new(InstanceData {
            instance_id: instance_id.clone(),
            runtime_path: runtime_path.clone(),
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
        };
        let _ = Self::write_heartbeat(&d.runtime_path, &info);
    }

    pub fn instance_id(&self) -> String {
        self.data.lock().unwrap().instance_id.clone()
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
