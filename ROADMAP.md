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
- [x] Watcher de cambios en filesystem (crear/eliminar/renombrar) y refresco selectivo.

### 1.4 Editor de archivos

- [x] Integrar CodeMirror 6 en componente Svelte.
- [x] Soporte de resaltado de sintaxis para JS, TS, JSON, HTML, CSS, Markdown, Python.
- [x] Abrir archivo desde árbol en pestaña del editor.
- [x] Guardar archivo (`Ctrl+S`) con comando Tauri de escritura.
- [x] Indicador de cambios sin guardar (dot en pestaña).
- [x] Búsqueda y reemplazo en archivo.
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

- [x] Investigar e integrar crate de PTY compatible con Windows (ConPTY) y Unix.
- [x] Comando Tauri para crear proceso de shell (PowerShell / bash / zsh).
- [x] Pipe bidireccional: stdin del proceso desde frontend, stdout/stderr hacia frontend.
- [x] Manejo de procesos: crear, matar, verificar estado.

### 2.2 Terminal en frontend

- [x] Integrar xterm.js en componente Svelte.
- [x] Conectar xterm.js con backend PTY vía Tauri events/commands.
- [x] Soporte de múltiples terminales en pestañas.
- [x] Soporte de splits verticales/horizontales con terminales.
- [x] Renombrar terminal.
- [x] Guardar y restaurar terminales en workspace (id, título, shell, cwd, restore).

### 2.3 Detección de URLs

- [x] Parsear salida de terminal buscando URLs locales (`http://localhost:`).
- [x] Mostrar toast/sugerencia para abrir preview.
- [x] Evento interno `terminal.output.url_detected`.

### 2.4 Preview web

- [x] Componente de preview embebido (iframe o webview).
- [x] Abrir URL manual o desde detección de terminal.
- [x] Refrescar preview.
- [x] Abrir en navegador externo.
- [x] Guardar previews configurados en workspace.

### 2.5 Layout avanzado

- [x] Tabs de terminales y previews integrados en el sistema de splits.
- [x] Mover pestaña de terminal/preview entre splits.
- [x] Maximizar/restaurar panel.

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

- [x] Sistema de adaptadores de linter: ejecutar comando externo, parsear salida.
- [x] Adaptador para TypeScript/JavaScript (biome > eslint).
- [x] Adaptador para Python (ruff).
- [x] Adaptador para PowerShell (PSScriptAnalyzer).
- [x] Ejecutar lint al guardar archivo (configurable). Actualmente se ejecuta debounced al escribir.
- [x] Mostrar errores en panel de problemas.
- [x] Mostrar diagnósticos en editor (subrayado/warnings de CodeMirror).
- [x] Configuración de linters en `workspace.json`.

### 3.2 Git básico en árbol de archivos

- [x] Detectar si el proyecto es un repositorio git.
- [x] Mostrar nombre de branch actual en sidebar footer.
- [x] Mostrar indicadores de cambio en archivos del árbol (modificado, nuevo, sin seguimiento).
- [x] Refresco de estado git periódico cada 5s.

### 3.3 Panel de tareas (TODO)

- [x] Crear `.enguepad/todo.md` con template por defecto si no existe.
- [x] Parser de markdown: extraer checkboxes y agrupaciones por headers (`##`).
- [x] Componente Svelte de panel de tareas: lista interactiva con checkboxes.
- [x] Sincronización bidireccional: click en checkbox actualiza fichero; editar fichero actualiza panel.
- [x] Panel se ubica como pestaña dentro del layout.
- [x] No mostrar markdown crudo por defecto (renderizado interactivo).
- [x] Watcher de `todo.md` para refresco en tiempo real.

### 3.4 Status bar — contador de tareas

- [x] Parsear `todo.md` al abrir proyecto.
- [x] Mostrar contador 📝 X/Y en status bar.
- [x] Actualizar contador en tiempo real al modificar tareas.

### 3.5 Refinamiento y rendimiento

- [x] Optimizar carga lazy del árbol de archivos en proyectos grandes.
- [x] Debounce en watcher de filesystem.
- [x] Revisar consumo de memoria con múltiples pestañas abiertas.
- [x] Ajustes de UX: atajos de teclado, focus management, scroll restoration.

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

## Fase 3.6 — Configuración

Objetivo: ventana modal con ajustes persistentes de la aplicación.

### 3.6.1 Estructura de configuración

