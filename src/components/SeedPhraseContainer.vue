<template>
  <div class="row">
    <template v-for="(word, index) in mnemonic.split(' ')" :key="`${word}-${index}`">
      <div class="row col-6 items-center" style="font-size: 18px;">
        <div class="col-2 number">
          <pre>{{ index + 1 }}</pre>
        </div>
        <div class="col-10">
          <span class="word">{{ word }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
export default {
  name: 'SeedPhraseContainer',
  props: {
    mnemonic: String
  }
}
</script>

<style lang="scss" scoped>
  .number {
    color: #D36EE1;
    pre {
      margin: 10px 0
    }
  }
  .word {
      background:#AAB2E9;
      padding: 5px 15px;
      border-radius: 20px;
      color: #fff;
  }
</style>
