const sha256 = require('js-sha256')

function getWalletData (state, walletType) {
  const hasTestnetWallets = ['bch', 'slp']
  if (hasTestnetWallets.includes(walletType)) {
    if (state.isChipnet) {
      return state.chipnet__wallets[walletType]
    }
  }
  return state.wallets[walletType]
}

export function isWalletsRecovered (state) {
  return state.walletsRecovered
}

export function walletRecoveryMessage(state) {
  return state.walletRecoveryMessage
}

export function backupReminderDismissed (state) {
  return state.backupReminderDismissed
}

export function lastBackupTimestamp (state) {
  // Get last backup timestamp from current wallet's settings
  const walletIndex = state.walletIndex
  if (state.vault?.[walletIndex]?.settings) {
    return state.vault[walletIndex].settings.lastBackupTimestamp || null
  }
  return null
}

export function theme (state) {
  return state.theme
}

export function language (state) {
  return state.language
}

export function country (state) {
  return state.country
}

export function network (state) {
  return state.network
}

export function getConnectivityStatus (state) {
  return state.online
}

export function isChipnet (state) {
  return state.isChipnet
}

export function autoGenerateAddress(state) {
  return state.autoGenerateAddress
}

export function enableStablhedge (state) {
  return state.enableStablhedge
}

export function enableSLP (state) {
  return state.enableSLP
}

export function enableSmartBCH (state) {
  return state.enableSmartBCH
}

export function getAddress (state) {
  return function (walletType) {
    const wallet = getWalletData(state, walletType)
    return wallet.lastAddress
  }
}

export function getLastAddressIndex (state) {
  return function (walletType) {
    const wallet = getWalletData(state, walletType)
    return wallet.lastAddressIndex
  }
}

export function getChangeAddress (state) {
  return function (walletType) {
    const wallet = getWalletData(state, walletType)
    return wallet.lastChangeAddress
  }
}

export function getWallet (state) {
  return function (walletType) {
    return getWalletData(state, walletType)
  }
}

export function getUtxoScanInfo(state) {
  return (walletHash) => {
    const utxoScanInfo = state.utxoScanTasks[walletHash]
    const data = {
      timestamp: utxoScanInfo?.timestamp || 0,
      lastUpdate: utxoScanInfo?.lastUpdate || 0,
      taskId: utxoScanInfo?.taskId || 0,
      status: utxoScanInfo?.status || 'PENDING',
      completedAt: utxoScanInfo?.completedAt || 0,
      queueInfo: utxoScanInfo?.queueInfo,
    }
    return data
  }
}

export function isVaultEmpty (state) {
  const vault = state.vault
  if (vault.length === 0) {
    return true
  } else {
    return false
  }
}

export function getAllWalletTypes (state) {
  return state.wallets
}

export function getAllChipnetTypes (state) {
  return state.chipnet__wallets
}

export function getVault (state) {
  return state.vault
}

export function getWalletIndex (state) {
  return state.walletIndex
}

/**
 * Get wallet hash for a specific vault index
 * @param {Object} state
 * @param {number} index - The vault index
 * @returns {string|null} The wallet hash or null if not found
 */
export function getWalletHashByIndex (state) {
  return (index) => {
    const wallet = state.vault?.[index]
    return wallet?.wallet?.bch?.walletHash || 
           wallet?.wallet?.BCH?.walletHash ||
           wallet?.BCH?.walletHash || 
           wallet?.bch?.walletHash ||
           wallet?.walletHash ||
           null
  }
}

/**
 * Get vault index by wallet hash
 * @param {Object} state
 * @param {string} walletHash - The wallet hash
 * @returns {number|null} The vault index or null if not found
 */
