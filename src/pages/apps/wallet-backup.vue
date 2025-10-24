<template>
  <div id="app-container" class="wallet-backup-container sticky-header-container" :class="getDarkModeClass(darkMode)">
    <header-nav :title="$t('WalletBackup')" backnavpath="/apps" class="header-nav apps-header" />

    <div class="content-wrapper" :style="{ 'margin-top': $q.platform.is.ios ? '0px' : '-30px'}">
      <!-- Security Banner -->
      <div class="security-banner q-mx-lg q-mt-xl q-mb-md">
        <div class="banner-content pt-card" :class="getDarkModeClass(darkMode)">
          <div class="row items-center no-wrap">
            <q-icon name="shield" size="32px" class="banner-icon" />
            <div class="col q-ml-md">
              <div class="banner-title text-weight-bold">{{ $t('SecureYourWallet', {}, 'Secure Your Wallet') }}</div>
              <div class="banner-subtitle">{{ $t('BackupYourRecoveryPhrase', {}, 'Backup your recovery phrase to restore your wallet') }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Backup Options -->
      <div class="backup-options q-px-lg">
        <!-- Seed Phrase Card -->
        <div class="backup-card-wrapper q-mb-lg">
          <div class="backup-card pt-card clickable" :class="getDarkModeClass(darkMode)" @click="toggleBackupTypeDialog('seedphrase')">
            <div class="card-header">
              <div class="icon-wrapper bg-grad">
                <q-icon name="vpn_key" size="28px" color="white" />
              </div>
              <div class="card-title-section">
                <div class="card-title">{{ $t('SeedPhrase', {}, 'Seed Phrase') }}</div>
                <div class="card-subtitle">{{ $t('ViewYour12WordPhrase', {}, 'View your 12-word recovery phrase') }}</div>
              </div>
            </div>
            
            <div class="card-divider" :class="getDarkModeClass(darkMode)"></div>
            
            <div class="card-body">
              <div class="feature-list">
                <div class="feature-item">
                  <q-icon name="check_circle" size="18px" class="feature-icon" />
                  <span>{{ $t('StandardRecoveryMethod', {}, 'Standard recovery method') }}</span>
                </div>
                <div class="feature-item">
                  <q-icon name="check_circle" size="18px" class="feature-icon" />
                  <span>{{ $t('CompatibleWithMostWallets', {}, 'Compatible with most wallets') }}</span>
                </div>
                <div class="feature-item">
                  <q-icon name="check_circle" size="18px" class="feature-icon" />
                  <span>{{ $t('WriteDownAndStoreSafely', {}, 'Write down and store safely') }}</span>
                </div>
              </div>
              
              <div class="action-area">
                <q-btn
                  unelevated
                  no-caps
                  class="reveal-button bg-grad"
                  :label="$t('ClickToReveal')"
                  icon-right="arrow_forward"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Shards Card -->
        <div class="backup-card-wrapper">
          <div class="backup-card pt-card clickable" :class="getDarkModeClass(darkMode)" @click="toggleBackupTypeDialog('shard')">
            <div class="card-header">
              <div class="icon-wrapper bg-grad">
                <q-icon name="workspaces" size="28px" color="white" />
              </div>
              <div class="card-title-section">
                <div class="card-title">{{ $t('SeedPhraseShards') }}</div>
                <div class="card-subtitle">{{ $t('SplitYourPhraseInto3Shards', {}, 'Split your phrase into 3 shards - only 2 needed to recover') }}</div>
              </div>
            </div>
            
            <div class="card-divider" :class="getDarkModeClass(darkMode)"></div>
            
            <div class="card-body">
              <div class="feature-list">
                <div class="feature-item">
                  <q-icon name="check_circle" size="18px" class="feature-icon" />
                  <span>{{ $t('EnhancedSecurity', {}, 'Enhanced security method') }}</span>
                </div>
                <div class="feature-item">
                  <q-icon name="check_circle" size="18px" class="feature-icon" />
                  <span>{{ $t('DistributeAcrossLocations', {}, 'Distribute across multiple locations') }}</span>
                </div>
                <div class="feature-item">
                  <q-icon name="check_circle" size="18px" class="feature-icon" />
                  <span>{{ $t('ReducesSinglePointOfFailure', {}, 'Reduces single point of failure') }}</span>
                </div>
              </div>
              
              <div class="action-area">
                <q-btn
                  unelevated
                  no-caps
                  class="reveal-button bg-grad"
                  :label="$t('ClickToReveal')"
                  icon-right="arrow_forward"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Warning Footer -->
      <div class="warning-footer q-mx-lg q-mt-lg q-mb-xl">
        <div class="warning-content pt-card-2" :class="getDarkModeClass(darkMode)">
          <div class="row items-start">
            <q-icon name="warning" size="24px" class="warning-icon text-warning" />
            <div class="col q-ml-sm">
              <div class="warning-title text-weight-bold">{{ $t('ImportantReminder', {}, 'Important Reminder') }}</div>
              <div class="warning-text">
                {{ $t('NeverShareYourRecoveryPhrase', {}, 'Never share your recovery phrase with anyone. Anyone with access to it can access your funds.') }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import HeaderNav from 'src/components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'app-wallet-backup',

  components: {
    HeaderNav
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  methods: {
    getDarkModeClass,
    toggleBackupTypeDialog (backupType) {
      if (backupType === 'seedphrase') {
        this.$router.push('/apps/wallet-backup/seed-phrase')
      } else if (backupType === 'shard') {
        this.$router.push('/apps/wallet-backup/shards')
      }
    }
  }
}
</script>

<style lang="scss" scoped>
  .wallet-backup-container {
    min-height: 100vh;
    padding-bottom: 40px;
  }

  .content-wrapper {
    max-width: 800px;
    margin: 0 auto;
  }

  // Security Banner
  .security-banner {
    .banner-content {
      padding: 20px 24px;
      border-radius: 16px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
      }
    }

    .banner-icon {
      color: var(--q-primary);
      flex-shrink: 0;
    }

    .banner-title {
      font-size: 18px;
      line-height: 1.4;
      margin-bottom: 4px;
    }

    .banner-subtitle {
      font-size: 14px;
      opacity: 0.8;
      line-height: 1.4;
    }
  }

  // Backup Cards
  .backup-card-wrapper {
    .backup-card {
      border-radius: 20px;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      
      &.clickable {
        cursor: pointer;
        
        &:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
          
          .reveal-button {
            transform: scale(1.02);
          }
        }
        
        &:active {
          transform: translateY(-2px);
        }
      }
    }

    .card-header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 24px 24px 20px 24px;

      .icon-wrapper {
        width: 56px;
        height: 56px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .card-title-section {
        flex: 1;
        min-width: 0;
      }

      .card-title {
        font-size: 18px;
        font-weight: 600;
        line-height: 1.4;
        margin-bottom: 6px;
      }

      .card-subtitle {
        font-size: 13px;
        opacity: 0.7;
        line-height: 1.4;
      }
    }

    .card-divider {
      height: 1px;
      margin: 0 24px;
      
      &.dark {
        background: rgba(255, 255, 255, 0.1);
      }
      
      &.light {
        background: rgba(0, 0, 0, 0.08);
      }
    }

    .card-body {
      padding: 20px 24px 24px 24px;

      .feature-list {
        margin-bottom: 20px;

        .feature-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 0;
          font-size: 14px;
          line-height: 1.5;

          .feature-icon {
            color: var(--q-primary);
            flex-shrink: 0;
          }

          span {
            opacity: 0.9;
          }
        }
      }

      .action-area {
        display: flex;
        justify-content: flex-end;
        padding-top: 8px;

        .reveal-button {
          padding: 10px 24px;
          border-radius: 12px;
          font-weight: 500;
          font-size: 14px;
          letter-spacing: 0.3px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          
          &:hover {
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
          }
        }
      }
    }
  }

  // Warning Footer
  .warning-footer {
    .warning-content {
      padding: 20px 24px;
      border-radius: 16px;
      border-left: 4px solid var(--q-warning);
    }

    .warning-icon {
      flex-shrink: 0;
      margin-top: 2px;
    }

    .warning-title {
      font-size: 15px;
      margin-bottom: 6px;
      line-height: 1.4;
    }

    .warning-text {
      font-size: 13px;
      opacity: 0.85;
      line-height: 1.6;
    }
  }

  // Responsive Design
  @media (max-width: 600px) {
    .backup-card-wrapper {
      .card-header {
        padding: 20px 20px 16px 20px;

        .icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          
          .q-icon {
            font-size: 24px !important;
          }
        }

        .card-title {
          font-size: 16px;
        }

        .card-subtitle {
          font-size: 12px;
        }
      }

      .card-divider {
        margin: 0 20px;
      }

      .card-body {
        padding: 16px 20px 20px 20px;

        .feature-list .feature-item {
          font-size: 13px;
          padding: 6px 0;
        }

        .action-area .reveal-button {
          padding: 8px 20px;
          font-size: 13px;
        }
      }
    }

    .security-banner {
      .banner-content {
        padding: 16px 20px;
      }

      .banner-icon {
        font-size: 28px !important;
      }

      .banner-title {
        font-size: 16px;
      }

      .banner-subtitle {
        font-size: 13px;
      }
    }

    .warning-footer {
      .warning-content {
        padding: 16px 20px;
      }

      .warning-icon {
        font-size: 20px !important;
      }

      .warning-title {
        font-size: 14px;
      }

      .warning-text {
        font-size: 12px;
      }
    }
  }
</style>
