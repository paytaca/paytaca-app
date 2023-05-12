const sha256 = require('js-sha256')

function getWalletData (state, walletType) {
  const wallet = state.wallets[walletType]
  const hasTestnetWallets = ['bch', 'slp']

  let network = state.isChipnet ? 'chip' : 'main'
  if (walletType === 'slp') {
    network = state.isChipnet ? 'test' : 'main'
  }

  return hasTestnetWallets.includes(walletType) ? wallet[network] : wallet
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
