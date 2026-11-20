import { computed, ref } from 'vue'
import { Dialog, Notify } from 'quasar'
import { deriveHdPath } from '@bitauth/libauth'
import { decodePrivateKeyWif, lockingBytecodeToCashAddress } from 'bitauth-libauth-v3'
import { Store } from 'src/store'
import { i18n } from 'src/boot/i18n'
import Watchtower from 'src/lib/watchtower'
import { isCurrentWalletReadOnly } from 'src/lib/readonly-wallet'
import { loadLibauthHdWallet } from 'src/wallet'
import { parseExtendedJson, privateKeyToCashAddress } from 'src/wallet/bch-sign'
import { parseSessionRequest, signBchTransaction, signMessage } from 'src/wallet/walletconnect2'
import { decodeWcTransaction } from 'src/wallet/walletconnect2/tx-sign-utils'
import { shortenAddressForDisplay } from 'src/utils/address-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import {
  BEX_PROVIDER_STATE_KEY,
  chainIdOf,
  isWebOrigin,
  networkOfChainId,
  normalizePermission,
  parseRequestAccountsParams,
  permissionKey,
  permissionOrigin,
  permissionsFrom,
  toWireJson
} from 'src/utils/bex'
import BexConnectDialog from 'src/components/bex/BexConnectDialog.vue'
import SessionRequestDialog from 'src/components/walletconnect/SessionRequestDialog.vue'
import SecurityCheckDialog from 'src/components/SecurityCheckDialog.vue'

export class BexRpcError extends Error {
  constructor (code, message) {
    super(message)
    this.name = 'BexRpcError'
    this.code = code
  }
}

const { t } = i18n.global
const RECEIVE_ADDRESS_OPTIONS = 5
const POLL_MS = 200

const permissions = ref({})
let permissionsReady

function currentNetwork () {
  return Store.getters['global/isChipnet'] ? 'chipnet' : 'mainnet'
}

function addressPrefix () {
  return Store.getters['global/isChipnet'] ? 'bchtest' : 'bitcoincash'
}

export const bexActiveWalletId = computed(() => {
  const walletHash = Store.getters['global/getWallet']('bch')?.walletHash
  return walletHash ? `${currentNetwork()}:${walletHash}` : undefined
})

export const bexActivePermissions = computed(() => {
  const walletId = bexActiveWalletId.value
  return Object.fromEntries(
    Object.entries(permissions.value).filter(([, permission]) => walletId && permission.walletId === walletId)
  )
})

export function loadBexPermissions () {
  if (permissionsReady) return permissionsReady
  permissionsReady = chrome.storage.local.get(null)
    .then(items => { permissions.value = permissionsFrom(items) })
    .catch(() => { permissions.value = {} })
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return
    permissionsReady.then(() => {
      let next
      for (const [key, change] of Object.entries(changes)) {
        const origin = permissionOrigin(key)
        if (!origin) continue
        next ??= { ...permissions.value }
        const permission = normalizePermission(change.newValue)
        if (permission) next[origin] = permission
        else delete next[origin]
      }
      if (next) permissions.value = next
    })
  })
  return permissionsReady
}

export async function revokeBexOrigin (origin) {
  await chrome.storage.local.remove(permissionKey(origin))
  const next = { ...permissions.value }
  delete next[origin]
  permissions.value = next
}

export function writeBexProviderState () {
  const walletId = bexActiveWalletId.value
  if (!walletId) return Promise.resolve()
  const network = currentNetwork()
  const state = { chainId: chainIdOf(network), network, walletId }
  return chrome.storage.local.set({ [BEX_PROVIDER_STATE_KEY]: state }).catch(() => {})
}

export function bexSiteMetadata (origin, permission) {
  return {
    name: permission?.metadata?.name || origin,
    description: permission?.metadata?.description || '',
    url: origin,
    icons: permission?.metadata?.icons ?? []
  }
}

const cancelled = () => new BexRpcError(5000, 'Request cancelled by the dApp')
const rejected = () => new BexRpcError(5000, 'User rejected.')
const invalidParams = message => new BexRpcError(-32602, message)

