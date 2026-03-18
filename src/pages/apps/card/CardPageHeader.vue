<template>
  <div class="row items-center q-pa-md">
    <q-btn
      flat
      round
      dense
      icon="arrow_back"
      color="primary"
      @click="$router.back()"
    />
    <div class="col">
      <h5 class="text-primary text-weight-bold text-center q-ma-none">{{ title }}</h5>
    </div>
    <div class="q-pa-xs" style="width: 32px"></div>
  </div>
</template>

<script>
export default {
  name: 'CardPageHeader',
  props: {
    title: {
      type: String,
      default: 'Card Management'
    }
  }
}
</script>
