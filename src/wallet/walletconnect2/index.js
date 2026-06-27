import {
  bigIntToCompactUint,
  binToBase64,
  binToHex,
  decodePrivateKeyWif,
  lockingBytecodeToCashAddress,
  secp256k1,
  utf8ToBin,
  hash256,
} from 'bitauth-libauth-v3'
import { Core } from '@walletconnect/core'
import { WalletKit } from '@reown/walletkit'
import { getSdkError } from '@walletconnect/utils'
import { parseExtendedJson, privateKeyToCashAddress, signBchTxError, signBchTransaction as signBchTransactionShared } from '../bch-sign'
import { unpackSourceOutput } from './tx-sign-utils'
import BCHJS from '@psf/bch-js'

const bchjs = new BCHJS()

// Singleton state to prevent multiple initializations
let web3WalletInstance = null
let isInitializing = false
let isInitialized = false
// Waiters waiting for the in-flight initialization to resolve. Replaces the
// previous `while (isInitializing) await sleep(100)` busy-wait that polled the
// event loop every 100ms when multiple boot callers raced.
let _initWaiters = []

// Track pending dialog for cancellation support
let pendingDialog = null
let cancellationPollingInterval = null

/**
 * Initialize Web3Wallet with proper singleton pattern
 * Prevents multiple initializations which can cause event handler duplication
 */
export async function initWeb3Wallet () {
  // Return existing instance if already initialized
  if (isInitialized && web3WalletInstance) {
    return web3WalletInstance
  }

  // Prevent concurrent initialization attempts — wait on a deferred promise
  // instead of polling.
  if (isInitializing) {
    return new Promise((resolve, reject) => {
      _initWaiters.push({ resolve, reject })
    })
  }

  isInitializing = true

  try {
    const core = new Core({
      projectId: process.env.WALLETCONNECT_PROJECT_ID
    })

    web3WalletInstance = await WalletKit.init({
      core: core,
      metadata: {
        name: 'Paytaca',
        description: 'Paytaca - BCH Wallet App',
        url: 'https://www.paytaca.com',
        icons: ['https://walletconnect.org/walletconnect-logo.png'],
      }
    })

    // Attach critical event handlers immediately
    attachCoreEventHandlers(web3WalletInstance)

    isInitialized = true
    return web3WalletInstance
  } catch (error) {
    console.error('Failed to initialize WalletConnect:', error)
    throw error
  } finally {
    isInitializing = false
    // Drain waiters
    const waiters = _initWaiters
    _initWaiters = []
    for (const w of waiters) {
      if (isInitialized && web3WalletInstance) w.resolve(web3WalletInstance)
      else w.reject(new Error('WalletConnect initialization failed'))
    }
  }
}

/**
 * Get the existing Web3Wallet instance without initializing
 */
export function getWeb3Wallet() {
  return web3WalletInstance
}

/**
 * Check if WalletConnect is initialized
 */
export function isWalletConnectInitialized() {
  return isInitialized && web3WalletInstance !== null
}

/**
 * Attach core event handlers that should always be active
 */
function attachCoreEventHandlers(web3wallet) {
  if (!web3wallet) return

  // Handle session deletion (e.g., dApp disconnects)
  web3wallet.on('session_delete', ({ topic }) => {
    console.log('Session deleted by dApp:', topic)
    stopPollingForCancellationRequest()
  })

  // Handle session expiration
  web3wallet.on('session_expire', ({ topic }) => {
    console.log('Session expired:', topic)
    stopPollingForCancellationRequest()
  })

  // Handle request expiration - CRITICAL for preventing hangs
  web3wallet.on('session_request_expire', (event) => {
    console.log('Session request expired:', event)
    if (pendingDialog?.id === event.id) {
      pendingDialog.handle.hide()
      pendingDialog = null
      stopPollingForCancellationRequest()
    }
  })
}

/**
 * Set the pending dialog for cancellation tracking
 */
export function setPendingDialog(id, handle, dappName) {
  pendingDialog = { id, handle, dappName }
}

/**
 * Clear the pending dialog
 */
export function clearPendingDialog() {
  pendingDialog = null
  stopPollingForCancellationRequest()
}

/**
 * Start polling for cancellation requests from dApp
 */
export function startPollingForCancellationRequest(callback) {
  if (cancellationPollingInterval) return // Already polling

  console.debug('Started polling for WalletConnect cancellation requests')
  cancellationPollingInterval = setInterval(() => {
    if (web3WalletInstance && callback) {
      checkForCancellationRequest(callback)
    }
  }, 500) // Poll every 500ms
}

