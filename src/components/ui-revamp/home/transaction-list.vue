<template>
  <q-card class="transaction-history br-15" :style="{ 'padding-bottom': $q.platform.is.ios ? '110px' : '100px'}">
    <div class="card-content">
      <div class="title-small" style="padding-top: 10px;">Transaction History</div>

      <!-- <div class="transaction-list">
        <div class="circle-frame">
          <img :src="getUserAvatarLink('Nikki')">
        </div>
      </div> -->
    </div>
  </q-card>
</template>
<script>
import { getUserAvatarLink } from 'src/utils/theme-ui-revamp-utils.js'

export default {
  data () {
    return {
      transactions: [
      ]
    }
  },
  methods: {
    getUserAvatarLink
  }
}
</script>
<style lang="scss" scoped>
.transaction-history {
  width: 100%;
  margin-top: 24px;
  .card-content {
    margin: 10px 16px 0px;
  }
  .transaction-list {
    margin-top: 10px;
    .circle-frame {
      border-radius: 50%;
      height: 100px;
      width: 100px;
      // background-color: aquamarine;
      display: flex;
      overflow: hidden;
    }
    .circle-frame img{
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

}
</style>
