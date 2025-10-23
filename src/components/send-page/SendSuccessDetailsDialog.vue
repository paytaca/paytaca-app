<template>
  <q-dialog persistent seamless ref="dialog" class="no-click-outside details-dialog">
    <q-card class="details-card pt-card text-bow" :class="getDarkModeClass(darkMode)">
      <!-- Header -->
      <div class="dialog-header">
        <div class="header-content">
          <q-icon name="receipt_long" size="24px" class="header-icon" />
          <span class="header-title">
            {{ $t('TransactionDetails') }}
          </span>
        </div>
        <q-btn
          flat
          round
          dense
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>

      <q-separator :class="getDarkModeClass(darkMode, 'bg-grey-8', 'bg-grey-4')" />

      <!-- Transaction Info Section -->
      <div class="transaction-info-section">
        <!-- Amount Sent -->
        <div class="info-card" :class="getDarkModeClass(darkMode, 'info-card-dark', 'info-card-light')">
          <div class="info-label">
            <q-icon name="payments" size="18px" class="q-mr-xs" />
            <template v-if="!isNFT">{{ $t('TotalAmountSent') }}</template>
            <template v-else>{{ $t('Sent') }}</template>
          </div>
          <div class="info-value">
            <template v-if="!isNFT">
              <span class="amount-primary">{{ totalSent }}</span>
              <span v-if="!isCashToken" class="amount-secondary">{{ totalFiatSent }}</span>
            </template>
            <template v-else>
              <span class="amount-primary">{{ name }}</span>
            </template>
          </div>
        </div>

        <!-- Reference ID -->
        <div class="info-card" :class="getDarkModeClass(darkMode, 'info-card-dark', 'info-card-light')">
          <div class="info-label">
            <q-icon name="tag" size="18px" class="q-mr-xs" />
            {{ $t('ReferenceId') }}
          </div>
          <div class="info-value monospace-value">
            {{ txid.substring(0, 6).toUpperCase() }}
          </div>
        </div>

        <!-- Transaction ID -->
        <div class="info-card" :class="getDarkModeClass(darkMode, 'info-card-dark', 'info-card-light')">
          <div class="info-label">
            <q-icon name="fingerprint" size="18px" class="q-mr-xs" />
            {{ $t('TransactionId') }}
          </div>
          <div class="info-value">
            <div class="txid-wrapper">
              <span class="txid-display" @click="copyTxid">
                {{ txid.slice(0, 12) }}...{{ txid.slice(-12) }}
                <q-icon name="content_copy" size="16px" class="copy-icon-inline" />
              </span>
            </div>
            <a
              class="explorer-link"
              :class="getDarkModeClass(darkMode)"
              :href="getExplorerLink(txid)"
              target="_blank"
            >
              <q-icon name="open_in_new" size="14px" class="q-mr-xs" />
              {{ $t('ViewInExplorer') }}
            </a>
          </div>
        </div>

        <!-- Timestamp -->
        <div class="info-card" :class="getDarkModeClass(darkMode, 'info-card-dark', 'info-card-light')">
          <div class="info-label">
            <q-icon name="schedule" size="18px" class="q-mr-xs" />
            {{ $t('TimeSent') }}
          </div>
          <div class="info-value timestamp-value">
            {{ timestamp }}
          </div>
        </div>
      </div>

      <q-separator :class="getDarkModeClass(darkMode, 'bg-grey-8', 'bg-grey-4')" class="q-my-md" />

      <!-- Recipients Section -->
      <div class="recipients-section">
        <div class="recipients-header">
          <q-icon name="people" size="20px" class="q-mr-xs" />
          <span class="recipients-title">{{ $t('Recipients') }}</span>
          <q-badge 
            :label="breakdownList.length" 
            color="primary" 
            class="q-ml-sm"
          />
        </div>

        <q-scroll-area class="recipients-scroll-area">
          <div
            v-for="(data, index) in breakdownSublist"
            :key="index"
            class="recipient-item"
            :class="getDarkModeClass(darkMode, 'recipient-item-dark', 'recipient-item-light')"
          >
            <div class="recipient-number">
              #{{ index + 1 + (8 * (breakdownPage - 1)) }}
            </div>
            <div class="recipient-details">
              <div class="recipient-address" @click="copyAddress(data.address)">
                {{ data.address }}
                <q-icon name="content_copy" size="14px" class="copy-icon-small" />
              </div>
              <div class="recipient-amount">{{ data.amount }}</div>
            </div>
          </div>
        </q-scroll-area>

        <div v-if="maxPages > 1" class="pagination-wrapper">
          <q-pagination
            v-model="breakdownPage"
            :max="maxPages"
            :max-pages="6"
            :dark="darkMode"
            direction-links
            boundary-links
            icon-first="skip_previous"
            icon-last="skip_next"
            icon-prev="chevron_left"
            icon-next="chevron_right"
            @update:model-value="paginateList"
          />
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { getExplorerLink } from 'src/utils/send-page-utils'

