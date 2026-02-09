<template>
  <q-list>
    <template
      v-for="record in list"
      :key="record.letter_group"
    >
      <template v-if="record.data.length > 0">
        <q-item-label 
          header 
          class="text-weight-bold"
          :id="`letter-group-${record.letter_group}`"
        >
          {{ record.letter_group.toLocaleUpperCase() }}
        </q-item-label>
  
        <q-card
          flat
          bordered
          class="q-mb-sm q-mx-md record-card"
          v-for="rec in record.data"
          :key="rec.id"
        >
          <q-item
            clickable
            v-ripple
            @click="$router.push(`view-record/${rec.id}/`)"
          >
            <q-item-section>
              <q-item-label id="name-label">{{ rec.name }}</q-item-label>
              <q-item-label caption>
                {{ rec.address_count }}
                {{ rec.address_count === 1 ? 'address' : 'addresses' }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-card>
      </template>
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

<style lang="scss" scoped>
#name-label {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>