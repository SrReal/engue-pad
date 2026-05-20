# EnguePad Skills — Instalación

Estas skills permiten que agentes de IA (Claude Code, Codex, OpenCode) se comuniquen con una instancia activa de EnguePad.

## Requisito previo

`enguepad_cli` debe estar compilado y disponible en PATH:

```bash
cd <proyecto-enguepad>
cargo build --bin enguepad_cli
```

Asegurate de que el binario esté en PATH o copialo a `~/.cargo/bin/`:

```bash
cp target/debug/enguepad_cli ~/.cargo/bin/
```

---

## Claude Code

### Instalación global (todos los proyectos)

```bash
mkdir -p ~/.claude/skills
cp claude-code.md ~/.claude/skills/enguepad.md
```

### Instalación por proyecto

```bash
mkdir -p .claude/skills
cp claude-code.md .claude/skills/enguepad.md
```

Claude Code carga automáticamente todos los `.md` de `~/.claude/skills/` y `.claude/skills/` al arrancar.

### Verificación

```bash
enguepad_cli instances
```

Si ves una instancia activa, la skill está funcionando.

---

## Codex (OpenAI)

### Instalación global

```bash
mkdir -p ~/.codex/skills
cp codex.md ~/.codex/skills/enguepad.md
```

### Instalación por proyecto

```bash
mkdir -p .codex/skills
cp codex.md .codex/skills/enguepad.md
```

### Uso manual (si el directorio de skills no funciona)

```bash
codex --system-prompt codex.md
```

### Verificación

```bash
enguepad_cli instances
```

---

## OpenCode

### Instalación global

```bash
mkdir -p ~/.opencode/skills
cp opencode.md ~/.opencode/skills/enguepad.md
```

### Instalación por proyecto

```bash
mkdir -p .opencode/skills
cp opencode.md .opencode/skills/enguepad.md
```

### Verificación

```bash
enguepad_cli instances
```

---

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

## Notas

- Las aprobaciones tienen timeout de 30s por defecto (`--timeout 60` para cambiar)
- Exit codes: `0` = aprobado, `1` = rechazado o timeout
- La mascota reacciona automáticamente a eventos semánticos de la app (guardar archivo, abrir terminal, etc.)
