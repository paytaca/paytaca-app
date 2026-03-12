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
      flat
    >
      <!-- Dialog Header -->
      <q-card-section class="row items-center q-pb-sm">
        <div class="text-h6 text-weight-bold text-center">
          Create Card
          <div class="text-caption text-center">Provide an alias for your card</div>
        </div>
        <q-space />
        <q-btn icon="close" flat round dense @click="$emit('update:modelValue', false)" />
      </q-card-section>

      <q-separator />

      <!-- Dialog Content -->
      <q-card-section>
        <q-input 
          :model-value="newCardName"
          @update:model-value="val => $emit('update:newCardName', val)"
          label="Name" 
          outlined 
          dense 
          hint="Max of 10 characters allowed"
          counter
          maxlength="10"
          :rules="[
            val => (val && val.length > 0) || 'Name is required',
            val => val.length <= 10 || 'Maximum 10 characters'
          ]"
        ></q-input>
      </q-card-section>

      <q-separator />

      <!-- Dialog Actions -->
      <q-card-actions align="right">
        <q-btn 
          flat
          label="Cancel"
          color="grey-7"
          @click="$emit('update:modelValue',false)"
        />
        <q-btn 
          unelevated
          label="Create"
          color="primary"
          :disable="!newCardName || newCardName.length > 10"
          @click="$emit('handleCreateCard')"
        />
      </q-card-actions>
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
  @import "./createCard.scss"
</style>