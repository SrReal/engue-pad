# Engue Pad — Roadmap

Roadmap detallado del proyecto. Cada fase entrega valor usable. Los checkboxes se marcan (`[x]`) a medida que se completan.

---

## Fase 1 — MVP (Editor + Árbol + Workspace)

Objetivo: abrir un proyecto, navegar archivos, editar con pestañas y persistir layout básico.

### 1.1 Scaffolding y configuración del proyecto

- [x] Inicializar proyecto Tauri v2 con plantilla Svelte 5 + TypeScript.
- [x] Configurar `vite.config.ts`, `tsconfig.json` y estructura de carpetas (`src/`, `src-tauri/`).
- [x] Configurar Rust toolchain (fmt, clippy) y frontend lint (ESLint + Prettier).
- [x] Crear script de desarrollo (`npm run tauri dev`) y build (`npm run tauri build`).

### 1.2 Ventana principal y layout base

- [x] Crear ventana principal de Tauri con tamaño y posición restaurables.
- [x] Implementar layout base: sidebar izquierda + área principal con sistema de splits.
- [x] Sistema de paneles/splits: horizontal y vertical.
- [x] Soporte de arrastre de pestañas entre splits.
- [x] Serializar y deserializar layout básico.

### 1.3 Árbol de archivos

- [x] Comando Tauri para listar directorios con filtros de ignore (`.git`, `node_modules`).
- [x] Componente Svelte de árbol de archivos con carga lazy por nivel.
- [x] Soporte de expandir/contraer carpetas.
- [x] Click para abrir archivo en pestaña.
- [x] Menú contextual básico: abrir, copiar ruta.
- [ ] Watcher de cambios en filesystem (crear/eliminar/renombrar) y refresco selectivo.

### 1.4 Editor de archivos

- [x] Integrar CodeMirror 6 en componente Svelte.
- [x] Soporte de resaltado de sintaxis para JS, TS, JSON, HTML, CSS, Markdown, Python.
- [x] Abrir archivo desde árbol en pestaña del editor.
- [x] Guardar archivo (`Ctrl+S`) con comando Tauri de escritura.
- [x] Indicador de cambios sin guardar (dot en pestaña).
- [ ] Búsqueda y reemplazo en archivo.
- [x] Números de línea y detección básica de fin de línea.
- [x] Soporte de múltiples pestañas de editor.

### 1.5 Workspace básico

- [x] Crear `.enguepad/` al abrir carpeta por primera vez.
- [x] Generar `workspaceId` (UUID) y guardar en `workspace.json`.
- [x] Persistir pestañas abiertas (rutas relativas, archivo activo).
- [x] Persistir layout básico (splits, tamaños).
- [x] Restaurar pestañas y layout al reabrir proyecto.
- [x] Comando Tauri para abrir carpeta de proyecto (`dialog::open`).

### 1.6 Status bar

- [x] Barra de estado inferior con información básica: ruta del archivo activo, encoding, fin de línea.

### Criterios de aceptación (test manual)

```text
1. Abrir carpeta de proyecto crea .enguepad/workspace.json.
2. El árbol de archivos se muestra y permite navegar.
3. Abrir archivo crea pestaña de editor.
4. Guardar archivo escribe cambios en disco.
5. Cerrar y reabrir proyecto restaura pestañas y layout.
6. El layout permite splits horizontales y verticales.
```

> **¿Querés incluir tests automatizados en esta fase?**

---

## Fase 2 — Terminales y Preview

Objetivo: terminales integradas con PTY y preview web dentro del layout.

### 2.1 Backend de terminal (Rust)

- [ ] Investigar e integrar crate de PTY compatible con Windows (ConPTY) y Unix.
- [ ] Comando Tauri para crear proceso de shell (PowerShell / bash / zsh).
- [ ] Pipe bidireccional: stdin del proceso desde frontend, stdout/stderr hacia frontend.
- [ ] Manejo de procesos: crear, matar, verificar estado.

### 2.2 Terminal en frontend

- [ ] Integrar xterm.js en componente Svelte.
- [ ] Conectar xterm.js con backend PTY vía Tauri events/commands.
- [ ] Soporte de múltiples terminales en pestañas.
- [ ] Soporte de splits verticales/horizontales con terminales.
- [ ] Renombrar terminal.
- [ ] Guardar y restaurar terminales en workspace (id, título, shell, cwd, restore).

### 2.3 Detección de URLs

