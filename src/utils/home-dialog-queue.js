// Serializes one-shot dialogs that are shown when the home page loads
// (backup reminder, join rewards, ...) so they never stack on top of each
// other. Only one dialog is shown at a time; queued dialogs take turns once
// the active one is released. The queue is reset on every home page load.

const pending = []
const shownIds = new Set()
const blockers = new Set()
let activeId = null

// Clear all state so a fresh home page load can show its dialogs again.
export function resetHomeDialogQueue () {
  pending.length = 0
  shownIds.clear()
  blockers.clear()
  activeId = null
}

// Prevent any home dialog from showing while an unrelated dialog is up
// (e.g. the app version update prompt).
export function blockHomeDialogs (reason) {
  if (reason) blockers.add(reason)
}

export function unblockHomeDialogs (reason) {
  if (reason) blockers.delete(reason)
  pump()
}

// Request to show a dialog. `show` receives a `done` callback that MUST be
// invoked when the dialog is closed, so the next queued dialog can take over.
// `priority` is used only to order dialogs that are requested concurrently.
export function requestHomeDialog (id, show, priority = 0) {
  if (!id || typeof show !== 'function') return
  if (activeId === id || shownIds.has(id)) return
  if (pending.some(item => item.id === id)) return
  pending.push({ id, show, priority })
  pump()
}

export function releaseHomeDialog (id) {
  const queuedIndex = pending.findIndex(item => item.id === id)
  if (queuedIndex !== -1) pending.splice(queuedIndex, 1)
  if (activeId !== id) return
  activeId = null
  // Let the closing dialog finish its transition before opening the next one.
  setTimeout(pump, 250)
}

function pump () {
  if (activeId || blockers.size || !pending.length) return
  pending.sort((a, b) => b.priority - a.priority)
  const next = pending.shift()
  activeId = next.id
  shownIds.add(next.id)
  try {
    next.show(() => releaseHomeDialog(next.id))
  } catch (err) {
    console.error('home-dialog-queue: failed to show dialog', next.id, err)
    releaseHomeDialog(next.id)
  }
}
