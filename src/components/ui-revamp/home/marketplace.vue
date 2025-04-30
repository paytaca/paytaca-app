<template>
  <div class="marketplace">
    <div class="row justify-between">
      <div class="title-medium">Shop in our Marketplace</div>
      <div class="text-capitalize body-small text-link">View more</div>
    </div>
    <div class="marketplace-options row">
      <div v-for="opt in marketplaceOpt" class="col-3 text-center">
        <q-btn  class="button-light br-15 option-button" square style="padding: 0px 10px 0px;">
          <q-icon size="24px" :name="`img:ui-revamp/${opt.icon}`"/>
        </q-btn>
        <p class="q-pt-md title-smaller option-text">{{ opt.name }}</p>
      </div>
    </div>
  </div>
</template>
<script>

export default {
  data () {
    return {
      marketplaceOpt: [
        { name: 'Entertainment', icon: 'entertainment.svg' },
        { name: 'Food and Beverage', icon: 'food-and-beverage.svg' },
        { name: 'Personal Care & Services', icon: 'personal-care-and-service.svg' },
        { name: 'Automotive', icon: 'automotive.svg' }

      ]
    }
  }
}
</script>
<style lang="scss" scoped>
.marketplace {
 margin: 24px 16px 0px;
 .marketplace-options {
    margin-top: 10px;
 }
 .option-text {
  text-align: center;
  line-height: 15px !important;
  margin: 0px 10px 0px;
  word-wrap: break-word;
  overflow-wrap: break-word;

}
.option-button {
  display: block;
  margin: auto
}
}
</style>
