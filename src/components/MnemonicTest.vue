<template>
  <div>
    <div
      style="min-height:9rem;"
      class="q-pa-sm rounded-borders q-ma-sm pt-card dark"
    >
      <q-btn
        v-if="rearrangedSeedphrase.length"
        icon="clear"
        flat
        round
        size="sm"
        class="float-right close-button"
        @click="reset()"
      />
      <div class="row items-start q-gutter-sm">
        <q-btn
          v-for="(word, index) in rearrangedSeedphrase"
          :key="word"
          no-caps
          :label="`${index+1}. ${word}`"
          padding="xs sm"
          color="brandblue"
          rounded
          @click="toggleRearrangedSeedphraseWord(word, false)"
        />
      </div>
    </div>
    <div class="text-center q-mb-md">
      {{ $t('VerifyMnemonicBackupPhrase') }}
    </div>
    <div class="q-mx-sm q-mt-sm">
      <div class="row justify-around q-gutter-sm" id="shuffled"> 
        <q-btn class="shuffledphrase"
          v-for="word in shuffledSeedphrase"
          :key="word"
          rounded
          no-caps
          :label="word"
          padding="xs sm"
          color="brandblue"
          @click="toggleRearrangedSeedphraseWord(word)"
        />
      </div>
    </div>
  </div>
</template>
<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useStore } from 'vuex'

const $store = useStore()
const $emit = defineEmits(['matched'])
const props = defineProps({
  mnemonic: String,
})

const seedPhrase = computed(() => props.mnemonic.trim().split(' '))
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

let shuffledSeedphrase = ref([])
let rearrangedSeedphrase = ref([])

function reset () {
  shuffledSeedphrase.value = props.mnemonic.trim().split(' ')
  shuffleArray(shuffledSeedphrase.value)
  rearrangedSeedphrase.value = []
}

onMounted(() => shuffleSeedphrase())
function shuffleSeedphrase() {
  shuffledSeedphrase.value = [...seedPhrase.value]
  shuffleArray(shuffledSeedphrase.value)
  rearrangedSeedphrase.value = rearrangedSeedphrase.value.filter(word => shuffledSeedphrase.value.indexOf(word) < 0)
}
/**
 * Fisher-Yates shuffle
 * @param {String[]} array 
 * @link https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
 */
function shuffleArray(array) {
  let currentIndex = array.length,  randomIndex;
  // While there remain elements to shuffle.
  while (currentIndex != 0) {

    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}

function toggleRearrangedSeedphraseWord(word='', fromShuffledPhrase=true) {
  if (fromShuffledPhrase) {
    rearrangedSeedphrase.value.push(word)
    delete shuffledSeedphrase.value[shuffledSeedphrase.value.indexOf(word)]
    shuffledSeedphrase.value = shuffledSeedphrase.value.filter(w => w !== undefined)
  } else {
    shuffledSeedphrase.value.push(word)
    delete rearrangedSeedphrase.value[rearrangedSeedphrase.value.indexOf(word)]
    rearrangedSeedphrase.value = rearrangedSeedphrase.value.filter(w => w !== undefined)
  }
}

const matched = computed(() => {
  if (rearrangedSeedphrase.value.length !== seedPhrase.value.length) return false

  for (var i = 0; i < seedPhrase.value.length; i++) {
    if (seedPhrase.value[i] !== rearrangedSeedphrase.value[i]) return false
  }
  return true
})
watch(matched, () => matched.value ? $emit('matched') : null)
</script>
