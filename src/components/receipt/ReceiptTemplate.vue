<template>
  <div
    class="receipt-wrapper"
    :style="wrapperStyle"
  >
    <div class="receipt-bg-decoration" :style="bgDecorationStyle"></div>
    <div class="receipt-bg-decoration-2" :style="bgDecoration2Style"></div>

    <div class="receipt-content" :style="contentStyle">
      <div class="receipt-header">
        <div class="receipt-title">Transaction Receipt</div>

        <div class="receipt-amount-box" :style="amountBoxStyle">
          <div class="receipt-type-label">{{ isReceived ? 'Received' : 'Sent' }}</div>
          <div class="receipt-amount" :style="{ fontSize: amtFontSize + 'px' }">{{ amount }}</div>
          <div v-if="fiatAmount" class="receipt-fiat">{{ fiatAmount }}</div>
        </div>

        <div class="receipt-details">
          <div v-if="hasFee && txFeeFormatted" class="receipt-detail-row">
            <div class="receipt-detail-label">Network Fee</div>
            <div class="receipt-detail-value">{{ txFeeString }}</div>
          </div>

          <div v-if="referenceId" class="receipt-detail-row">
            <div class="receipt-detail-label">Reference ID</div>
            <div class="receipt-detail-value" style="font-size:20px">{{ referenceId }}</div>
          </div>

          <div v-if="merchantData" class="receipt-detail-row" style="text-align:center">
            <div class="receipt-detail-label">Paid To</div>
            <div class="receipt-merchant-info">
              <img v-if="merchantLogoSrc" :src="merchantLogoSrc" class="receipt-merchant-logo" />
              <span class="receipt-merchant-name">{{ merchantData.name }}</span>
              <br />
              <span
                class="receipt-merchant-badge"
                :style="merchantBadgeStyle"
              >{{ merchantData.verified ? 'Verified' : 'Unverified' }}</span>
            </div>
          </div>

          <div class="receipt-detail-row">
            <div class="receipt-detail-label">Transaction ID</div>
            <div class="receipt-detail-value receipt-txid">{{ truncatedTxId }}</div>
            <div v-if="explorerLink" class="receipt-qr-wrap">
              <div v-html="qrSvg"></div>
            </div>
          </div>

          <div class="receipt-detail-row">
            <div class="receipt-detail-label">Date &amp; Time</div>
            <div class="receipt-detail-value">{{ dateTime }}</div>
          </div>
        </div>

        <div v-if="hasMemo && transactionMemo" class="receipt-memo-section">
          <div class="receipt-detail-label">Memo</div>
          <div class="receipt-memo-text">{{ transactionMemo }}</div>
        </div>

        <div class="receipt-footer">
          <div class="receipt-logo-wrap">
            <img :src="logoSrc" class="receipt-logo-img" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import paytacaLogoHorizontal from 'src/assets/paytaca_logo_horizontal.png'
import QRCode from 'qrcode-svg'