- [x] Tipo `AppSettings` completo con todas las opciones.
- [x] Persistir en `settings.json` (app data dir).
- [x] Cargar al inicio, guardar al cambiar.

### 3.6.2 Ventana modal de configuración

- [x] Componente `SettingsModal.svelte`.
- [x] Abrir desde icono de engranaje en top bar.
- [x] Tabs/categorías: General, Editor, Terminal, Lint, Git.

### 3.6.3 Opciones configurables

#### General
- [x] Tamaño de fuente de UI
- [x] Escala de interfaz (zoom)
- [x] Restaurar layout al reabrir (si/no)
- [x] Tema: dark/light/auto

#### Editor
- [x] Tamaño de fuente del editor
- [x] Interlineado
- [x] Word wrap
- [x] Tab size / espacios vs tabs
- [x] Mostrar números de línea
- [x] Resaltar línea activa
- [x] Minimap (si/no)

#### Terminal
- [x] Shell por defecto (bash/zsh/pwsh)
- [x] Fuente y tamaño de terminal
- [x] Líneas de scrollback
- [x] Copiar al seleccionar

#### Lint
- [x] Activar/desactivar linting
- [x] Ejecutar al guardar vs al escribir
- [x] Linter preferido por lenguaje

#### Git
- [x] Intervalo de refresco de estado git
- [x] Mostrar indicadores en árbol

### Criterios de aceptación

```text
1. Clic en engranaje abre modal de settings.
2. Cambiar una opción se refleja inmediatamente en UI.
3. Cerrar y reabrir app conserva los settings.
4. Las opciones de editor afectan a CodeMirror.
```

---

## Fase 4 — Mascota

Objetivo: mascota visual configurable reactiva a eventos internos. Compatible con formato [Petdex](https://github.com/crafter-station/petdex): spritesheet 8×9 + pet.json.

### 4.1 Estructura de mascota

- [x] Carpeta de mascotas global: `%APPDATA%/EnguePad/mascots/` (Windows), `~/Library/Application Support/EnguePad/mascots/` (macOS), `~/.config/enguepad/mascots/` (Linux).
- [x] Importar mascota desde carpeta (copiar a directorio de mascotas).
- [x] Leer `pet.json` + `spritesheet.{webp,png}` al estilo Petdex.
- [x] Generar `mascot.json` interno con metadatos adaptados.

### 4.2 Motor de mascota

- [x] Sistema de estados Petdex (8 filas): idle, wave, run, failed, review, jump, extra1, extra2.
- [x] Canvas 2D para renderizar spritesheet recortando frames.
- [x] Timing configurable (ms por frame, frames por estado).
- [x] Transiciones automáticas idle→estado→idle tras timeout.

### 4.3 Panel flotante

- [x] Panel flotante draggable sobre toda la UI (z-index alto).
- [x] Posición persistente en `settings.json`.
- [x] Modo: disabled / compact (sprite estático) / animated (animación activa).
- [x] Tamaño configurable: small / normal.

### 4.4 Sonido y voz

- [x] Sonidos de feedback via Web Audio API procedural (beep/boop).
- [x] Voz sintética via Web Speech API (`speechSynthesis`) para frases.
- [x] Si mascota importada trae audio propio → usa ese; si no → defaults.
- [x] Controles: activar/desactivar sonido, volumen.

### 4.5 Eventos internos mapeados (semánticos)

- [x] Sistema de 17 eventos semánticos mapeables a estados Petdex:
  - `idle`, `esperando_respuesta`, `aviso_fin_tarea`, `error`, `iniciando_tarea`, `continuo_trabajando`, `llamar_atencion`
  - `terminal_creado`, `terminal_cerrado`, `esperando_comando`
  - `panel_dividido`, `preview_abierto`, `archivo_renombrado`
  - `imagen_abierta`, `audio_abierto`, `maximizado`, `restaurado`
- [x] Detección de `terminal_cerrado` desde backend Rust (evento PTY end).
- [x] Detección de `esperando_comando` en frontend (timer de inactividad en terminal).

### Criterios de aceptación (test manual)

```text
1. Abrir proyecto carga mascota configurada.
2. Importar desde Settings crea mascot.json y copia spritesheet.
3. Panel flotante se puede arrastrar; posición persiste.
4. Ejecutar comando en terminal cambia estado de mascota a run.
5. Guardar archivo cambia estado a jump.
6. Modo disabled no carga recursos ni muestra panel.
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
