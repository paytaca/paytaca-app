<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="val => $emit('update:modelValue', val)"
    persistent
    transition-show="fade"
    transition-hide="fade"
    backdrop-filter="blur(6px)"
  >
    <q-card
      class="create-card-dialog"
      :class="$q.dark.isActive ? 'bg-grey-9 text-white' : 'bg-white text-dark'"
      flat
    >
      <!-- Dialog Header -->
      <q-card-section class="column items-center text-center q-pa-lg">
        <q-btn 
          icon="close" 
          flat 
          round 
          dense 
          class="absolute-top-right q-ma-sm"
          :color="$q.dark.isActive ? 'grey-5' : 'grey-7'"
          @click="$emit('update:modelValue', false)" 
        />
        
        <q-icon 
          name="credit_card" 
          size="48px" 
          color="primary"
          class="q-mb-md"
        />
        
        <div class="text-h5 text-weight-bold q-mb-sm">
          {{ $t('Create Card') }}
        </div>
        
        <div class="text-body2 text-grey-6">
          {{ $t('Provide an alias for your card') }}
        </div>
      </q-card-section>

      <q-separator />

      <!-- Dialog Content -->
      <q-card-section class="q-pa-lg">
        <q-input 
          :model-value="newCardName"
          @update:model-value="val => $emit('update:newCardName', val)"
          :label="$t('Card Name')" 
          outlined 
          dense
          class="full-width"
          :hint="$t('Max of 10 characters allowed')"
          counter
          maxlength="10"
          :rules="[
            val => (val && val.length > 0) || $t('Name is required'),
            val => val.length <= 10 || $t('Maximum 10 characters')
          ]"
        >
          <template v-slot:prepend>
            <q-icon name="badge" color="grey-5" />
          </template>
        </q-input>
      </q-card-section>

      <!-- Dialog Actions -->
      <q-card-section class="q-pa-lg q-pt-none">
        <div class="row q-col-gutter-sm">
          <div class="col-6">
            <q-btn 
              outline
              :label="$t('Cancel')"
              color="grey-7"
              class="full-width"
              @click="$emit('update:modelValue', false)"
            />
          </div>
          <div class="col-6">
            <q-btn 
              unelevated
              :label="$t('Create')"
              color="primary"
              class="full-width"
              :disable="!newCardName || newCardName.length > 10"
              @click="$emit('handleCreateCard')"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script>
export default {
  props: {
    modelValue: Boolean,
    newCardName: String,
  },
  emits: ['update:modelValue', 'update:newCardName', 'handleCreateCard'],
}
</script>

<style lang="scss" scoped>
.create-card-dialog {
  width: 400px;
  max-width: 90vw;
  border-radius: 20px;
  overflow: hidden;
}

.body--light {
  .create-card-dialog {
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  }
}

.body--dark {
  .create-card-dialog {
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }
}
</style>