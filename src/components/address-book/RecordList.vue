<template>
  <q-list>
    <template
      v-for="record in list"
      :key="record.letter_group"
    >
      <q-item-label header class="text-weight-bold">
        {{ record.letter_group.toLocaleUpperCase() }}
      </q-item-label>

      <q-card
        class="q-mb-sm q-mx-md"
        v-for="rec in record.data"
        :key="rec.id"
      >
        <q-item
          clickable
          v-ripple
        >
          <q-item-section>
            <q-item-label>{{ rec.name }}</q-item-label>
            <q-item-label caption>
              {{ rec.address_count }}
              {{ rec.address_count === 1 ? 'address' : 'addresses' }}
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-card>
    </template>
  </q-list>
</template>

<script>
export default {
  name: 'RecordList',

  props: {
    list: { type: Array, default: new Array() }
  }
}
</script>