export function getVaultIndexByWalletHash (state) {
  return (walletHash) => {
    if (!walletHash || !state.vault || state.vault.length === 0) return null
    
    const normalizedHash = String(walletHash).trim()
    
    const index = state.vault.findIndex(wallet => {
      if (!wallet || wallet.deleted) return false
      
      const hash = wallet?.wallet?.bch?.walletHash || 
                   wallet?.wallet?.BCH?.walletHash ||
                   wallet?.BCH?.walletHash ||
                   wallet?.bch?.walletHash ||
                   wallet?.walletHash
      
      if (!hash) return false
      
      return String(hash).trim() === normalizedHash
    })
    
    return index !== -1 ? index : null
  }
}

/**
 * Get wallet from vault by wallet hash
 * @param {Object} state
 * @param {string} walletHash - The wallet hash
 * @returns {Object|null} The wallet object or null if not found
 */
export function getWalletByHash (state) {
  return (walletHash) => {
    const index = getVaultIndexByWalletHash(state)(walletHash)
    if (index === null) return null
    return state.vault?.[index] || null
  }
}

export function getDefaultAssetLogo () {
  return function (val = '') {
    const string = sha256(String(val))

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    const canvasSize = 250
    const colorPallete = [
      '#f94144',
      '#f3722c',
      '#f8961e',
      '#f9c74f',
      '#90be6d',
      '#43aa8b'
    ]
    const colorShiftCount = parseInt(string.substring(0, 2), 16) % colorPallete.length
    for (var i = 0; i < colorShiftCount; i++) {
      colorPallete.push(colorPallete.shift())
    }

    const bgColor = '#577590'

    function drawTriangle (ctx, p1, p2, p3) {
      ctx.beginPath()
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.lineTo(p3.x, p3.y)
      ctx.fill()
    }

    function drawEquilateralTriangle (ctx, x, y, length, angle) {
      // degrees to radians
      const radian = Math.PI / 180
      angle = Math.abs(angle)
      if (Number.isNaN(angle)) angle = 0

      const p2 = {
        x: x + Math.cos((angle + 150) * radian) * length,
        y: y + Math.sin((angle + 150) * radian) * length
      }

      const p3 = {
        x: x + Math.cos((angle + 210) * radian) * length,
        y: y + Math.sin((angle + 210) * radian) * length
      }

      drawTriangle(ctx, { x, y }, p2, p3)
    }

    canvas.width = canvasSize
    canvas.height = canvasSize
    const halfHeight = canvas.height / 2
    const halfWidth = canvas.width / 2
    const sideLength = halfHeight / 2

    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    let quadrant = 1
    for (var i = 0; i < Math.min(string.length / 8, colorPallete.length); i++) {
      ctx.fillStyle = colorPallete[i % colorPallete.length]
      const up = quadrant === 1 || quadrant === 2
      const left = quadrant === 2 || quadrant === 3
      const x = parseInt(string.substring(i * 8 + 0, i * 8 + 2), 16) / 256
      const y = parseInt(string.substring(i * 8 + 6, i * 8 + 8), 16) / 256

      const xOffset = x * sideLength * (left ? -1 : 1)
      const yOffset = y * sideLength * (up ? -1 : 1)
      let startAngle = 0
      if (quadrant === 4) startAngle = 0
      if (quadrant === 3) startAngle = 90
      if (quadrant === 2) startAngle = 180
      if (quadrant === 1) startAngle = 270

      const angle = startAngle + (parseInt(string.substring(i * 8, (i + 1) * 8), 16) % 90)

      drawEquilateralTriangle(
        ctx,
        xOffset + halfWidth,
        yOffset + halfHeight,
        halfWidth * 2,
        angle
      )

      quadrant = (quadrant % 4) + 1
    }

    return canvas.toDataURL('image/png')
  }
}

export function getConnectedAddress (state) {
  return function (walletType) {
    const walletData = getWalletData(state, walletType)
    return walletData.connectedAddress
  }
}

export function getConnectedAddressIndex (state) {
  return function (walletType) {
    const walletData = getWalletData(state, walletType)
    return walletData.connectedAddressIndex
  }
}

