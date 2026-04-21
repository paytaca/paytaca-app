export class MultisigWorker {
  constructor() {
    this.worker = null
    this.pendingRequests = new Map()
    this.requestId = 0
  }

  start() {
    if (this.worker) return

    this.worker = new Worker(new URL('./multisig.worker.js', import.meta.url), { type: 'module' })
    

    this.worker.onmessage = (event) => {
      const { id, result, error, success, final } = event.data
      
      const pending = this.pendingRequests.get(id)
      // console.log('EVENT DATA RECEIVED', event.data, result.final === false && pending.onProgress)
      if (pending) {
        if (success) {
          if (final === false && pending.onProgress) {
            pending.onProgress(event.data)
            return 
          }
          pending.resolve(event.data)
        } else {
          pending.reject(new Error(error))
        }

        this.pendingRequests.delete(id)
      }
    }

    this.worker.onerror = (error) => {
      for (const [id, pending] of this.pendingRequests) {
        pending.reject(error)
        this.pendingRequests.delete(id)
      }
    }
  }

  stop() {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
      this.pendingRequests.clear()
    }
  }

  send(type, data, onProgress = null) {
    const id = data.id || this.requestId++

    if (this.pendingRequests.has(id)) {
      return this.pendingRequests.get(id).promise
    }

    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });

    if (!this.worker) {
      this.start()
    }

    this.pendingRequests.set(id, { 
      resolve, 
      reject, 
      onProgress, 
      promise 
    });
    
    this.worker.postMessage({
      type,
      id,
      data
    })
    return promise
  }

  async startAddressDiscovery(multisigWallet, options = {}, onProgress) {
    
    return this.send('START_ADDRESS_DISCOVERY', 
      {
        id: multisigWallet.walletHash,
        multisigWallet,
        options
      },
      onProgress
    )
  }
}

let workerInstance = null

export const getMultisigWorker = () => {
  if (!workerInstance) {
    workerInstance = new MultisigWorker()
  }
  return workerInstance
}

export default MultisigWorker
