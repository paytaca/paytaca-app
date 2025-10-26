# Pull-to-Refresh Optimization

## Problem
Pull-to-refresh was triggering prematurely when users scrolled within nested scrollable elements. This created a sub-optimal user experience where:
- Scrolling down in a transaction list would trigger pull-to-refresh
- Users couldn't smoothly scroll through content without accidentally triggering a refresh
- The refresh would interrupt the user's scrolling action

## Solution
Implemented the `preventPull` method pattern (already used in several components) across all scrollable sub-elements.

### How It Works
The `preventPull` method prevents pull-to-refresh from triggering when a scrollable element is not at the top:

```javascript
function preventPull(e) {
  // Find the scrollable parent element with class 'scroll-y'
  let parent = e.target
  while (parent !== void 0 && !parent.classList.contains('scroll-y')) {
    parent = parent.parentNode
  }
  
  // If element is scrolled down (scrollTop > 0), prevent pull-to-refresh
  if (parent !== void 0 && parent.scrollTop > 0) {
    e.stopPropagation()
  }
}
```

### Implementation Steps
1. Add `scroll-y` class to the scrollable container
2. Add `@touchstart="preventPull"` event handler to the container
3. Implement the `preventPull` method in the component

### Files Updated

#### Transaction Components
- `src/components/transactions/TransactionList.vue`
  - Added `scroll-y` class and `@touchstart="preventPull"` to root div
  - Implemented `preventPull` method

- `src/components/stablehedge/StablehedgeHistory.vue`
  - Added `scroll-y` class and `@touchstart="preventPull"` to root div
  - Implemented `preventPull` method

### Existing Implementations (Already Working)
These components already had the fix implemented:
- `src/components/ramp/fiat/StoreListings.vue`
- `src/components/ramp/fiat/OrderListings.vue`
- `src/components/ramp/fiat/AdListings.vue`
- `src/components/paytacapos/merchant-cash-out/CashoutOrderList.vue`
- `src/components/paytacapos/merchant-cash-out/CashoutIndex.vue`
- `src/components/cash-in/CashinOrderList.vue`
- And others...

## Behavior After Fix

### Before
- User scrolls down in transaction list → Pull-to-refresh triggers immediately
- Interrupts scrolling experience
- Confusing UX

### After
- User scrolls down in transaction list → Scrolling works smoothly
- Pull-to-refresh only triggers when:
  1. The scrollable element is at the top (scrollTop === 0)
  2. User pulls down further from the top
- Smooth, predictable UX

## Testing
To test the fix:
1. Navigate to Transactions page
2. Scroll down through the transaction list
3. Verify that pull-to-refresh does NOT trigger while scrolling
4. Scroll back to the top of the list
5. Pull down from the top
6. Verify that pull-to-refresh DOES trigger correctly

## Future Considerations
- All new scrollable components should implement this pattern
- Consider creating a composable/mixin for consistent implementation
- Monitor for edge cases on different devices/browsers

