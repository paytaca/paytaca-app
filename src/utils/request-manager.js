/**
 * Centralized in-flight HTTP request manager.
 *
 * Covers axios, raw fetch(), XMLHttpRequest, and HTMLImageElement network loads.
 * Calling `abortAll()` cancels every pending request at once — the router calls
 * this on every navigation so that a user click is never blocked waiting for a
 * stale background request to finish.
 *
 * Axios requests that must survive navigation can set `config.skipAbortManager = true`.
 */

class RequestManager {
  constructor () {
    /**
     * @type {Map<string, AbortController>}
     * Key format: 'ac:<symbol>' for controllers created by this manager.
     */
    this._items = new Map()
  }

  // ── Internal helpers ──────────────────────────────────────────────

  _key () { return 'ac:' + Symbol() }

  _register (controller) {
    const key = this._key()
    this._items.set(key, controller)
    return () => this._items.delete(key)
  }

  // ── Public API ────────────────────────────────────────────────────

  /**
   * Abort every tracked in-flight request (axios, fetch, XHR, images).
   */
  abortAll () {
    for (const [key, item] of this._items) {
      try {
        if (key.startsWith('ac:')) {
          /** @type {AbortController} */ (item).abort()
        } else if (key.startsWith('xhr:')) {
          /** @type {XMLHttpRequest} */ (item).abort()
        } else if (key.startsWith('img:')) {
          /** @type {HTMLImageElement} */ (item).src = ''
        }
      } catch (_) { /* ignore race conditions */ }
    }
    this._items.clear()
  }

  /**
   * Create an AbortController tracked by this manager.
   * Use with raw `fetch(url, { signal: controller.signal })`.
   * Call `controller.cleanup()` when the request settles.
   *
   * @returns {{ signal: AbortSignal, cleanup: () => void }}
   */
  createAbortController () {
    const controller = new AbortController()
    const cleanup = this._register(controller)
    const signal = controller.signal
    return { signal, cleanup }
  }

  /**
   * Register an XMLHttpRequest so `abortAll()` calls `xhr.abort()`.
   * Returns a cleanup function to call when the XHR settles.
   *
   * @param {XMLHttpRequest} xhr
   * @returns {() => void}
   */
  registerXHR (xhr) {
    const key = 'xhr:' + Symbol()
    this._items.set(key, xhr)
    return () => this._items.delete(key)
  }

  /**
   * Register an HTMLImageElement that is loading a network URL so that
   * `abortAll()` can cancel the load by setting `img.src = ''`.
   * Returns a cleanup function to call when the image settles.
   *
   * @param {HTMLImageElement} img
   * @returns {() => void}
   */
  registerImage (img) {
    const key = 'img:' + Symbol()
    this._items.set(key, img)
    return () => this._items.delete(key)
  }

  // ── Axios integration ─────────────────────────────────────────────

  /**
   * Wire up request/response interceptors on an axios instance so that
   * every request it makes is tracked and abortable.
   *
   * @param {import('axios').AxiosInstance} axiosInstance
   */
  attachTo (axiosInstance) {
    // Request interceptor — inject the abort signal
    axiosInstance.interceptors.request.use((config) => {
      if (config.skipAbortManager) return config

      const { signal, cleanup } = this.createAbortController()

      // Merge with any signal the caller already set
      if (config.signal) {
        const callerSignal = config.signal
        // If the caller's signal is already aborted, respect it immediately
        if (callerSignal.aborted) {
          cleanup()
          const merged = new AbortController()
          merged.abort()
          config.signal = merged.signal
          return config
        }

        // Abort our controller when the caller aborts, and vice-versa
        const mergedController = new AbortController()
        const abort = () => { mergedController.abort(); cleanup() }
        callerSignal.addEventListener('abort', abort, { once: true })
        signal.addEventListener('abort', () => {
          mergedController.abort()
          callerSignal.removeEventListener('abort', abort)
        }, { once: true })

        // Replace tracking with the merged controller
        this._register(mergedController)
        config.signal = mergedController.signal
        return config
      }

      config.signal = signal

      // Attach cleanup to the config so response/error interceptors can call it
      config._rmCleanup = cleanup

      return config
    })

    // Response interceptors — clean up the controller entry on settle
    axiosInstance.interceptors.response.use(
      (response) => {
        response.config._rmCleanup?.()
        return response
      },
      (error) => {
        error?.config?._rmCleanup?.()
        return Promise.reject(error)
      }
    )
  }
}

export const requestManager = new RequestManager()
