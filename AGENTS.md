# AI Agent Instructions

## General Rules

- Do NOT auto-commit changes — ask before committing.
- Do NOT write new files unless explicitly asked; prefer editing existing code.
- Do NOT add comments to code unless requested.
- Keep explanations and responses concise.
- Follow existing code style and patterns in the codebase.
- Use `src/` path alias for imports (e.g., `import { x } from 'src/components/...'`).
- Prefer the dedicated tools (Read, Grep, Glob, Edit, Write) over bash for file operations.

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
