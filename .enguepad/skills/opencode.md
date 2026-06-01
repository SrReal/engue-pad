---
name: engue
description: |
  EnguePad multi-instance communication skill. Use whenever working with an EnguePad
  instance, sending mascot events, previews, or approval requests. Triggers for any
  task involving EnguePad integration, mascot control, or desktop editor coordination.
---

# Skill: EnguePad Multi-Instance Communication

EnguePad es un editor de código desktop (Tauri) con mascota interactiva y sistema de IPC.
Este skill permite que OpenCode se comunique con la instancia activa de EnguePad.

## Requisito previo

Asegurate de que `enguepad_cli` esté en PATH. Instalalo desde EnguePad (Settings → CLI → Install CLI to PATH) o compilalo con `cargo build --bin enguepad_cli`.

## Comandos principales

### Listar instancias
```bash
enguepad_cli instances
```

### Enviar eventos
```bash
enguepad_cli notify --event "mascot" --payload '{"state":"wave"}'
enguepad_cli preview http://localhost:5173
enguepad_cli mascot jump
```

### Solicitar aprobación
```bash
enguepad_cli approve "¿Ejecutar rm -rf?" --project "mi-proyecto"
```

## Flujo recomendado

1. Antes de cualquier acción destructiva → `enguepad_cli approve "mensaje"`
2. Al empezar tarea → `enguepad_cli mascot run`
3. Al terminar con éxito → `enguepad_cli mascot jump`
4. Al encontrar error → `enguepad_cli mascot failed`

## Estados de mascota

- `idle` — reposo
- `wave` — saludo
- `run` — trabajando
- `failed` — error
- `review` — revisando/atención
- `jump` — éxito
- `extra1`, `extra2` — extras

## Resolución de destino

Si no especificás destino, usa la instancia más reciente.
Prioridad explícita: `--instance` > `--workspace` > `--project` > `--active`

## Notas

- La mascota reacciona automáticamente a eventos semánticos (guardar archivo, abrir terminal, etc.)
- Las aprobaciones tienen timeout de 30s por defecto (`--timeout 60` para cambiar)
- Exit codes: `0` = approved, `1` = rejected o timeout
