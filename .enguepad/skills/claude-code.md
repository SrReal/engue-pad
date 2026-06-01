---
name: engue
description: |
  EnguePad multi-instance communication skill. Use this skill whenever the user is working
  in a project that has an EnguePad instance open, or when they want to communicate with
  EnguePad (mascot events, previews, approvals). Automatically triggers for any task
  involving EnguePad integration, mascot control, or desktop editor coordination.
---

# Skill: EnguePad Multi-Instance Communication

EnguePad es un editor de código desktop (Tauri + Svelte) con mascota interactiva.
Este skill permite que Claude Code se comunique con la instancia de EnguePad
que tiene abierto el proyecto actual.

## Requisito previo

Asegurate de que `enguepad_cli` esté en PATH. La forma más fácil es instalarlo desde EnguePad (Settings → CLI → Install CLI to PATH). Alternativamente, compilalo con `cargo build --bin enguepad_cli`.

## Comandos disponibles

### Listar instancias activas
```bash
enguepad_cli instances
```

### Enviar eventos
```bash
enguepad_cli notify --event "mascot" --payload '{"state":"wave"}'
enguepad_cli preview http://localhost:5173
enguepad_cli mascot jump
```

### Solicitar aprobación del usuario
```bash
enguepad_cli approve "¿Ejecutar npm install?" --project "mi-proyecto"
```
- Muestra un diálogo modal en la instancia de EnguePad
- Timeout de 30 segundos por defecto
- Exit code: `0` si aprueba, `1` si rechaza o timeout

## Cuándo usar cada comando

- **notify** — Cuando querés que la mascota reaccione (ej. empezaste una tarea, terminaste, encontraste un error)
- **preview** — Cuando levantaste un servidor local y querés que el usuario lo vea dentro de EnguePad
- **mascot** — Para cambiar la animación de la mascota directamente (jump, wave, run, failed, etc.)
- **approve** — Antes de ejecutar cualquier comando destructivo (borrar archivos, instalar dependencias, push a git)

## Ejemplos de uso

```bash
# Al iniciar una tarea compleja
enguepad_cli mascot wave
enguepad_cli notify --event "mascot" --payload '{"state":"run"}'

# Al encontrar un error
enguepad_cli mascot failed

# Antes de un refactor arriesgado
enguepad_cli approve "¿Renombrar la carpeta src/core a src/engine?" --active
```

## Notas

- La resolución de destino es: `--instance` > `--workspace` > `--project` > `--active`
- Si no especificás destino, usa la instancia más reciente (`--active` implícito)
- La mascota tiene eventos semánticos mapeados: `iniciando_tarea`, `error`, `preview_abierto`, `approval_request`, etc.
