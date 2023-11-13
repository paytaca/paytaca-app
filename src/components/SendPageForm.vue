<template>
  <div class="row">
    <div class="col q-mt-sm se recipient-input-qr">
      <q-input
        filled
        label-slot
        class="recipient-input"
      >
        <template v-slot:label>
          {{ $t('Recipient') }}
        </template>
      </q-input>
      <q-btn
        round
        size="lg"
        class="btn-scan button text-white bg-grad"
        icon="mdi-qrcode"
      />
    </div>
  </div>

  <template>
    <div>
      <div>
        <q-input>
        </q-input>
        <div>
          ~
        </div>
      </div>
    </div>

    <div>
      <div>
        <q-input>
        </q-input>
        <div>
          ~
        </div>
      </div>
    </div>
  </template>

  <div>
    <div>
      0
      <template>
        =
      </template>
      <a>
        MAX
      </a>
    </div>
  </div>
</template>

<script>
export default {
  data () {
    return {}
  },
  methods: {
    test (value) {
      console.log('SendPageForm value', value)
    }
  }
}
</script>

<style lang="scss" scoped>
  .recipient-input-qr {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;

    .recipient-input {
      flex: 1;
      margin-right: 10px;
    }
  }
</style>