- [ ] Parsear salida de terminal buscando URLs locales (`http://localhost:`).
- [ ] Mostrar toast/sugerencia para abrir preview.
- [ ] Evento interno `terminal.output.url_detected`.

### 2.4 Preview web

- [ ] Componente de preview embebido (iframe o webview).
- [ ] Abrir URL manual o desde detección de terminal.
- [ ] Refrescar preview.
- [ ] Abrir en navegador externo.
- [ ] Guardar previews configurados en workspace.

### 2.5 Layout avanzado

- [ ] Tabs de terminales y previews integrados en el sistema de splits.
- [ ] Mover pestaña de terminal/preview entre splits.
- [ ] Maximizar/restaurar panel.

### Criterios de aceptación (test manual)

```text
1. Nueva terminal abre shell configurado.
2. Escribir en terminal ejecuta comandos reales.
3. Salida de terminal muestra URLs detectadas.
4. Preview abre URL en panel embebido.
5. Layout con terminal + editor + preview funciona simultáneamente.
6. Cerrar y reabrir proyecto restaura terminales en sus rutas.
```

> **¿Querés incluir tests automatizados en esta fase?**

---

## Fase 3 — Linting, Git básico, TODO y refinamiento

Objetivo: linting ligero, indicadores git, panel de tareas y pulido de rendimiento.

### 3.1 Linting ligero

- [ ] Sistema de adaptadores de linter: ejecutar comando externo, parsear salida.
- [ ] Adaptador para TypeScript/JavaScript (eslint o biome).
- [ ] Adaptador para Python (ruff).
- [ ] Adaptador para PowerShell (PSScriptAnalyzer).
- [ ] Ejecutar lint al guardar archivo (configurable).
- [ ] Mostrar errores en panel de problemas.
- [ ] Mostrar diagnósticos en editor (subrayado/warnings de CodeMirror).
- [ ] Configuración de linters en `workspace.json`.

### 3.2 Git básico en árbol de archivos

- [ ] Detectar si el proyecto es un repositorio git.
- [ ] Mostrar nombre de branch actual en status bar.
- [ ] Mostrar indicadores de cambio en archivos del árbol (modificado, nuevo, sin seguimiento).
- [ ] Refresco de estado git periódico o bajo demanda.

### 3.3 Panel de tareas (TODO)

- [ ] Crear `.enguepad/todo.md` con template por defecto si no existe.
- [ ] Parser de markdown: extraer checkboxes y agrupaciones por headers (`##`).
- [ ] Componente Svelte de panel de tareas: lista interactiva con checkboxes.
- [ ] Sincronización bidireccional: click en checkbox actualiza fichero; editar fichero actualiza panel.
- [ ] Panel se ubica como split horizontal o vertical dentro del layout.
- [ ] No mostrar markdown crudo por defecto (renderizado interactivo).
- [ ] Watcher de `todo.md` para refresco en tiempo real.

### 3.4 Status bar — contador de tareas

- [ ] Parsear `todo.md` al abrir proyecto.
- [ ] Mostrar contador `TODO: X/Y` en status bar.
- [ ] Actualizar contador en tiempo real al modificar tareas.

### 3.5 Refinamiento y rendimiento

- [ ] Optimizar carga lazy del árbol de archivos en proyectos grandes.
- [ ] Debounce en watcher de filesystem.
- [ ] Revisar consumo de memoria con múltiples pestañas abiertas.
- [ ] Ajustes de UX: atajos de teclado, focus management, scroll restoration.

### Criterios de aceptación (test manual)

```text
1. Guardar archivo con errores muestra diagnósticos en panel de problemas.
2. Status bar muestra branch git actual.
3. Archivos modificados en git muestran indicador visual en el árbol.
4. Panel de tareas muestra checkboxes agrupados por apartados.
5. Marcar checkbox en panel actualiza todo.md en disco.
6. Status bar refleja conteo correcto de tareas pendientes.
```

> **¿Querés incluir tests automatizados en esta fase?**

---

## Fase 4 — Mascota

Objetivo: mascota visual configurable reactiva a eventos internos.

### 4.1 Estructura de mascota

- [ ] Definir formato `mascot.json` (estados, animaciones, voces, eventos).
- [ ] Carpeta de mascotas global: `%APPDATA%/EnguePad/mascots/` (Windows), `~/Library/Application Support/EnguePad/mascots/` (macOS), `~/.config/enguepad/mascots/` (Linux).
- [ ] Carpeta de mascota por proyecto: `.enguepad/mascot/`.
- [ ] Cargar perfil de mascota según prioridad: proyecto > global > default.

