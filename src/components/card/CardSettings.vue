<template>
<div v-if="activeCard" class="full-width">
  <div class="settings-section q-mb-md">
    <div class="settings-header q-pa-md">
      <div class="text-subtitle1 text-weight-bold" :class="textColor">
        Card Settings
      </div>
  </div>

  <q-separator color="primary" />

  <div class="settings-list">
      <div class="settings-item">
        <div class="settings-item-content">
          <q-icon 
            :name="activeCard?.isLocked ? 'lock_open' : 'lock'" 
            :color="activeCard?.isLocked ? 'positive' : 'warning'"
            size="24px"
          />
          <div class="q-ml-md">
            <div 
              class="text-subtitle2"
              :class="textColor"
            >
              <!-- SKELETON LOADER for lock status: <q-skeleton v-if="loadingLockStatus" type="text" width="120px" /> -->
              {{ activeCard?.isLocked ? 'Unlock Card' : 'Temporary Lock Card' }}
            </div>
            <div 
              class="text-caption"
              :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'"
            >
              {{ activeCard?.isLocked ? 'Card is currently locked' : 'Temporarily disable all transactions' }}
            </div>
          </div>
        </div>
        <q-toggle 
          v-model="isLocked"
          color="warning"
          :disable="isLocking"
          @update:model-value="onCardLockToggle"
        />
        <!-- BACKEND: Disable toggle during API call -->
      </div>

      <q-separator color="primary" />

      <div class="settings-item">
        <div class="settings-item-content">
          <q-icon 
            name="notifications" 
            :color="activeCard?.isAlertsEnabled ? 'primary' : 'grey'"
            size="24px"
          />
          <div class="q-ml-md">
            <div class="text-subtitle2"
              :class="textColor">
              Transaction Alerts
            </div>
            <div 
              class="text-caption"
              :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'">
              Get notified for every transaction
            </div>
          </div>
        </div>
        <q-toggle 
          v-model="isAlertsEnabled"
          color="primary"
          @update:model-value="onAlertsToggle"
        />
      </div>

      <q-separator color="primary" />
    </div>
  </div>

  <div 
    class="settings-section q-mb-md"
  >
    <div class="settings-header q-pa-md">
      <div 
        class="text-subtitle1 text-weight-bold"
        :class="textColor"
      >
        Funds Management
      </div>
    </div>

    <q-separator color="primary" />

    <div class="settings-list">
      <div class="settings-item clickable" @click="showSweepFundsDialog = true">
        <div class="settings-item-content">
          <q-icon name="swap_horiz" color="info" size="24px" />
          <div class="q-ml-md">
            <div 
              class="text-subtitle2"
              :class="textColor"
            >
              Sweep Funds
            </div>
            <div 
              class="text-caption"
              :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'"
            >
              Transfer all funds back to wallet
            </div>
          </div>
        </div>
        <q-icon name="chevron_right" :color="$q.dark.isActive ? 'grey-5' : 'grey-7'" />
      </div>
    </div>
  </div>

  <div 
    class="settings-section"
  >
    <div class="settings-header q-pa-md">
      <div 
        class="text-subtitle1 text-weight-bold"
        :class="textColor"
      >
        Danger Zone
      </div>
    </div>

    <q-separator color="primary" />

    <div class="settings-list">
      <div 
        class="settings-item" 
        :class="{ 'clickable': !hasCardBalance, 'disabled-item': hasCardBalance }"
        @click="hasCardBalance ? null : showDeleteCardDialog = true"
      >
        <div class="settings-item-content">
          <q-icon name="delete" :color="hasCardBalance ? 'grey-5' : 'negative'" size="24px" />
          <div class="q-ml-md">
            <div :class="hasCardBalance ? 'text-grey-5' : 'text-subtitle2 text-negative'">Delete Card</div>
            <div 
              class="text-caption"
              :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'"
            >
              Permanently remove this card
            </div>
          </div>
        </div>
        <q-icon name="chevron_right" :color="$q.dark.isActive ? 'grey-5' : 'grey-7'" />
        <q-tooltip v-if="hasCardBalance" anchor="top middle" self="bottom middle">
          Please sweep all funds before deleting your card
        </q-tooltip>
      </div>
    </div>
  </div>
</div>
</template>
<script>
import CardMixin from 'src/mixins/card/card-mixin';

export default {
  name: 'CardSettings',
  mixins: [CardMixin],
  props: {
    activeCard: {
      type: Object,
      required: true
    },
  },
  data() {
    return {
      isLocked: this.activeCard?.isLocked || false,
      isAlertsEnabled: this.activeCard?.isAlertsEnabled || false,
      isLocking: false
    }
  },
  computed: {
    hasCardBalance() {
      return this.activeCard?.bchBalance > 0;
    }
  },
  methods: {
    async onCardLockToggle(isLocked) {
      this.isLocking = true;
      try {
        // Call API to update lock status
        const card = await this.$store.dispatch('card/updateCardLockStatus', {
          cardId: this.activeCard.id,
          isLocked
        });
        console.log('Updated card lock status:', card);
        // Optionally show a success message
        this.$q.notify({
          type: 'positive',
          message: `Card has been ${isLocked ? 'locked' : 'unlocked'} successfully!`
        });
      } catch (error) {
        // Revert toggle state on error
        this.isLocked = !isLocked;
        // Show error message
        this.$q.notify({
          type: 'negative',
          message: `Failed to ${isLocked ? 'lock' : 'unlock'} the card. Please try again.`
        });
      } finally {
        this.isLocking = false;
      }
    },
    async onAlertsToggle(isAlertsEnabled) {
      try {
        // Call API to update alerts status
        await this.$store.dispatch('card/updateCardAlertsStatus', {
          cardId: this.activeCard.id,
          isAlertsEnabled
        });
        // Optionally show a success message
        this.$q.notify({
          type: 'positive',
          message: `Transaction alerts have been ${isAlertsEnabled ? 'enabled' : 'disabled'} successfully!`
        });
      } catch (error) {
        // Revert toggle state on error
        this.isAlertsEnabled = !isAlertsEnabled;
        // Show error message
        this.$q.notify({
          type: 'negative',
          message: `Failed to update transaction alerts. Please try again.`
        });
      }
    },
    saveCardSettings() {
      // Emit event to save other card settings like transaction alerts
      this.$emit('save-card-settings', this.activeCard);
    }
  }
}
</script>
<style lang="scss" scoped>
  @import "src/css/app-card.scss";
</style>