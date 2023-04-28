<template>
  <div
    style="border-bottom:1px solid grey;"
    class="q-pb-sm q-mx-lg q-mt-md"
  >
    <div class="row">
      <div class="q-space">
        <q-skeleton height="15px" width="6em"/>
        <q-skeleton height="12px" :width="(Math.random() * 3 + 3) + 'em'" class="q-mt-sm"/>
      </div>
      <div class="column items-end">
        <q-skeleton height="1em" :width="(Math.random() * 4 + 4) + 'em'"/>
        <q-skeleton height="0.9em" :width="(Math.random() * 3 + 3) + 'em'" class="q-mt-sm"/>
      </div>
    </div>
  </div>
</template>
