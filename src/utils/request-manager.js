/**
 * Centralized in-flight HTTP request manager.
 *
 * Covers axios (via `attachTo`), raw `fetch()` (via `attachToFetch`),
 * and XMLHttpRequest (via `attachToXHR`).
 *
 * Every outgoing request gets its own AbortController whose signal is
 * forwarded to the transport.  Calling `abortAll()` cancels every pending
 * request at once — the router calls this on every navigation so that a
 * user click is never blocked waiting for a stale background request.
 *
 * Opt-out mechanisms:
 *   axios:     `config.skipAbortManager = true`
 *   fetch:     `{ skipAbortManager: true }` in the init options
 *   XMLHttpRequest: set `xhr.skipAbortManager = true` before calling `.send()`
 */

class RequestManager {
  constructor () {
    /** @type {Map<symbol, AbortController>} */
    this._controllers = new Map()
  }

  /**
   * Create a new AbortController, track it, and return its signal.
   * The controller is automatically removed when the request settles.
   * @returns {{ signal: AbortSignal, cleanup: () => void }}
   */
  _register () {
    const key = Symbol()
    const controller = new AbortController()
    this._controllers.set(key, controller)
    const cleanup = () => this._controllers.delete(key)
    return { signal: controller.signal, cleanup }
  }

  /**
   * Abort every tracked in-flight request.
   */
  abortAll () {
    for (const controller of this._controllers.values()) {
      controller.abort()
    }
    this._controllers.clear()
  }

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

      const { signal, cleanup } = this._register()

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
        const mergedKey = Symbol()
        this._controllers.set(mergedKey, mergedController)
        cleanup() // Remove the original controller — merged handles it now
        config.signal = mergedController.signal
        config._abortCleanup = () => this._controllers.delete(mergedKey)
        return config
      }

      config.signal = signal

      // Attach cleanup to the config so response/error interceptors can call it
      config._abortCleanup = cleanup

      return config
    })

    // Response interceptors — clean up the controller entry on settle
    axiosInstance.interceptors.response.use(
      (response) => {
        response.config._abortCleanup?.()
        return response
      },
      (error) => {
        error?.config?._abortCleanup?.()
        return Promise.reject(error)
      }
    )
  }

  /**
   * Monkey-patch global `fetch` so every raw fetch() call is tracked and
   * abortable via `abortAll()`.
   *
   * Opt out per-request by passing `{ skipAbortManager: true }` in the
   * init options.
   */
  attachToFetch () {
    const self = this
    const originalFetch = window.fetch.bind(window)

    window.fetch = function (input, init = {}) {
      if (init.skipAbortManager) {
        return originalFetch(input, init)
      }

      const { signal, cleanup } = self._register()

      // Merge with any caller-supplied signal
      if (init.signal) {
        const callerSignal = init.signal
        if (callerSignal.aborted) {
          cleanup()
          return Promise.reject(new DOMException('Aborted', 'AbortError'))
        }

        const mergedController = new AbortController()
        const abort = () => { mergedController.abort(); cleanup() }
        callerSignal.addEventListener('abort', abort, { once: true })
        signal.addEventListener('abort', () => {
          mergedController.abort()
          callerSignal.removeEventListener('abort', abort)
        }, { once: true })

        init.signal = mergedController.signal
      } else {
        init.signal = signal
      }

      let promise
      try {
        promise = originalFetch(input, init)
      } catch (e) {
        cleanup()
        throw e
      }
      promise.finally(cleanup)
      return promise
    }
  }

  /**
   * Monkey-patch XMLHttpRequest.prototype.send so every XHR call is tracked
   * and abortable via `abortAll()`.
   *
   * Opt out per-request by setting `xhr.skipAbortManager = true` before
   * calling `.send()`.
   */
  attachToXHR () {
    const self = this
    const originalSend = XMLHttpRequest.prototype.send

    XMLHttpRequest.prototype.send = function (...args) {
      if (this._rmTracked || this.skipAbortManager) {
        return originalSend.apply(this, args)
      }
      this._rmTracked = true

      const { signal, cleanup } = self._register()
      const abort = () => { this.abort(); cleanup() }
      signal.addEventListener('abort', abort, { once: true })
      this.addEventListener('loadend', () => {
        signal.removeEventListener('abort', abort)
        cleanup()
      }, { once: true })

      return originalSend.apply(this, args)
    }
  }
}

export const requestManager = new RequestManager()
