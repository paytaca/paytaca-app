/**
 * Centralized in-flight HTTP request manager.
 *
 * Each axios instance registers itself via `attachTo(axiosInstance)`.
 * Every outgoing request gets its own AbortController whose signal is
 * forwarded to axios.  Calling `abortAll()` cancels every pending request
 * at once — the router calls this on every navigation so that a user click
 * is never blocked waiting for a stale background request to finish.
 *
 * Requests that opt out (e.g. fire-and-forget mutations) can set
 * `config.skipAbortManager = true`.
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
}

export const requestManager = new RequestManager()
