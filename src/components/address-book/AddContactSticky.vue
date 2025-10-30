<template>
  <q-page-sticky position="bottom-right" :offset="[18, 18]">
    <q-btn
      fab
      icon="mdi-account-plus"
      color="primary"
    >
      <q-tooltip
        anchor="center left"
        self="center right"
        :offset="[10, 10]"
      >
        Add New Contact
      </q-tooltip>
    </q-btn>
  </q-page-sticky>
</template>

<script>
export default {
  name: 'AddContactSticky'
}
</script>