/**
 * Stop polling for cancellation requests
 */
export function stopPollingForCancellationRequest() {
  if (cancellationPollingInterval) {
    clearInterval(cancellationPollingInterval)
    cancellationPollingInterval = null
    console.debug('Stopped polling for WalletConnect cancellation requests')
  }
}

/**
 * Check for queued cancellation requests
 */
async function checkForCancellationRequest(callback) {
  if (!web3WalletInstance || !pendingDialog) return

  try {
    const queuedRequests = web3WalletInstance.getPendingSessionRequests()
    for (const request of queuedRequests) {
      if (request.params.request.method === 'bch_cancelPendingRequests') {
        console.log('Cancelling pending WalletConnect requests as requested by dApp')
        await callback(request)
      }
    }
  } catch (error) {
    console.error('Error checking for cancellation requests:', error)
  }
}

/**
 * Cancel all pending requests for a topic
 */
export async function cancelPendingRequestsForTopic(cancellationRequest) {
  if (!web3WalletInstance) return

  const { topic: cancellationRequestTopic, id: cancellationRequestId } = cancellationRequest
  let cancelledCount = 0

  const queuedRequests = web3WalletInstance.getPendingSessionRequests()

  for (const request of queuedRequests) {
    if (request.topic !== cancellationRequestTopic) continue

    // When we reach the cancellation request itself we respond to it
    if (request.id === cancellationRequestId) {
      const response = {
        id: cancellationRequestId,
        jsonrpc: '2.0',
        result: { cancelledCount }
      }
      await web3WalletInstance.respondSessionRequest({
        topic: cancellationRequestTopic,
        response
      })
      return
    }

    // Hide the pending dialog if it matches this request
    if (pendingDialog?.id === request.id) {
      pendingDialog.handle.hide()
    }

    // Reject the request
    await rejectRequest(request)
    cancelledCount++
  }
}

/**
 * Reject a session request
 */
async function rejectRequest(request) {
  const { id, topic } = request

  // Check if request is still pending
  const stillPending = web3WalletInstance?.getPendingSessionRequests()
    .some(r => r.id === id)

  if (!stillPending) return

  const response = {
    id,
    jsonrpc: '2.0',
    error: getSdkError('USER_REJECTED')
  }

  try {
    await web3WalletInstance.respondSessionRequest({ topic, response })
  } catch (error) {
    console.error('Error rejecting request:', error)
  }
}

/**
 * Reset WalletConnect state safely
 * Uses WalletConnect's API instead of manual IndexedDB manipulation
 */
export async function resetWallectConnectDatabase() {
  if (!web3WalletInstance) {
    console.log('No WalletConnect instance to reset')
    return
  }

  try {
    // Get all active sessions and disconnect them properly
    const sessions = web3WalletInstance.getActiveSessions()
    for (const [topic, session] of Object.entries(sessions)) {
      try {
        await web3WalletInstance.disconnectSession({
          topic,
          reason: getSdkError('USER_DISCONNECTED')
        })
      } catch (error) {
        console.error(`Error disconnecting session ${topic}:`, error)
      }
    }

    // Clear any pending requests
    const pendingRequests = web3WalletInstance.getPendingSessionRequests()
    for (const request of pendingRequests) {
      try {
        await rejectRequest(request)
      } catch (error) {
        console.error(`Error rejecting pending request ${request.id}:`, error)
      }
    }

    console.log('WalletConnect reset completed successfully')
  } catch (error) {
    console.error('Error during WalletConnect reset:', error)
    throw error
  }
}

/**
 * Disconnect all sessions - useful for network/wallet switches
 */
export async function disconnectAllSessions() {
  if (!web3WalletInstance) return

  const sessions = web3WalletInstance.getActiveSessions()
  const sessionsDisconnectionPromises = Object.keys(sessions).map(async (topic) => {
    try {
      await web3WalletInstance.disconnectSession({
        topic,
        reason: getSdkError('USER_DISCONNECTED')
      })
    } catch (error) {
      console.error(`Error disconnecting session ${topic}:`, error)
    }
  })

  const pairings = web3WalletInstance.core.pairing.getPairings();
  const pairingsDisconnectionPromises = pairings.map((pairing) =>
    web3WalletInstance.core.pairing.disconnect({ 
      topic: pairing.topic 
    }).catch(e => console.warn(`Pairing ${pairing.topic} already gone`))
  );

  await Promise.all([...sessionsDisconnectionPromises, ...pairingsDisconnectionPromises]);
  stopPollingForCancellationRequest()
}