function walletReady () {
  return Boolean(Store.state.global.appInitialLoadComplete) &&
    !Store.state.global.walletSwitchInProgress &&
    Boolean(bexActiveWalletId.value) &&
    (!Store.getters['global/lockApp'] || Store.getters['global/isUnlocked'])
}

async function waitForWallet (signal) {
  while (!walletReady()) {
    if (signal.aborted) throw cancelled()
    await new Promise(resolve => setTimeout(resolve, POLL_MS))
  }
  if (signal.aborted) throw cancelled()
  return bexActiveWalletId.value
}

function dialogClass () {
  return `br-15 pt-card text-bow ${getDarkModeClass(Store.getters['darkmode/getStatus'])}`
}

function chipnetWarning () {
  if (!Store.getters['global/isChipnet']) return undefined
  return t(
    'BexChipnetKeysWarning',
    {},
    'Chipnet uses the same keys as your mainnet wallet. A signature made here could also spend your mainnet coins, so only approve requests from sites you trust.'
  )
}

function explainRefusal (message, signal) {
  if (signal.aborted) return Promise.resolve()
  return new Promise(resolve => {
    const dialog = Dialog.create({
      title: t('Error'),
      message,
      ok: { label: t('OK'), color: 'primary', noCaps: true, rounded: true },
      class: dialogClass()
    }).onDismiss(resolve)
    signal.addEventListener('abort', () => dialog.hide(), { once: true })
  })
}

function showApproval (component, componentProps, signal) {
  if (signal.aborted) return Promise.reject(cancelled())
  return new Promise((resolve, reject) => {
    let settled = false
    const settle = (callback, value) => {
      if (settled) return
      settled = true
      callback(value)
    }
    const dialog = Dialog.create({ component, componentProps })
      .onOk(payload => settle(resolve, payload))
      .onCancel(() => settle(reject, rejected()))
      .onDismiss(() => settle(reject, rejected()))
    signal.addEventListener('abort', () => {
      settle(reject, cancelled())
      dialog.hide()
    }, { once: true })
  })
}

async function assertSigningWallet (signal) {
  if (!isCurrentWalletReadOnly()) return
  await explainRefusal(
    t('BexReadOnlyWallet', {}, 'The Paytaca extension cannot sign with a read-only wallet. Connect a wallet that holds its private keys to use it with sites.'),
    signal
  )
  throw new BexRpcError(4900, 'Paytaca cannot sign with a read-only wallet')
}

async function assertNetwork (chainId, signal) {
  if (chainId === undefined || chainId === chainIdOf(currentNetwork())) return
  const required = networkOfChainId(chainId)
  if (!required) {
    await explainRefusal(t('BexUnsupportedChain', { chainId }, 'This site asked for an unsupported network ({chainId}).'), signal)
    throw new BexRpcError(4901, `Unsupported chain ${chainId}`)
  }
  await explainRefusal(
    t('BexNetworkMismatch', { network: required }, 'This site needs a wallet on {network}. Switch Paytaca to {network} and connect again.'),
    signal
  )
  throw new BexRpcError(4901, `This dApp needs a wallet on ${required}`)
}

function connectedPermission (origin, walletId) {
  const permission = Object.hasOwn(permissions.value, origin) ? permissions.value[origin] : undefined
  return permission?.walletId === walletId ? permission : undefined
}

function requirePermission (origin, walletId) {
  const permission = connectedPermission(origin, walletId)
  if (!permission) throw new BexRpcError(4100, 'Unauthorized: call bch_requestAccounts first')
  return permission
}

function currentReceiveIndex () {
  const wallet = Store.getters['global/getWallet']('bch')
  const candidates = [
    wallet?.lastAddressAndIndex?.address_index,
    parseInt(String(wallet?.lastAddressIndex ?? ''), 10)
  ].filter(Number.isSafeInteger)
  return candidates.length ? Math.max(0, ...candidates) : 0
}

