<template>
  <div id="app-container" class="wallet-backup-container sticky-header-container text-bow" :class="getDarkModeClass(darkMode)">
    <header-nav :title="$t('WalletBackup')" backnavpath="/apps/settings" class="header-nav apps-header" />

    <div class="content-wrapper" :style="{ 'margin-top': $q.platform.is.ios ? '0px' : '-30px'}">
      <!-- Explanation Section -->
      <div class="explanation-section q-mx-lg q-mt-xl q-mb-md">
        <div class="explanation-content pt-card" :class="getDarkModeClass(darkMode)">
          <div class="row items-start no-wrap">
            <q-icon name="info" size="32px" class="explanation-icon" />
            <div class="col q-ml-md">
              <div class="explanation-title text-weight-bold">{{ $t('WhyBackupIsImportant', {}, 'Why Backup Is Important') }}</div>
              <div class="explanation-text q-mt-sm">
                <p class="q-mb-sm">{{ $t('BackupProtectsFunds', {}, 'Backing up your wallet protects your funds if your device is lost, stolen, or damaged. Without a backup, you cannot recover your funds.') }}</p>
                <p class="q-mb-xs">{{ $t('StoreRecoveryPhraseSecurely', {}, 'Your recovery phrase (seed phrase) is the key to your wallet. Store it securely in a safe place where only you can access it.') }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Security Banner -->
      <div class="security-banner q-mx-lg q-mb-md">
        <div class="banner-content pt-card" :class="getDarkModeClass(darkMode)">
          <div class="row items-center no-wrap">
            <q-icon name="shield" size="32px" class="banner-icon" />
            <div class="col q-ml-md">
              <div class="banner-title text-weight-bold">{{ $t('BackupMethods', {}, 'Backup Methods') }}</div>
              <div class="banner-subtitle">{{ $t('ChooseOneOrBothMethods', {}, 'Choose one or both methods below to secure your backup.') }}</div>
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
                  class="reveal-button bg-grad text-white"
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
                  class="reveal-button bg-grad text-white"
                  :label="$t('ClickToReveal')"
                  icon-right="arrow_forward"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Backup Confirmation Status -->
      <div class="backup-status-section q-mx-lg q-mt-lg q-mb-xl">
        <!-- Show info alert if backup timestamp exists -->
        <q-banner
          v-if="lastBackupTimestamp"
          class="backup-confirmed-banner pt-card br-15"
          :class="getDarkModeClass(darkMode)"
          rounded
        >
          <template v-slot:avatar>
            <q-icon name="check_circle" color="positive" size="32px" />
          </template>
          <div class="banner-content">
            <div class="banner-title text-weight-medium q-mb-xs">
              {{ $t('BackupConfirmed', {}, 'Wallet Backup Confirmed') }}
            </div>
            <div class="banner-subtitle">
              {{ $t('BackupConfirmedOn', { date: formattedBackupDate }, `Last confirmed on ${formattedBackupDate}`) }}
            </div>
          </div>
        </q-banner>
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
    },
    lastBackupTimestamp () {
      return this.$store.getters['global/lastBackupTimestamp']
    },
    formattedBackupDate () {
      if (!this.lastBackupTimestamp) {
        return ''
      }
      const date = new Date(this.lastBackupTimestamp)
      const language = this.$store.getters['global/language'] || 'en-us'
      
      // Format date with full date and time
      return new Intl.DateTimeFormat(language, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      }).format(date)
    }
  },

  methods: {
    getDarkModeClass,
    // showConfirmationDialog method removed - now handled in view-seed-phrase.vue and view-shards.vue
    toggleBackupTypeDialog (backupType) {
      console.log('[WalletBackup] toggleBackupTypeDialog called with backupType:', backupType)
      if (backupType === 'seedphrase') {
        console.log('[WalletBackup] Navigating to seed-phrase page')
        this.$router.push('/apps/wallet-backup/seed-phrase')
      } else if (backupType === 'shard') {
        console.log('[WalletBackup] Navigating to shards page')
        this.$router.push('/apps/wallet-backup/shards')
      }
    },
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

  // Explanation Section
  .explanation-section {
    .explanation-content {
      padding: 20px 24px;
      border-radius: 16px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .explanation-icon {
      color: var(--q-primary);
      flex-shrink: 0;
      margin-top: 2px;
    }

    .explanation-title {
      font-size: 18px;
      line-height: 1.4;
      margin-bottom: 8px;
    }

    .explanation-text {
      font-size: 14px;
      opacity: 0.85;
      line-height: 1.6;
    }
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

  // Backup Status Section
  .backup-status-section {
    .backup-confirmed-banner {
      padding: 16px 20px;
      
      .banner-content {
        .banner-title {
          font-size: 15px;
          line-height: 1.4;
        }
        
        .banner-subtitle {
          font-size: 13px;
          opacity: 0.85;
          line-height: 1.5;
        }
      }
    }
    
    .done-button {
      border-radius: 12px;
      font-weight: 500;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
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

    .explanation-section {
      .explanation-content {
        padding: 16px 20px;
      }

      .explanation-icon {
        font-size: 28px !important;
      }

      .explanation-title {
        font-size: 16px;
      }

      .explanation-text {
        font-size: 13px;
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
  }
</style>
