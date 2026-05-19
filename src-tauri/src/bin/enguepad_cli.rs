use clap::{Parser, Subcommand};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::Write;
use std::path::PathBuf;
use std::process::Stdio;
use std::time::Duration;

const INSTANCES_FILE: &str = "runtime/instances.json";
const APPROVALS_DIR: &str = "runtime/approvals";

#[derive(Debug, Serialize, Deserialize, Clone)]
struct InstanceInfo {
    instance_id: String,
    workspace_id: Option<String>,
    project_name: Option<String>,
    root_path: Option<String>,
    pid: u32,
    last_heartbeat: u64,
    #[serde(default)]
    ipc_address: String,
}

#[derive(Debug, Default, Serialize, Deserialize)]
struct InstancesFile {
    instances: HashMap<String, InstanceInfo>,
}

#[derive(Debug, Serialize)]
struct ExternalEvent {
    event: String,
    #[serde(default)]
    payload: serde_json::Value,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct ApprovalResponseData {
    approved: bool,
    responded_at: u64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct ApprovalRequestFile {
    request_id: String,
    message: String,
    timestamp: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    response: Option<ApprovalResponseData>,
}

#[derive(Parser)]
#[command(name = "enguepad")]
#[command(about = "CLI for EnguePad multi-instance communication")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// List active EnguePad instances
    Instances,
    /// Open the EnguePad app (launches new instance if not running)
    Open {
        /// Run in dev mode (npm run tauri dev) from current directory
        #[arg(long)]
        dev: bool,
    },
    /// Send an event to one or more instances
    Notify {
        /// Event name to send
        #[arg(short, long)]
        event: String,
        /// JSON payload
        #[arg(short, long, default_value = "{}")]
        payload: String,
        /// Target specific instance by ID
        #[arg(long)]
        instance: Option<String>,
        /// Target instance by workspace ID
        #[arg(long)]
        workspace: Option<String>,
        /// Target instance by project name
        #[arg(long)]
        project: Option<String>,
        /// Target the most recently active instance (default if no other filter)
        #[arg(long)]
        active: bool,
    },
    /// Open a preview URL in an instance
    Preview {
        /// URL to open
        url: String,
        /// Target specific instance by ID
        #[arg(long)]
        instance: Option<String>,
        /// Target instance by workspace ID
        #[arg(long)]
        workspace: Option<String>,
        /// Target instance by project name
        #[arg(long)]
        project: Option<String>,
        /// Target the most recently active instance
        #[arg(long)]
        active: bool,
    },
    /// Change mascot state in an instance
    Mascot {
        /// Mascot state (e.g., idle, jump, run, wave)
        state: String,
        /// Target specific instance by ID
        #[arg(long)]
        instance: Option<String>,
        /// Target instance by workspace ID
        #[arg(long)]
        workspace: Option<String>,
        /// Target instance by project name
        #[arg(long)]
        project: Option<String>,
        /// Target the most recently active instance
        #[arg(long)]
        active: bool,
    },
    /// Request user approval from an instance
    Approve {
        /// Approval message to show
        message: String,
        /// Target specific instance by ID
        #[arg(long)]
        instance: Option<String>,
        /// Target instance by workspace ID
        #[arg(long)]
        workspace: Option<String>,
        /// Target instance by project name
        #[arg(long)]
        project: Option<String>,
        /// Target the most recently active instance
        #[arg(long)]
        active: bool,
        /// Timeout in seconds (default: 30)
        #[arg(long, default_value = "30")]
        timeout: u64,
    },
}

fn app_data_dir() -> Option<PathBuf> {
    let dir = dirs::data_dir()?;
    Some(dir.join("com.srreal.enguepad"))
}

fn read_instances() -> Result<InstancesFile, String> {
    let data_dir = app_data_dir().ok_or("Failed to determine app data directory")?;
    let path = data_dir.join(INSTANCES_FILE);
    if !path.exists() {
        return Ok(InstancesFile::default());
    }
    let raw = std::fs::read_to_string(&path).map_err(|e| format!("Read failed: {}", e))?;
    serde_json::from_str(&raw).map_err(|e| format!("Parse failed: {}", e))
}

fn resolve_target<'a>(
    instances: &'a HashMap<String, InstanceInfo>,
    instance: &Option<String>,
    workspace: &Option<String>,
    project: &Option<String>,
    _active: bool,
) -> Result<Vec<&'a InstanceInfo>, String> {
    let mut matches: Vec<&InstanceInfo> = Vec::new();

    if let Some(id) = instance {
        if let Some(info) = instances.get(id) {
            matches.push(info);
        }
        if matches.is_empty() {
            return Err(format!("Instance '{}' not found", id));
        }
        return Ok(matches);
    }

    if let Some(ws) = workspace {
        matches = instances
            .values()
            .filter(|i| i.workspace_id.as_ref() == Some(ws))
            .collect();
        if matches.is_empty() {
            return Err(format!("No instance with workspace '{}' found", ws));
        }
        return Ok(matches);
    }

    if let Some(proj) = project {
        matches = instances
            .values()
            .filter(|i| i.project_name.as_ref() == Some(proj))
            .collect();
        if matches.is_empty() {
            return Err(format!("No instance with project '{}' found", proj));
        }
        return Ok(matches);
    }

    // --active or default: pick the most recent heartbeat
    let mut candidates: Vec<&InstanceInfo> = instances.values().collect();
    candidates.sort_by_key(|i| std::cmp::Reverse(i.last_heartbeat));
    if let Some(first) = candidates.into_iter().next() {
        matches.push(first);
    }
    if matches.is_empty() {
        return Err("No active instances found".to_string());
    }
    Ok(matches)
}