async function receiveAddressOptions () {
  const hdWallet = await loadLibauthHdWallet(Store.getters['global/getWalletIndex'], Store.getters['global/isChipnet'])
  const mainNode = hdWallet.getMainNode()
  const prefix = addressPrefix()
  const options = []
  for (let index = currentReceiveIndex(); index >= 0 && options.length < RECEIVE_ADDRESS_OPTIONS; index--) {
    const node = deriveHdPath(mainNode, `m/0/${index}`)
    if (typeof node === 'string') throw new BexRpcError(-32603, node)
    options.push({ index, address: privateKeyToCashAddress(node.privateKey, prefix) })
  }
  return options
}

async function signingWif (permission, walletId) {
  if (bexActiveWalletId.value !== walletId) throw new BexRpcError(4100, 'The open wallet changed')
  const hdWallet = await loadLibauthHdWallet(Store.getters['global/getWalletIndex'], Store.getters['global/isChipnet'])
  const wif = hdWallet.getPrivateKeyWifAt(`0/${permission.addressIndex}`)
  const decoded = decodePrivateKeyWif(wif)
  if (typeof decoded === 'string' || privateKeyToCashAddress(decoded.privateKey, addressPrefix()) !== permission.accounts[0]) {
    throw new BexRpcError(4100, 'The connected account is not in the open wallet')
  }
  return wif
}

async function requestAccounts (origin, params, signal) {
  let request
  try {
    request = parseRequestAccountsParams(params)
  } catch (error) {
    throw invalidParams(error.message)
  }
  const walletId = await waitForWallet(signal)
  await assertSigningWallet(signal)
  await assertNetwork(request.chainId, signal)

  const connected = connectedPermission(origin, walletId)
  if (connected) return connected.accounts

  const addresses = await receiveAddressOptions()
  const metadata = bexSiteMetadata(origin, { metadata: request.dappMetadata })
  const selected = await showApproval(BexConnectDialog, {
    origin,
    metadata,
    network: currentNetwork(),
    addresses,
    warning: chipnetWarning()
  }, signal)
  const option = addresses.find(item => item.index === selected?.index)
  if (!option) throw rejected()
  if (bexActiveWalletId.value !== walletId) throw new BexRpcError(4900, 'The open wallet changed')

  const permission = normalizePermission({
    accounts: [option.address],
    walletId,
    addressIndex: option.index,
    connectedAt: Date.now(),
    metadata: request.dappMetadata
  })
  if (!permission) throw new BexRpcError(-32603, 'Could not store the connection')
  await chrome.storage.local.set({ [permissionKey(origin)]: permission })
  permissions.value = { ...permissions.value, [origin]: permission }
  return permission.accounts
}

function sessionRequestFor (origin, permission, method, params) {
  return {
    id: 0,
    topic: origin,
    params: { chainId: chainIdOf(currentNetwork()), request: { method, params } },
    verifyContext: { verified: { origin } },
    session: { peer: { metadata: bexSiteMetadata(origin, permission) } }
  }
}

function formatAddress (address, lockingBytecode) {
  if (lockingBytecode instanceof Uint8Array) {
    const result = lockingBytecodeToCashAddress({ bytecode: lockingBytecode, prefix: addressPrefix(), tokenSupport: false })
    if (typeof result !== 'string') return shortenAddressForDisplay(result.address)
  }
  return address ? shortenAddressForDisplay(address) : ''
}

async function confirmRequest (sessionRequest, signal) {
  const payload = await showApproval(SessionRequestDialog, {
    sessionRequest,
    addressDisplayFormat: 'cashaddr',
    addressDisplayFormatter: formatAddress,
    warning: chipnetWarning()
  }, signal)
  if (payload?.response !== 'confirm') throw rejected()
  await showApproval(SecurityCheckDialog, {}, signal)
}

function messageRequestOf (params) {
  if (!params || typeof params !== 'object' || Array.isArray(params) || typeof params.message !== 'string') {
    throw invalidParams('Message signing needs a { message } object')
  }
  return {
    message: params.message,
    ...(typeof params.userPrompt === 'string' ? { userPrompt: params.userPrompt } : {})
  }
}

