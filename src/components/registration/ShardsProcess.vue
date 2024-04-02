<template>
  <p>Shard yey</p>
  <!-- 1st process screenshot -->
  <!-- 2nd process Google login -->
  <!-- 3rd process pictured using another device (disable screenshot) -->
  <q-btn
    rounded
    label="Continue"
    class="full-width button"
  />
</template>

<script>
import sss from 'shamirs-secret-sharing'
import { toHex } from 'hex-my-bytes'

export default {
  name: 'ShardsProcess',

  props: {
    mnemonic: String
  },

  data () {
    return {
      shards: []
    }
  },

  mounted () {
    const vm = this

    const secret = Buffer.from(vm.mnemonic)
    const shares = sss.split(secret, { shares: 3, threshold: 2 })
    vm.shards = shares.map(a => toHex(a))
    // const recovered = sss.combine([shards[0], shards[1]])
    // console.log('recovered', recovered.toString())
  }
}
</script>