fn project_root() -> PathBuf {
    let mut cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    if cwd.file_name().map(|n| n == "src-tauri").unwrap_or(false) {
        if let Some(parent) = cwd.parent() {
            cwd = parent.to_path_buf();
        }
    }
    cwd
}

fn find_npm() -> Option<PathBuf> {
    if let Ok(path) = std::env::var("PATH") {
        for dir in path.split(':') {
            let candidate = PathBuf::from(dir).join("npm");
            if candidate.exists() {
                return Some(candidate);
            }
        }
    }
    for p in ["/opt/homebrew/bin/npm", "/usr/local/bin/npm", "/usr/bin/npm"] {
        let candidate = PathBuf::from(p);
        if candidate.exists() {
            return Some(candidate);
        }
    }
    None
}

fn open_app(dev: bool) -> Result<(), String> {
    let cwd = project_root();

    if dev {
        let npm = find_npm().ok_or("npm not found in PATH. Install Node.js and ensure npm is available.")?;
        let mut path_env = std::env::var("PATH").unwrap_or_default();
        // Ensure cargo is on PATH for tauri dev
        let cargo_in_path = path_env.split(':').any(|dir| PathBuf::from(dir).join("cargo").exists());
        if !cargo_in_path {
            let home = std::env::var("HOME").unwrap_or_default();
            let cargo_bin = PathBuf::from(&home).join(".cargo/bin");
            if cargo_bin.exists() {
                if !path_env.is_empty() {
                    path_env.push(':');
                }
                path_env.push_str(&cargo_bin.to_string_lossy());
            }
        }
        println!("Starting dev server from {} ...", cwd.display());
        #[cfg(unix)]
        {
            use std::os::unix::process::CommandExt;
            let err = std::process::Command::new(&npm)
                .args(["run", "tauri", "dev"])
                .current_dir(&cwd)
                .env("PATH", &path_env)
                .exec();
            return Err(format!("Failed to exec npm run tauri dev: {}", err));
        }
        #[cfg(windows)]
        {
            let status = std::process::Command::new(&npm)
                .args(["run", "tauri", "dev"])
                .current_dir(&cwd)
                .env("PATH", std::env::var("PATH").unwrap_or_default())
                .stdin(Stdio::inherit())
                .stdout(Stdio::inherit())
                .stderr(Stdio::inherit())
                .status()
                .map_err(|e| format!("Failed to run npm run tauri dev: {}", e))?;
            if !status.success() {
                return Err(format!("npm run tauri dev exited with code {:?}", status.code()));
            }
            return Ok(());
        }
    }

    #[cfg(target_os = "macos")]
    {
        let candidates = [
            cwd.join("src-tauri/target/debug/EnguePad.app"),
            cwd.join("src-tauri/target/release/EnguePad.app"),
            cwd.join("target/debug/EnguePad.app"),
            cwd.join("target/release/EnguePad.app"),
        ];
        for path in &candidates {
            if path.exists() {
                let _ = std::process::Command::new("open")
                    .arg(path)
                    .spawn()
                    .map_err(|e| format!("Failed to open app: {}", e))?;
                println!("Launched {}", path.display());
                return Ok(());
            }
        }
        let _ = std::process::Command::new("open")
            .args(["-a", "EnguePad"])
            .spawn()
            .map_err(|e| format!("Failed to open EnguePad via open -a: {}", e))?;
        println!("Launched EnguePad via open -a");
        return Ok(());
    }

    #[cfg(target_os = "windows")]
    {
        let candidates = [
            cwd.join("src-tauri/target/debug/EnguePad.exe"),
            cwd.join("src-tauri/target/release/EnguePad.exe"),
            cwd.join("target/debug/EnguePad.exe"),
            cwd.join("target/release/EnguePad.exe"),
        ];
        for path in &candidates {
            if path.exists() {
                let _ = std::process::Command::new(path)
                    .spawn()
                    .map_err(|e| format!("Failed to launch app: {}", e))?;
                println!("Launched {}", path.display());
                return Ok(());
            }
        }
        let _ = std::process::Command::new("cmd")
            .args(["/C", "start", "EnguePad"])
            .spawn()
            .map_err(|e| format!("Failed to start EnguePad: {}", e))?;
        println!("Launched EnguePad");
        return Ok(());
    }

    #[cfg(target_os = "linux")]
    {
        let candidates = [
            cwd.join("src-tauri/target/debug/enguepad"),
            cwd.join("src-tauri/target/release/enguepad"),
            cwd.join("target/debug/enguepad"),
            cwd.join("target/release/enguepad"),
        ];
        for path in &candidates {
            if path.exists() {
                let _ = std::process::Command::new(path)
                    .spawn()
                    .map_err(|e| format!("Failed to launch app: {}", e))?;
                println!("Launched {}", path.display());
                return Ok(());
            }
        }
        let _ = std::process::Command::new("enguepad")
            .spawn()
            .map_err(|e| format!("Failed to start EnguePad: {}", e))?;
        println!("Launched EnguePad");
        return Ok(());
    }
}