async function signMessageRequest (origin, params, signal) {
  const request = messageRequestOf(params)
  const walletId = await waitForWallet(signal)
  await assertSigningWallet(signal)
  const permission = requirePermission(origin, walletId)
  await confirmRequest(sessionRequestFor(origin, permission, 'bch_signMessage', request), signal)
  const wif = await signingWif(permission, walletId)
  if (signal.aborted) throw cancelled()
  return signMessage(request.message, wif)
}

function sameBytes (a, b) {
  return a instanceof Uint8Array && b instanceof Uint8Array && a.length === b.length && a.every((byte, index) => byte === b[index])
}

function transactionRequestOf (params) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    throw invalidParams('Transaction signing needs a { transaction, sourceOutputs } object')
  }
  let request
  try {
    request = parseExtendedJson(JSON.stringify(params))
    request.transaction = decodeWcTransaction(request.transaction)
  } catch (error) {
    throw invalidParams(`Invalid transaction: ${error?.message || error}`)
  }
  const { transaction, sourceOutputs } = request
  if (!Array.isArray(transaction?.inputs) || !Array.isArray(transaction?.outputs)) {
    throw invalidParams('Invalid transaction: inputs and outputs are required')
  }
  if (!Array.isArray(sourceOutputs) || sourceOutputs.length !== transaction.inputs.length) {
    throw invalidParams('Transaction inputs and sourceOutputs length mismatch')
  }
  sourceOutputs.forEach((sourceOutput, index) => {
    const input = transaction.inputs[index]
    if (sourceOutput?.outpointTransactionHash === undefined && sourceOutput?.outpointIndex === undefined) return
    if (!sameBytes(sourceOutput.outpointTransactionHash, input.outpointTransactionHash) || sourceOutput.outpointIndex !== input.outpointIndex) {
      throw invalidParams(`sourceOutputs[${index}] does not match the outpoint of input ${index}`)
    }
  })
  return request
}

async function broadcastTransaction (signedTransaction) {
  let message
  try {
    const response = await new Watchtower(Store.getters['global/isChipnet']).BCH.broadcastTransaction(signedTransaction)
    if (response?.data?.success) return
    message = response?.data?.error
  } catch (error) {
    message = error?.response?.data?.error || error?.message
  }
  message = message || 'Broadcast failed'
  Notify.create({ type: 'error', message, timeout: 5000 })
  throw new BexRpcError(-32603, `Transaction failed to send: ${message}`)
}

async function signTransactionRequest (origin, params, signal) {
  const request = transactionRequestOf(params)
  const walletId = await waitForWallet(signal)
  await assertSigningWallet(signal)
  const permission = requirePermission(origin, walletId)
  const sessionRequest = parseSessionRequest(sessionRequestFor(origin, permission, 'bch_signTransaction', toWireJson(request)))
  const { transaction, sourceOutputs } = sessionRequest.params.request.params

  await confirmRequest(sessionRequest, signal)
  const wif = await signingWif(permission, walletId)
  if (signal.aborted) throw cancelled()

  let signed
  try {
    signed = await signBchTransaction(transaction, sourceOutputs, wif)
  } catch (error) {
    throw new BexRpcError(-32603, error?.name === 'SignBCHTransactionError' ? error.message : 'Failed to sign the transaction')
  }
  if (request.broadcast !== false) await broadcastTransaction(signed.signedTransaction)
  return signed
}

export async function handleBexRequest ({ origin, method, params }, signal) {
  if (!isWebOrigin(origin)) throw new BexRpcError(4100, 'Paytaca serves http(s) sites only')
  await loadBexPermissions()
  switch (method) {
    case 'bch_requestAccounts':
    case 'bch_connect':
      return requestAccounts(origin, params, signal)
    case 'bch_signMessage':
    case 'personal_sign':
      return signMessageRequest(origin, params, signal)
    case 'bch_signTransaction':
      return signTransactionRequest(origin, params, signal)
    default:
      throw new BexRpcError(1001, `Unsupported method ${method}`)
  }
}