export function getConnectedSites (state) {
  return function (walletType) {
    const walletData = getWalletData(state, walletType)
    return walletData.connectedSites
  }
}

export function denomination (state) {
  return state.denomination
}

export function walletAddresses (state) {
  if (state.isChipnet) {
    return state.chipnet__wallets.bch.walletAddresses
  }
  return state.wallets.bch.walletAddresses
}

export function walletConnectedApps (state) {
  if (state.isChipnet) {
    return state.chipnet__wallets.bch.connectedApps
  }
  return state.wallets.bch.connectedApps
}

export function lastUsedAddressAtAppUrl (state) {
  return function (appUrl) {
    let connectedApps = state.wallets.bch.connectedApps
    if (state.isChipnet) {
      connectedApps = state.chipnet__wallets.bch.connectedApps
    }
    return connectedApps?.find((connectedApp) => {
      return connectedApp.app_url === appUrl
    })
  }
}

export function lastAddressAndIndex (state) {
  if (state.isChipnet) {
    return state.chipnet__wallets.bch.lastAddressAndIndex
  }
  return state.wallets.bch.lastAddressAndIndex
}

export function appControl (state) {
  return state.appControl
}

export function merchantActivity (state) {
  return state.merchantActivity
}

export function getWatchtowerBaseUrl (state) {
  
  if (state.isChipnet) {
    return 'https://chipnet.watchtower.cash'
  }
  return 'https://watchtower.cash'
}

/**
 * Get preferred security method for current wallet
 * Returns 'pin' or 'biometric'
 */
export function preferredSecurity (state) {
  const walletIndex = state.walletIndex
  if (state.vault?.[walletIndex]?.settings) {
    const pref = state.vault[walletIndex].settings.preferredSecurity || 'pin'
    // Normalize Quasar storage format (e.g., "__q_strn|pin" -> "pin")
    return typeof pref === 'string' && pref.includes('|') ? pref.split('|').pop() : pref
  }
  // Fallback to localStorage for backward compatibility during migration
  try {
    const storedPref = globalThis?.localStorage 
      ? globalThis.localStorage.getItem('preferredSecurity') 
      : null
    if (storedPref) {
      // Normalize Quasar storage format (e.g., "__q_strn|pin" -> "pin")
      return typeof storedPref === 'string' && storedPref.includes('|') ? storedPref.split('|').pop() : storedPref
    }
    return 'pin'
  } catch {
    return 'pin'
  }
}

/**
 * Get lock app setting for current wallet
 * Returns true if app lock is enabled, false otherwise
 */
export function lockApp (state) {
  const walletIndex = state.walletIndex
  if (state.vault?.[walletIndex]?.settings) {
    return Boolean(state.vault[walletIndex].settings.lockApp)
  }
  return false
}

/**
 * Transaction list timestamp display preference.
 * true: relative timestamps (e.g. "5 minutes ago")
 * false: absolute timestamps (date + time) formatted using user's locale
 */
export function relativeTxTimestamp (state) {
  const walletIndex = state.walletIndex
  const value = state.vault?.[walletIndex]?.settings?.relativeTxTimestamp
  if (value === undefined || value === null) return true
  return Boolean(value)
}

/**
 * Check if ANY wallet in the vault has lock app enabled
 * Returns true if at least one wallet has lock enabled, false otherwise
 * Used for security checks that should apply globally when any wallet is protected
 */
export function anyWalletHasLockEnabled (state) {
  if (!state.vault || !Array.isArray(state.vault)) {
    return false
  }
  return state.vault.some(wallet => {
    if (!wallet || wallet.deleted === true) {
      return false
    }
    return Boolean(wallet.settings?.lockApp)
  })
}

/**
 * Get current unlock state
 * Returns true if app is unlocked in current session
 */
export function isUnlocked (state) {
  return Boolean(state.isUnlocked)
}
