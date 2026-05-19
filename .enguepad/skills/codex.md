# Skill: EnguePad Multi-Instance Communication

EnguePad es un editor de código desktop con mascota interactiva.
Este skill permite que Codex se comunique con la instancia activa de EnguePad
que tiene abierto el proyecto.

## Requisito previo

`enguepad_cli` debe estar en PATH. Se compila junto con la app Tauri.

## Comandos disponibles

### Ver instancias activas
```bash
enguepad_cli instances
```

### Enviar eventos a la instancia
```bash
enguepad_cli notify --event "mascot" --payload '{"state":"wave"}'
enguepad_cli preview http://localhost:5173
enguepad_cli mascot jump
```

### Solicitar aprobación antes de acciones destructivas
```bash
enguepad_cli approve "¿Ejecutar npm install?" --project "nombre-proyecto"
```
- Muestra diálogo modal en EnguePad
- Timeout 30s (configurable con `--timeout`)
- Exit code: `0` = aprobado, `1` = rechazado/timeout

## Reglas de uso

1. **Siempre** usar `approve` antes de:
   - Borrar archivos o carpetas
   - Instalar/desinstalar dependencias
   - Hacer push o force-push a git
   - Modificar configuraciones críticas

2. **Notify** para eventos de progreso:
   - `iniciando_tarea` → mascota reacciona
   - `error` → mascota muestra estado failed
   - `preview_abierto` → abre preview embebido

3. **Mascot** para control directo de animaciones:
   - Estados: idle, wave, run, failed, review, jump, extra1, extra2

## Ejemplos

```bash
# Al empezar refactor
enguepad_cli mascot run

# Al terminar tarea exitosamente
enguepad_cli mascot jump

# Antes de borrar archivos
enguepad_cli approve "¿Eliminar tests antiguos?" --active
```

## Resolución de destino

Prioridad: `--instance` > `--workspace` > `--project` > `--active`
