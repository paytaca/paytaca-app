<template>
  <q-page class="q-pa-lg">
    <div>
      <p>Escrow address:</p>
      <p>{{ $store.state.global.user.escrowAddress }}</p>
    </div>
    <div>
      <p>Private address:</p>
      <p>{{ $store.state.global.user.privateAddress }}</p>
    </div>
  </q-page>
</template>

<script>
export default {
  name: 'Index'
}
</script>