fn send_event(ipc_address: &str, event: &ExternalEvent) -> Result<(), String> {
    let message = serde_json::to_string(event).map_err(|e| format!("Serialize failed: {}", e))?;

    #[cfg(unix)]
    {
        use std::os::unix::net::UnixStream;
        let mut stream =
            UnixStream::connect(ipc_address).map_err(|e| format!("Connect failed: {}", e))?;
        stream
            .write_all(message.as_bytes())
            .map_err(|e| format!("Write failed: {}", e))?;
        stream
            .write_all(b"\n")
            .map_err(|e| format!("Write failed: {}", e))?;
    }

    #[cfg(windows)]
    {
        let mut stream = std::net::TcpStream::connect(ipc_address)
            .map_err(|e| format!("Connect failed: {}", e))?;
        stream
            .write_all(message.as_bytes())
            .map_err(|e| format!("Write failed: {}", e))?;
        stream
            .write_all(b"\n")
            .map_err(|e| format!("Write failed: {}", e))?;
    }

    Ok(())
}

fn read_approval_response(request_id: &str) -> Result<Option<ApprovalResponseData>, String> {
    let data_dir = app_data_dir().ok_or("Failed to determine app data directory")?;
    let path = data_dir.join(APPROVALS_DIR).join(format!("{}.json", request_id));
    if !path.exists() {
        return Ok(None);
    }
    let raw = std::fs::read_to_string(&path).map_err(|e| format!("Read failed: {}", e))?;
    let req: ApprovalRequestFile = serde_json::from_str(&raw).map_err(|e| format!("Parse failed: {}", e))?;
    Ok(req.response)
}

fn poll_approval_response(request_id: &str, timeout_secs: u64) -> Result<bool, String> {
    let start = std::time::Instant::now();
    let timeout = Duration::from_secs(timeout_secs);
    loop {
        if start.elapsed() > timeout {
            return Err("Approval request timed out".to_string());
        }
        match read_approval_response(request_id)? {
            Some(resp) => return Ok(resp.approved),
            None => std::thread::sleep(Duration::from_millis(500)),
        }
    }
}

