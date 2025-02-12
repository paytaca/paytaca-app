<template>
  <template v-if="index === 0">
    <div class="col-1">
      <span
        class="status-chip"
        :class="isCompleted ? 'completed' : 'not-completed'"
      >
        <q-icon
          size="xs"
          color="white"
          :name="isCompleted ? 'check' : 'close'"
        />
      </span>
    </div>
  </template>

  <template v-else>
    <div class="col-1">
      <span
        class="status-chip indexed"
        :class="isCompleted ? 'completed' : 'not-completed'"
      >
        {{ index }}
      </span>
    </div>
  </template>
</template>

<script>
export default {
  name: 'StatusChip',

  props: {
    isCompleted: { type: Boolean, default: false },
    index: { type: Number, default: 0 }
  }
}
</script>

<style lang="scss">
.status-chip {
  border-radius: 25%;
  padding: 2px;

  &.indexed {
    padding: 2px 5px;
    color: white;
  }

  &.not-completed {
    background-color: $negative;
  }
  &.completed {
    background-color: $positive;
  }
}
</style>
