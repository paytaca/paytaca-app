/**
 * Directive to prevent iOS image context menu (Share, Save to Photos, etc.)
 * Usage: v-prevent-image-context on any img element
 */
export default {
  mounted(el) {
    // Prevent iOS context menu and image selection
    const preventDefault = (e) => {
      e.preventDefault()
      e.stopPropagation()
      return false
    }

    // Add event listeners
    el.addEventListener('touchstart', preventDefault, { passive: false })
    el.addEventListener('touchmove', preventDefault, { passive: false })
    el.addEventListener('touchend', preventDefault, { passive: false })
    el.addEventListener('contextmenu', preventDefault)
    el.addEventListener('selectstart', preventDefault)
    
    // Store handlers for cleanup
    el._preventImageContextHandlers = {
      touchstart: preventDefault,
      touchmove: preventDefault,
      touchend: preventDefault,
      contextmenu: preventDefault,
      selectstart: preventDefault
    }
  },
  
  unmounted(el) {
    // Clean up event listeners
    if (el._preventImageContextHandlers) {
      const handlers = el._preventImageContextHandlers
      el.removeEventListener('touchstart', handlers.touchstart)
      el.removeEventListener('touchmove', handlers.touchmove)
      el.removeEventListener('touchend', handlers.touchend)
      el.removeEventListener('contextmenu', handlers.contextmenu)
      el.removeEventListener('selectstart', handlers.selectstart)
      delete el._preventImageContextHandlers
    }
  }
}

