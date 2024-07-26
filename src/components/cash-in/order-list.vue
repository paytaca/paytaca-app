<template>
  <div class="q-mx-md">
    <div class="text-center" :class="darkMode ? 'text-blue-6' : 'text-blue-8'" style="font-size: 20px;">
      Cash In Orders
    </div>

    <q-card flat bordered class="q-mt-lg q-mx-md pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
      <q-virtual-scroll :items="orders" style="max-height: 35vh;">
        <template v-slot="{ item: order, index }">
          <q-item clickable :key="index" @click="$emit('open-order', order.id)">
            <q-item-section>
              <div class="row">
                <div style="font-size: medium;">Order # {{ order.id }}</div>
                <q-space/>
                <div class="text-grey" style="font-size: small;">{{ order.status }}</div>
              </div>
            </q-item-section>
          </q-item>
          <q-separator class="q-mx-sm" v-if="index !== orders.length - 1"/>
        </template>
      </q-virtual-scroll>
    </q-card>
  </div>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  data () {
    return {
      orders: [
        { id: 100, status: 'PENDING' },
        { id: 102, status: 'PENDING' }
      ]
    }
  },
  emits: ['open-order'],
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },
  methods: {
    getDarkModeClass
  }
}
</script>