export default {
  name: 'SendSuccessDetailsDialog',

  props: {
    isNFT: { type: Boolean, default: false },
    isCashToken: { type: Boolean, default: false },

    totalSent: { type: String, default: '' },
    totalFiatSent: { type: String, default: '' },
    txid: { type: String, default: '' },
    timestamp: { type: String, default: '' },
    name: { type: String, default: '' },

    breakdownList: { type: Array, default: Array }
  },

  data () {
    return {
      breakdownPage: 1,
      maxPages: 0,
      breakdownSublist: []
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  mounted () {
    this.maxPages = Math.ceil(this.breakdownList.length / 8)
    this.breakdownSublist = this.breakdownList.slice(0, 8)
  },

  methods: {
    getDarkModeClass,
    
    getExplorerLink (txid) {
      return getExplorerLink(txid, this.isCashToken)
    },
    
    paginateList () {
      this.breakdownSublist = this.breakdownList.slice(
        (8 * (this.breakdownPage - 1)), (8 * this.breakdownPage)
      )
    },
    
    copyTxid () {
      this.$copyText(this.txid)
      this.$q.notify({
        message: this.$t('TransactionIdCopied', {}, 'Transaction ID copied to clipboard'),
        timeout: 800,
        color: 'blue-9',
        icon: 'mdi-clipboard-check'
      })
    },
    
    copyAddress (address) {
      this.$copyText(address)
      this.$q.notify({
        message: this.$t('AddressCopied', {}, 'Address copied to clipboard'),
        timeout: 800,
        color: 'blue-9',
        icon: 'mdi-clipboard-check'
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.details-dialog {
  .details-card {
    max-width: 600px;
    width: 90vw;
    border-radius: 16px;
    overflow: hidden;
  }

  // Header
  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    
    .header-content {
      display: flex;
      align-items: center;
      gap: 12px;
      
      .header-icon {
        color: var(--q-primary);
      }
      
      .header-title {
        font-size: 20px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    }
    
    .close-button {
      &:hover {
        background: rgba(128, 128, 128, 0.1);
      }
    }
  }

  // Transaction Info Section
  .transaction-info-section {
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;

    .info-card {
      padding: 16px;
      border-radius: 12px;
      border: 1px solid rgba(128, 128, 128, 0.2);
      transition: all 0.2s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }

      &.info-card-dark {
        background: rgba(255, 255, 255, 0.03);
        
        &:hover {
          background: rgba(255, 255, 255, 0.05);
        }
      }

      &.info-card-light {
        background: rgba(0, 0, 0, 0.02);
        
        &:hover {
          background: rgba(0, 0, 0, 0.04);
        }
      }

      .info-label {
        display: flex;
        align-items: center;
        font-size: 13px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        opacity: 0.7;
        margin-bottom: 8px;
      }

      .info-value {
        font-size: 16px;
        font-weight: 500;
        word-break: break-all;

        &.monospace-value {
          font-family: 'Courier New', monospace;
          font-size: 20px;
          font-weight: 700;
          letter-spacing: 4px;
        }

        &.timestamp-value {
          font-size: 14px;
          line-height: 1.5;
        }

        .amount-primary {
          font-size: 20px;
          font-weight: 700;
          display: block;
          margin-bottom: 4px;
        }

        .amount-secondary {
          font-size: 16px;
          opacity: 0.7;
        }

        .txid-wrapper {
          margin-bottom: 8px;

          .txid-display {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            padding: 8px 12px;
            background: rgba(128, 128, 128, 0.1);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;

            &:hover {
              background: rgba(128, 128, 128, 0.2);
              transform: scale(1.02);
              
              .copy-icon-inline {
                opacity: 1;
              }
            }

            .copy-icon-inline {
              opacity: 0.6;
              transition: opacity 0.2s ease;
            }
          }
        }

        .explorer-link {
          display: inline-flex;
          align-items: center;
          text-decoration: none;
          color: var(--q-primary);
          font-size: 14px;
          font-weight: 500;
          padding: 6px 12px;
          border-radius: 6px;
          transition: all 0.2s ease;

          &:hover {
            background: rgba(0, 128, 0, 0.1);
            transform: translateX(4px);
          }

          &.dark {
            color: #4ade80;
          }
        }
      }
    }
  }

  // Recipients Section
  .recipients-section {
    padding: 0 24px 24px;

    .recipients-header {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
      padding: 12px;
      background: linear-gradient(135deg, rgba(0, 128, 0, 0.1), rgba(0, 100, 200, 0.1));
      border-radius: 8px;

      .recipients-title {
        font-size: 16px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    }

    .recipients-scroll-area {
      height: 45vh;
      border-radius: 8px;
      
      .recipient-item {
        display: flex;
        gap: 12px;
        padding: 16px;
        margin-bottom: 12px;
        border-radius: 10px;
        border: 1px solid rgba(128, 128, 128, 0.15);
        transition: all 0.25s ease;

        &:hover {
          transform: translateX(4px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        &.recipient-item-dark {
          background: rgba(255, 255, 255, 0.02);
          
          &:hover {
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(128, 128, 128, 0.3);
          }
        }

        &.recipient-item-light {
          background: rgba(0, 0, 0, 0.01);
          
          &:hover {
            background: rgba(0, 0, 0, 0.03);
            border-color: rgba(128, 128, 128, 0.3);
          }
        }

        .recipient-number {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 40px;
          height: 40px;
          background: var(--q-primary);
          color: white;
          border-radius: 50%;
          font-weight: 700;
          font-size: 13px;
          flex-shrink: 0;
        }

        .recipient-details {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;

          .recipient-address {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            word-break: break-all;
            cursor: pointer;
            display: flex;
            align-items: flex-start;
            gap: 6px;
            line-height: 1.4;
            padding: 8px;
            border-radius: 6px;
            background: rgba(128, 128, 128, 0.05);
            transition: all 0.2s ease;

            &:hover {
              background: rgba(128, 128, 128, 0.1);
              
              .copy-icon-small {
                opacity: 1;
              }
            }

            .copy-icon-small {
              opacity: 0.5;
              transition: opacity 0.2s ease;
              margin-top: 2px;
              flex-shrink: 0;
            }
          }

          .recipient-amount {
            font-size: 15px;
            font-weight: 600;
            color: var(--q-primary);
            padding-left: 8px;
          }
        }
      }
    }

    .pagination-wrapper {
      margin-top: 16px;
      display: flex;
      justify-content: center;
    }
  }
}
</style>