fn main() {
    let cli = Cli::parse();

    let file = match read_instances() {
        Ok(f) => f,
        Err(e) => {
            eprintln!("Error reading instances: {}", e);
            std::process::exit(1);
        }
    };

    match cli.command {
        Commands::Open { dev } => {
            if let Err(e) = open_app(dev) {
                eprintln!("{}", e);
                std::process::exit(1);
            }
        }
        Commands::Instances => {
            if file.instances.is_empty() {
                println!("No active instances. Run `enguepad open` to start one.");
                return;
            }
            let mut list: Vec<&InstanceInfo> = file.instances.values().collect();
            list.sort_by_key(|i| std::cmp::Reverse(i.last_heartbeat));
            println!("{:<40} {:<12} {:<20} {:<30} {}", "Instance ID", "PID", "Workspace", "Project", "IPC Address");
            for info in list {
                let ws = info.workspace_id.as_deref().unwrap_or("-");
                let proj = info.project_name.as_deref().unwrap_or("-");
                println!(
                    "{:<40} {:<12} {:<20} {:<30} {}",
                    info.instance_id, info.pid, ws, proj, info.ipc_address
                );
            }
        }
        Commands::Notify {
            event,
            payload,
            instance,
            workspace,
            project,
            active,
        } => {
            let payload_json: serde_json::Value =
                serde_json::from_str(&payload).unwrap_or(serde_json::Value::Object(Default::default()));
            let ev = ExternalEvent { event, payload: payload_json };

            let targets = match resolve_target(&file.instances, &instance, &workspace, &project, active) {
                Ok(t) => t,
                Err(e) => {
                    eprintln!("{}", e);
                    std::process::exit(1);
                }
            };

            for target in targets {
                if let Err(e) = send_event(&target.ipc_address, &ev) {
                    eprintln!("Failed to notify instance {}: {}", target.instance_id, e);
                } else {
                    println!("Sent '{}' to instance {}", ev.event, target.instance_id);
                }
            }
        }
        Commands::Preview {
            url,
            instance,
            workspace,
            project,
            active,
        } => {
            let ev = ExternalEvent {
                event: "open_preview".to_string(),
                payload: serde_json::json!({ "url": url }),
            };
            let targets = match resolve_target(&file.instances, &instance, &workspace, &project, active) {
                Ok(t) => t,
                Err(e) => {
                    eprintln!("{}", e);
                    std::process::exit(1);
                }
            };
            for target in targets {
                if let Err(e) = send_event(&target.ipc_address, &ev) {
                    eprintln!("Failed to send preview to instance {}: {}", target.instance_id, e);
                } else {
                    println!("Sent preview '{}' to instance {}", url, target.instance_id);
                }
            }
        }
        Commands::Mascot {
            state,
            instance,
            workspace,
            project,
            active,
        } => {
            let ev = ExternalEvent {
                event: "mascot".to_string(),
                payload: serde_json::json!({ "state": state }),
            };
            let targets = match resolve_target(&file.instances, &instance, &workspace, &project, active) {
                Ok(t) => t,
                Err(e) => {
                    eprintln!("{}", e);
                    std::process::exit(1);
                }
            };
            for target in targets {
                if let Err(e) = send_event(&target.ipc_address, &ev) {
                    eprintln!("Failed to send mascot event to instance {}: {}", target.instance_id, e);
                } else {
                    println!("Sent mascot state '{}' to instance {}", state, target.instance_id);
                }
            }
        }
        Commands::Approve {
            message,
            instance,
            workspace,
            project,
            active,
            timeout,
        } => {
            let request_id = uuid::Uuid::new_v4().to_string();
            let ev = ExternalEvent {
                event: "approval_request".to_string(),
                payload: serde_json::json!({ "request_id": request_id, "message": message }),
            };
            let targets = match resolve_target(&file.instances, &instance, &workspace, &project, active) {
                Ok(t) => t,
                Err(e) => {
                    eprintln!("{}", e);
                    std::process::exit(1);
                }
            };
            for target in targets {
                if let Err(e) = send_event(&target.ipc_address, &ev) {
                    eprintln!("Failed to send approval request to instance {}: {}", target.instance_id, e);
                    std::process::exit(1);
                } else {
                    println!("Waiting for approval from instance {}... (timeout: {}s)", target.instance_id, timeout);
                    match poll_approval_response(&request_id, timeout) {
                        Ok(true) => {
                            println!("Approved");
                            std::process::exit(0);
                        }
                        Ok(false) => {
                            println!("Rejected");
                            std::process::exit(1);
                        }
                        Err(e) => {
                            eprintln!("{}", e);
                            std::process::exit(1);
                        }
                    }
                }
            }
        }
    }
}
