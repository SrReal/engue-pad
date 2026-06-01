# EnguePad Skills — Instalación

Estas skills permiten que agentes de IA (Claude Code, Codex, OpenCode) se comuniquen con una instancia activa de EnguePad.

## Requisito previo

Asegurate de que `enguepad_cli` esté en PATH. La forma más fácil es instalarlo desde la app:

1. Abrí EnguePad
2. Andá a **Settings → CLI**
3. Clic en **Install CLI to PATH**

Alternativamente, si tenés el repo y Rust instalado:

```bash
cd <proyecto-enguepad>
cargo build --bin enguepad_cli
```

Asegurate de que el binario esté en PATH o copialo a `~/.cargo/bin/`.

---

## Claude Code

Claude Code usa un sistema de skills basado en directorios. Cada skill es una carpeta con un archivo `SKILL.md`:

```bash
mkdir -p ~/.claude/skills/engue
cp claude-code.md ~/.claude/skills/engue/SKILL.md
```

## Codex (OpenAI)

Codex usa skills como archivos `.md` planos:

```bash
mkdir -p ~/.codex/skills
cp codex.md ~/.codex/skills/enguepad.md
```

## OpenCode

OpenCode usa skills como archivos `.md` planos:

```bash
mkdir -p ~/.opencode/skills
cp opencode.md ~/.opencode/skills/enguepad.md
```

## Flujo de trabajo recomendado

1. **Antes de cualquier acción destructiva** → `enguepad_cli approve "mensaje"`
2. **Al empezar tarea** → `enguepad_cli mascot run`
3. **Al terminar con éxito** → `enguepad_cli mascot jump`
4. **Al encontrar error** → `enguepad_cli mascot failed`
5. **Al levantar servidor** → `enguepad_cli preview http://localhost:5173`

## Estados de mascota disponibles

- `idle` — reposo
- `wave` — saludo
- `run` — trabajando
- `failed` — error
- `review` — revisando / atención
- `jump` — éxito
- `extra1`, `extra2` — extras definidos por la mascota

## Resolución de destino

Si no especificás destino, usa la instancia más reciente.
Prioridad explícita: `--instance` > `--workspace` > `--project` > `--active`