export default {
  name: 'receipt-template',
  props: {
    isReceived: Boolean,
    amount: { type: String, default: '' },
    fiatAmount: { type: String, default: null },
    dateTime: { type: String, default: '' },
    referenceId: { type: String, default: '' },
    explorerLink: { type: String, default: '' },
    txFeeFormatted: { type: String, default: null },
    hasFee: Boolean,
    txFeeInFiat: { type: [Number, String], default: null },
    merchantData: { type: Object, default: null },
    merchantLogoSrc: { type: String, default: '' },
    hasMemo: Boolean,
    transactionMemo: { type: String, default: '' },
    transactionId: { type: String, default: '' }
  },
  data () {
    return {
      logoSrc: paytacaLogoHorizontal
    }
  },
  computed: {
    wrapperStyle () {
      return {
        background: 'linear-gradient(135deg, #0ac18e 0%, #00d4aa 50%, #0d9488 100%)',
        padding: '40px 35px',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif",
        width: '600px',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden'
      }
    },
    bgDecorationStyle () {
      return {
        position: 'absolute',
        top: '-100px',
        right: '-100px',
        width: '400px',
        height: '400px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '50%',
        zIndex: 0
      }
    },
    bgDecoration2Style () {
      return {
        position: 'absolute',
        bottom: '-150px',
        left: '-150px',
        width: '500px',
        height: '500px',
        background: 'rgba(255, 255, 255, 0.08)',
        borderRadius: '50%',
        zIndex: 0
      }
    },
    contentStyle () {
      return {
        position: 'relative',
        zIndex: 1,
        background: 'white',
        borderRadius: '24px',
        padding: '35px 30px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
      }
    },
    amountBoxStyle () {
      return {
        background: 'linear-gradient(135deg, #0ac18e 0%, #00d4aa 100%)',
        borderRadius: '20px',
        padding: '30px',
        marginBottom: '40px',
        boxShadow: '0 8px 24px rgba(10, 193, 142, 0.3)'
      }
    },
    amtFontSize () {
      const len = (this.amount || '').length
      if (len > 18) return 28
      if (len > 15) return 34
      if (len > 12) return 42
      return 48
    },
    truncatedTxId () {
      if (!this.transactionId) return ''
      return `${this.transactionId.slice(0, 8)}...${this.transactionId.slice(-8)}`
    },
    txFeeString () {
      if (!this.txFeeFormatted) return ''
      if (this.txFeeInFiat !== null && this.txFeeInFiat !== undefined && !Number.isNaN(Number(this.txFeeInFiat))) {
        return `${this.txFeeFormatted} (${this.txFeeInFiat})`
      }
      return this.txFeeFormatted
    },
    merchantBadgeStyle () {
      if (!this.merchantData) return {}
      return {
        display: 'inline-block',
        marginTop: '8px',
        fontSize: '12px',
        fontWeight: 600,
        padding: '4px 12px',
        borderRadius: '12px',
        color: this.merchantData.verified ? '#22543d' : '#4a5568',
        background: this.merchantData.verified ? '#c6f6d5' : '#e2e8f0'
      }
    },
    qrSvg () {
      if (!this.explorerLink) return ''
      const qrcode = new QRCode({
        content: this.explorerLink,
        width: 200,
        height: 200,
        padding: 2,
        color: '#000000',
        background: '#ffffff',
        ecl: 'M'
      })
      return qrcode.svg()
    }
  },
  mounted () {
    // Ensure QR SVG has correct dimensions
    this.$nextTick(() => {
      const svg = this.$el.querySelector('.receipt-qr-wrap svg')
      if (svg) {
        svg.setAttribute('width', '200')
        svg.setAttribute('height', '200')
      }
    })
  }
}
</script>

<style scoped>
.receipt-wrapper {
  line-height: 1.4;
}
.receipt-title {
  font-size: 32px;
  font-weight: 700;
  color: #2d3748;
  line-height: 1.4;
  margin-bottom: 30px;
  text-align: center;
}
.receipt-type-label {
  font-size: 18px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 12px;
}
.receipt-amount {
  font-weight: 800;
  color: white;
  letter-spacing: -1px;
  white-space: nowrap;
}
.receipt-fiat {
  font-size: 24px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 0.2px;
  margin-top: 12px;
}
.receipt-details {
  margin-bottom: 35px;
}
.receipt-detail-row {
  margin-bottom: 20px;
}
.receipt-detail-label {
  font-size: 12px;
  font-weight: 600;
  color: #718096;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}
.receipt-detail-value {
  font-size: 18px;
  font-weight: 600;
  color: #2d3748;
  letter-spacing: 0.2px;
}
.receipt-txid {
  font-family: monospace;
  word-break: break-all;
  line-height: 1.4;
}
.receipt-merchant-info {
  text-align: center;
}
.receipt-merchant-logo {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  vertical-align: middle;
  margin-right: 10px;
}
.receipt-merchant-name {
  font-size: 18px;
  font-weight: 700;
  color: #2d3748;
  vertical-align: middle;
}
.receipt-qr-wrap {
  display: flex;
  justify-content: center;
  margin-top: 12px;
  margin-bottom: 8px;
}
.receipt-memo-section {
  margin-top: 25px;
  margin-bottom: 25px;
  text-align: center;
}
.receipt-memo-text {
  font-size: 16px;
  font-weight: 600;
  color: #2d3748;
  word-break: break-word;
  line-height: 1.5;
}
.receipt-footer {
  text-align: center;
  padding-top: 5px;
}
.receipt-logo-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 6px;
}
.receipt-logo-img {
  height: 60px;
  width: auto;
  object-fit: contain;
  display: block;
}
</style>