### 4.2 Motor de mascota

- [ ] Sistema de estados: idle, working, thinking, success, warning, error, waiting, etc.
- [ ] Transiciones de estado basadas en eventos del Event Bus.
- [ ] Renderizado de avatar en panel dedicado (compact / animated / disabled).

### 4.3 Animaciones

- [ ] Cargar definiciones de animación desde `animations/*.json`.
- [ ] Modo compacto: avatar estático o animación mínima.
- [ ] Modo animated: animaciones completas.
- [ ] No cargar animaciones si modo es disabled.

### 4.4 Voces pregrabadas

- [ ] Soporte de audio mp3/ogg/wav.
- [ ] Reproducir voz asociada a estado/evento.
- [ ] Controles: activar/desactivar, volumen, idioma.
- [ ] No reproducir en bucle ni interrumpir constantemente.

### 4.5 Eventos internos mapeados

- [ ] Mapear eventos del Event Bus a reacciones de mascota:
  - `terminal.command.started` → working
  - `terminal.command.failed` → error
  - `file.saved` → success
  - `lint.errors.found` → warning
- [ ] Configuración de mapeo editable en `mascot.json`.

### Criterios de aceptación (test manual)

```text
1. Abrir proyecto carga mascota configurada.
2. Ejecutar comando en terminal cambia estado de mascota a working.
3. Error en terminal cambia estado a error con animación correspondiente.
4. Guardar archivo cambia estado a success.
5. El panel de mascota se puede ocultar/mostrar.
6. Modo disabled no carga recursos de animación ni audio.
```

> **¿Querés incluir tests automatizados en esta fase?**

---

## Fase 5 — Comunicación multi-instancia

Objetivo: registrar instancias, CLI local y IPC para agentes externos.

### 5.1 Registro de instancias

- [ ] Generar `instanceId` al arrancar (UUID + timestamp).
- [ ] Crear registro en carpeta de runtime: `runtime/instances.json`.
- [ ] Heartbeat periódico desde cada instancia.
- [ ] Limpiar registros muertos (proceso inexistente o heartbeat caducado).
- [ ] Exponer información: instanceId, workspaceId, projectName, rootPath, pid, IPC address.

### 5.2 IPC local por instancia

- [ ] Windows: named pipe por instancia.
- [ ] Linux/macOS: Unix domain socket por instancia.
- [ ] Canal de escucha en Rust que recibe eventos externos.
- [ ] Validar payload y emitir eventos internos al Event Bus.

### 5.3 CLI `enguepad`

- [ ] Comando `enguepad instances`: listar instancias activas.
- [ ] Comando `enguepad notify`: enviar evento a instancia/workspace/proyecto.
- [ ] Comando `enguepad preview`: abrir preview en instancia destino.
- [ ] Comando `enguepad mascot`: cambiar estado de mascota.
- [ ] Resolución de destino: `--instance` > `--workspace` > `--project` > `--active`.

### 5.4 Sistema de aprobaciones

- [ ] Recibir solicitud de aprobación desde CLI externo.
- [ ] Mostrar diálogo modal en instancia destino.
- [ ] Respuesta sí/no devuelta al solicitante.
- [ ] Timeout de aprobación.

### 5.5 Skills para agentes

- [ ] Documentar skill para Codex.
- [ ] Documentar skill para Claude Code.
- [ ] Documentar skill para OpenCode.
- [ ] Ejemplos de comandos `enguepad notify` en cada skill.

### Criterios de aceptación (test manual)

```text
1. Dos instancias abiertas aparecen en `enguepad instances`.
2. `enguepad notify --project ...` llega a la instancia correcta.
3. Si el destino es ambiguo, el CLI falla con error descriptivo.
4. Solicitud de aprobación muestra diálogo en instancia destino.
5. Cerrar instancia limpia su registro en instances.json.
6. Evento externo activa reacción de mascota en instancia correcta.
```

> **¿Querés incluir tests automatizados en esta fase?**

---

## Notas generales

- Cada fase debe poder ejecutarse y testearse de forma aislada.
- No avanzar a la siguiente fase sin que la anterior esté estable.
- Prioridad absoluta: rendimiento y consumo de recursos.
- No añadir dependencias pesadas sin justificación explícita.
