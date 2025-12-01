<template>
  <div
    class="transaction-item q-mx-lg q-px-sm q-py-sm compact"
    style="border-bottom: 1px solid rgba(0, 0, 0, 0.06);"
  >
    <div class="transaction-content">
      <div class="transaction-header">
        <div class="transaction-type">
          <q-skeleton height="15px" width="6em"/>
          <q-skeleton height="14px" width="5em" style="margin-top: 2px;"/>
        </div>
        <div class="transaction-amount">
          <q-skeleton height="16px" width="5em"/>
          <q-skeleton height="13px" width="4em" style="margin-top: 2px;"/>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.transaction-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  
  &.dark {
    border-bottom-color: rgba(255, 255, 255, 0.08);
  }
  
  &:last-child {
    border-bottom: none;
  }
}

.transaction-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.transaction-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.transaction-type {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.transaction-amount {
  text-align: right;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}
</style>
