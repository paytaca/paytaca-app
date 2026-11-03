/**
 * Centralized in-flight HTTP request manager.
 *
 * Covers raw `fetch()` (via `attachToFetch`), XMLHttpRequest (via
 * `attachToXHR`), and axios instances (via `attachTo`).
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
 *
 * Cancellation happens at the transport layer. axios is driven through its
 * XHR adapter, so `abortAll()` aborts it via `xhr.abort()`, which trips the
 * adapter's `request.onabort` handler and rejects with
 * `createError('Request aborted', config, 'ECONNABORTED')`. Callers rely on
 * that `ECONNABORTED` code to tell benign navigation aborts apart from real
 * failures, so this module deliberately does not substitute its own error
 * shape.
 *
 * NOTE: `attachTo()` only teaches the XHR patch about the opt-out. It never
 * installs request/response interceptors, so `attachToXHR()` must also have
 * run for managed axios instances to be abortable at all. `src/boot/axios.js`
 * installs both unconditionally.
 */

/**
 * Set by the adapter wrapper below while a managed axios instance is
 * dispatching, so the XMLHttpRequest patch can tell whether the request that
 * is about to be sent opted out of abort management.
 *
 * axios builds the config, then calls the adapter synchronously, and the xhr
 * adapter creates its XMLHttpRequest and calls `send()` inside a
 * synchronously-executed Promise executor. The flag is therefore always
 * accurate at `send()` time, and is restored on the way out.
 *
 * @type {boolean}
 */
let skippableDispatch = false

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
   * Mark an axios instance as abort-managed, enabling the per-request
   * `skipAbortManager` opt-out.
   *
   * There is nothing to intercept here: the request is already tracked by the
   * XMLHttpRequest patch in `attachToXHR()`. All that is needed is to let that
   * patch see the opt-out, which is impossible from a request interceptor —
   * the XHR object is created deep inside axios' adapter and carries no
   * reference to the config. Wrapping the adapter bridges the two: it runs on
   * the same synchronous tick as `xhr.send()` and can publish the opt-out as
   * a module-scoped flag.
   *
   * @param {import('axios').AxiosInstance} axiosInstance
   */
  attachTo (axiosInstance) {
    const adapter = axiosInstance.defaults.adapter
    if (typeof adapter === 'function') {
      axiosInstance.defaults.adapter = function (config) {
        const previous = skippableDispatch
        skippableDispatch = config.skipAbortManager === true
        try {
          return adapter.call(this, config)
        } finally {
          skippableDispatch = previous
        }
      }
    }
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
   * and abortable via `abortAll()`. This is also what makes managed axios
   * instances abortable, since they dispatch through XHR.
   *
   * Opt out per-request either by setting `xhr.skipAbortManager = true` before
   * calling `.send()`, or, for axios, with `config.skipAbortManager = true` —
   * `attachTo()` forwards that to this patch via `skippableDispatch`.
   */
  attachToXHR () {
    const self = this
    const originalSend = XMLHttpRequest.prototype.send

    XMLHttpRequest.prototype.send = function (...args) {
      if (this._rmTracked || this.skipAbortManager || skippableDispatch) {
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
