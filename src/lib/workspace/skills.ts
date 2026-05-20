export const SKILL_FILES: Record<string, string> = {
  ".enguepad/skills/README.md": `# EnguePad Skills — Instalación

Estas skills permiten que agentes de IA (Claude Code, Codex, OpenCode) se comuniquen con una instancia activa de EnguePad.

## Requisito previo

\`\`\`bash
cd <proyecto-enguepad>
cargo build --bin enguepad_cli
\`\`\`

Asegurate de que el binario esté en PATH o copialo a \`~/.cargo/bin/\`.

---

## Claude Code

\`\`\`bash
mkdir -p ~/.claude/skills
cp claude-code.md ~/.claude/skills/enguepad.md
\`\`\`

## Codex (OpenAI)

\`\`\`bash
mkdir -p ~/.codex/skills
cp codex.md ~/.codex/skills/enguepad.md
\`\`\`

## OpenCode

\`\`\`bash
mkdir -p ~/.opencode/skills
cp opencode.md ~/.opencode/skills/enguepad.md
\`\`\`

## Flujo de trabajo recomendado

1. **Antes de cualquier acción destructiva** → \`enguepad_cli approve "mensaje"\`
2. **Al empezar tarea** → \`enguepad_cli mascot run\`
3. **Al terminar con éxito** → \`enguepad_cli mascot jump\`
4. **Al encontrar error** → \`enguepad_cli mascot failed\`
5. **Al levantar servidor** → \`enguepad_cli preview http://localhost:5173\`

## Estados de mascota disponibles

- \`idle\` — reposo
- \`wave\` — saludo
- \`run\` — trabajando
- \`failed\` — error
- \`review\` — revisando / atención
- \`jump\` — éxito
- \`extra1\`, \`extra2\` — extras definidos por la mascota

## Resolución de destino

Si no especificás destino, usa la instancia más reciente.
Prioridad explícita: \`--instance\` > \`--workspace\` > \`--project\` > \`--active\`
`,
  ".enguepad/skills/claude-code.md": `# Skill: EnguePad Multi-Instance Communication

EnguePad es un editor de código desktop (Tauri + Svelte) con mascota interactiva.
Este skill permite que Claude Code se comunique con la instancia de EnguePad
que tiene abierto el proyecto actual.

## Requisito previo

Asegurate de que \`enguepad_cli\` esté en PATH. Se compila junto con la app:
\`\`\`bash
cargo build --bin enguepad_cli
\`\`\`

## Comandos disponibles

### Listar instancias activas
\`\`\`bash
enguepad_cli instances
\`\`\`

### Enviar eventos
\`\`\`bash
enguepad_cli notify --event "mascot" --payload '{"state":"wave"}'
enguepad_cli preview http://localhost:5173
enguepad_cli mascot jump
\`\`\`

### Solicitar aprobación del usuario
\`\`\`bash
enguepad_cli approve "¿Ejecutar npm install?" --project "mi-proyecto"
\`\`\`
- Muestra un diálogo modal en la instancia de EnguePad
- Timeout de 30 segundos por defecto
- Exit code: \`0\` si aprueba, \`1\` si rechaza o timeout

## Cuándo usar cada comando

- **notify** — Cuando querés que la mascota reaccione (ej. empezaste una tarea, terminaste, encontraste un error)
- **preview** — Cuando levantaste un servidor local y querés que el usuario lo vea dentro de EnguePad
- **mascot** — Para cambiar la animación de la mascota directamente (jump, wave, run, failed, etc.)
- **approve** — Antes de ejecutar cualquier comando destructivo (borrar archivos, instalar dependencias, push a git)

## Ejemplos de uso

\`\`\`bash
# Al iniciar una tarea compleja
enguepad_cli mascot wave
enguepad_cli notify --event "mascot" --payload '{"state":"run"}'

# Al encontrar un error
enguepad_cli mascot failed

# Antes de un refactor arriesgado
enguepad_cli approve "¿Renombrar la carpeta src/core a src/engine?" --active
\`\`\`

## Notas

- La resolución de destino es: \`--instance\` > \`--workspace\` > \`--project\` > \`--active\`
- Si no especificás destino, usa la instancia más reciente (\`--active\` implícito)
- La mascota tiene eventos semánticos mapeados: \`iniciando_tarea\`, \`error\`, \`preview_abierto\`, \`approval_request\`, etc.
`,
  ".enguepad/skills/codex.md": `# Skill: EnguePad Multi-Instance Communication

EnguePad es un editor de código desktop con mascota interactiva.
Este skill permite que Codex se comunique con la instancia activa de EnguePad
que tiene abierto el proyecto.

## Requisito previo

\`enguepad_cli\` debe estar en PATH. Se compila junto con la app.

## Comandos disponibles

### Ver instancias activas
\`\`\`bash
enguepad_cli instances
\`\`\`

### Enviar eventos a la instancia
\`\`\`bash
enguepad_cli notify --event "mascot" --payload '{"state":"wave"}'
enguepad_cli preview http://localhost:5173
enguepad_cli mascot jump
\`\`\`

### Solicitar aprobación antes de acciones destructivas
\`\`\`bash
enguepad_cli approve "¿Ejecutar npm install?" --project "nombre-proyecto"
\`\`\`
- Muestra diálogo modal en EnguePad
- Timeout 30s (configurable con \`--timeout\`)
- Exit code: \`0\` = aprobado, \`1\` = rechazado/timeout

## Reglas de uso

1. **Siempre** usar \`approve\` antes de:
   - Borrar archivos o carpetas
   - Instalar/desinstalar dependencias
   - Hacer push o force-push a git
   - Modificar configuraciones críticas

2. **Notify** para eventos de progreso:
   - \`iniciando_tarea\` → mascota reacciona
   - \`error\` → mascota muestra estado failed
   - \`preview_abierto\` → abre preview embebido

3. **Mascot** para control directo de animaciones:
   - Estados: idle, wave, run, failed, review, jump, extra1, extra2

## Ejemplos

\`\`\`bash
# Al empezar refactor
enguepad_cli mascot run

# Al terminar tarea exitosamente
enguepad_cli mascot jump

# Antes de borrar archivos
enguepad_cli approve "¿Eliminar tests antiguos?" --active
\`\`\`

## Resolución de destino

Prioridad: \`--instance\` > \`--workspace\` > \`--project\` > \`--active\`
`,
  ".enguepad/skills/opencode.md": `# Skill: EnguePad Multi-Instance Communication

EnguePad es un editor de código desktop (Tauri) con mascota interactiva y sistema de IPC.
Este skill permite que OpenCode se comunique con la instancia activa de EnguePad.

## Requisito previo

Asegurate de que \`enguepad_cli\` esté compilado y disponible:
\`\`\`bash
cargo build --bin enguepad_cli
\`\`\`

## Comandos principales

### Listar instancias
\`\`\`bash
enguepad_cli instances
\`\`\`

### Enviar eventos
\`\`\`bash
enguepad_cli notify --event "mascot" --payload '{"state":"wave"}'
enguepad_cli preview http://localhost:5173
enguepad_cli mascot jump
\`\`\`

### Solicitar aprobación
\`\`\`bash
enguepad_cli approve "¿Ejecutar rm -rf?" --project "mi-proyecto"
\`\`\`

## Flujo recomendado

1. Antes de cualquier acción destructiva → \`enguepad_cli approve "mensaje"\`
2. Al empezar tarea → \`enguepad_cli mascot run\`
3. Al terminar con éxito → \`enguepad_cli mascot jump\`
4. Al encontrar error → \`enguepad_cli mascot failed\`

## Estados de mascota

- \`idle\` — reposo
- \`wave\` — saludo
- \`run\` — trabajando
- \`failed\` — error
- \`review\` — revisando/atención
- \`jump\` — éxito
- \`extra1\`, \`extra2\` — extras

## Resolución de destino

Si no especificás destino, usa la instancia más reciente.
Prioridad explícita: \`--instance\` > \`--workspace\` > \`--project\` > \`--active\`

## Notas

- La mascota reacciona automáticamente a eventos semánticos (guardar archivo, abrir terminal, etc.)
- Las aprobaciones tienen timeout de 30s por defecto (\`--timeout 60\` para cambiar)
- Exit codes: \`0\` = approved, \`1\` = rejected o timeout
`,
};
