# AI Agent Instructions

## General Rules

- Do NOT auto-commit changes — ask before committing.
- Do NOT write new files unless explicitly asked; prefer editing existing code.
- Do NOT add comments to code unless requested.
- Keep explanations and responses concise.
- Follow existing code style and patterns in the codebase.
- Use `src/` path alias for imports (e.g., `import { x } from 'src/components/...'`).
- Prefer the dedicated tools (Read, Grep, Glob, Edit, Write) over bash for file operations.

## Environment File Privacy

- Treat `.env` and `.env.*` files as sensitive. Do NOT read, search their contents, load, source, or modify them without explicit user permission for the specific file and operation.
- A debugging request does NOT authorize environment-file access. Explain why access is needed and ask first, or use source code, `.env_template`, and values the user provides.
- Exclude `.env` and `.env.*` files from broad searches and file reads, including hidden and ignored files.
- Do NOT bypass these restrictions through scripts, dotenv, subprocesses, or tools that load environment files. Before running commands that load these files, obtain permission or use a mode that does not load them.
- Permission to read does NOT imply permission to modify. Keep approved access limited to the requested settings; never dump the entire file or expose secrets in tool output, logs, responses, or commits.
- `.env_template` and explicitly identified, tracked example files containing placeholders may be inspected without permission. Do not assume other environment files are safe because they are tracked or ignored by Git.

## Tech Stack

- **Framework:** Vue 3 (Composition API preferred)
- **UI Framework:** Quasar v2 (Options API components are common, match existing style)
- **State:** Vuex (not Pinia)
- **Mobile:** Capacitor
- **Testing:** Mocha + Cypress (`npm run test:unit` / `npm run test`)
- **Linting:** ESLint with prettier (`npm run lint`)
- **Language:** JavaScript (ES modules), some TypeScript
- **i18n:** vue-i18n (`this.$t('key', {}, 'fallback')`)

## Conventions

- Run `npm run lint` before signaling completion of a task.
- Run `npm run test:unit` when relevant changes affect unit-tested code.
- Error notifications use `this.$q.notify({ type: 'error', message: ..., timeout: 5000 })`.
- Vue components use `.vue` SFC format.
- Do NOT introduce new dependencies without asking.

## Automated Code Review (Security)

Every pull request undergoes an AI-assisted security review. Pay particular attention to changes that could affect:

- Entropy and recovery-phrase generation
- Private-key derivation and handling
- Recovery-phrase storage
- Encryption
- Signing
- Transaction construction
- Smart contracts
- Secret material in memory
- Migration of sensitive data
- External interfaces that could influence signing behavior

For findings, reference the specific file and line, describe the risk and severity, and suggest a concrete fix.