export function parseSessionRequest(sessionRequest) {
  const parsedSessionRequest = parseExtendedJson(JSON.stringify(sessionRequest))
  if (parsedSessionRequest?.params?.request?.method === 'bch_signTransaction') {
    const parsedParams = parsedSessionRequest.params.request.params
    const parsedTx = parsedParams?.transaction

    const populateOutputAddress = output => {
      if (output?.lockingBytecode) {
        const parseResp = lockingBytecodeToCashAddress({
          bytecode: output?.lockingBytecode,
          tokenSupport: Boolean(output?.token),
        })
        if (typeof parseResp !== 'string') output.address = parseResp.address
      }
      return output
    }

    parsedTx?.outputs?.forEach?.(populateOutputAddress)
    parsedParams?.sourceOutputs?.forEach?.(populateOutputAddress)?.forEach(unpackSourceOutput)

    parsedTx?.inputs?.forEach?.(input => {
      input.sourceOutput = parsedParams?.sourceOutputs?.find?.(output => {
        return binToHex(input?.outpointTransactionHash) == binToHex(output?.outpointTransactionHash) &&
          input?.outpointIndex == output?.outpointIndex
      })
    })

    parsedSessionRequest.params.request.params = parsedParams
  }

  return parsedSessionRequest
}

export function signMessage(message, wif='') {
    const decodedPrivateKeyWif = decodePrivateKeyWif(wif);
    if (typeof decodedPrivateKeyWif === 'string') {
      throw new Error(`Invalid WIF: ${decodedPrivateKeyWif}`);
    }
    const privateKey = decodedPrivateKeyWif.privateKey;
    
    const isCompressed = !decodedPrivateKeyWif.type.endsWith('Uncompressed'); 
    const prefixStr = "Bitcoin Signed Message:\n";
    const prefixBin = utf8ToBin(prefixStr);
    // Intentionally hardcoding length for hardcoded prefixStr, will change if refactored using dynamic prefix.
    const prefixLenBin = new Uint8Array([0x18]); 
    const messageBin = utf8ToBin(message);
    const messageLenBin = bigIntToCompactUint(BigInt(messageBin.length));
  
    const preImage = new Uint8Array([
      ...prefixLenBin,
      ...prefixBin,
      ...messageLenBin,
      ...messageBin
    ]);
  
    const preImageHash = hash256(preImage);
    // Note: Standard Bitcoin message signing historically relies strictly on ECDSA.
    const sigObj = secp256k1.signMessageHashRecoverableCompact(privateKey, preImageHash);
    if (typeof sigObj === 'string') {
      throw new Error(`Signing failed: ${sigObj}`);
    }
    // Legacy format requires adding 27 for uncompressed keys, 31 for compressed keys
    const headerByte = sigObj.recoveryId + (isCompressed ? 31 : 27);
    const compactSignature = new Uint8Array([headerByte, ...sigObj.signature]);
    return binToBase64(compactSignature);
}

export async function signBchTransaction(transaction, sourceOutputsUnpacked, wif='') {
  const decodedPrivkey = decodePrivateKeyWif(wif)
  if (typeof decodedPrivkey === 'string') {
    throw signBchTxError('Not enough information provided, please include contract redeemScript')
  }

  const privateKey = decodedPrivkey.privateKey
  const pubkeyCompressed = secp256k1.derivePublicKeyCompressed(privateKey)
  if (typeof pubkeyCompressed === 'string') throw signBchTxError(pubkeyCompressed)
  const signingAddress = privateKeyToCashAddress(privateKey)

  function resolveKey(lockingBytecode, inputIndex) {
    const sourceOutput = sourceOutputsUnpacked[inputIndex]
    // CashScript contract inputs: always provide the WIF key
    if (sourceOutput?.contract?.artifact?.contractName) {
      return { privateKey, publicKey: pubkeyCompressed }
    }
    // P2PKH: only sign if address matches
    const result = lockingBytecodeToCashAddress({ bytecode: lockingBytecode })
    if (typeof result !== 'string' && result.address === signingAddress) {
      return { privateKey, publicKey: pubkeyCompressed }
    }
    return null
  }

  return signBchTransactionShared({
    transaction,
    sourceOutputs: sourceOutputsUnpacked,
    resolveKey,
  })
}

// NOTE: `sessionRequestsExample` (a large debug-only constant array) was
// removed from production bundles. If needed for debugging, reconstruct from
// git history or re-add locally.
