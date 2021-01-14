export default {
  scrollIntoView (parent, child, xAxis = true) {
    const parentBounding = parent.getBoundingClientRect(),
      clientBounding = child.getBoundingClientRect()

    const parentEnd = xAxis ? parentBounding.bottom : parentBounding.right,
      parentStart = xAxis ? parentBounding.top : parentBounding.left,
      clientEnd = xAxis ? clientBounding.bottom : clientBounding.right,
      clientStart = xAxis ? clientBounding.top : clientBounding.left

    const parentCenter = (parentStart + parentEnd) / 2
    const clientCenter = (clientStart + clientEnd) / 2

    if (parentCenter >= clientCenter) {
      this.scrollTo(parent, -(parentCenter - clientCenter), 300, xAxis)
    } else if (clientCenter > parentCenter) {
      this.scrollTo(parent, clientCenter - parentCenter, 300, xAxis)
    }
  },

  scrollTo (element, to, duration, xAxis = true) {
    const start = xAxis ? element.scrollTop : element.scrollLeft
    const increment = 20
    let currentTime = 0

    const animateScroll = () => {
      currentTime += increment

      const val = this.easeInOutQuad(currentTime, start, to, duration)
      if (xAxis) {
        element.scrollTop = val
      } else {
        element.scrollLeft = val
      }

      if (currentTime < duration) {
        setTimeout(animateScroll, increment)
      }
    }

    animateScroll()
  },
  // Function for smooth scroll animation with the time duration
  easeInOutQuad (time, startPos, endPos, duration) {
    time /= duration / 2

    if (time < 1) return (endPos / 2) * time * time + startPos; time--
    return (-endPos / 2) * (time * (time - 2) - 1) + startPos
  },

  getScrollableParent (node, xAxis = true) { // https://stackoverflow.com/a/35940276/13022138
    if (!node) return null

    if (xAxis) {
      const scrollable = window.getComputedStyle(node).overflowY !== 'visible' || window.getComputedStyle(node).overflowY !== 'hidden'
      if (scrollable && this.getScrollTopMax(node) > 0) return node
      else return this.getScrollableParent(node.parentElement, xAxis)
    } else {
      const scrollable = window.getComputedStyle(node).overflowX !== 'visible' || window.getComputedStyle(node).overflowX !== 'hidden'
      if (scrollable && this.getScrollLeftMax(node) > 0) return node
      else return this.getScrollableParent(node.parentElement, xAxis)
    }
  },
  isVisible (element) {
    if (!this.isVisibleByStyles(element)) return false
    if (this.isBehindOtherElement(element)) return false
    return true
  },
  isVisibleByStyles (element) {
    const styles = window.getComputedStyle(element)
    return styles.visibility !== 'hidden' && styles.display !== 'none'
  },
  isBehindOtherElement (element) {
    const boundingRect = element.getBoundingClientRect()
    console.log(boundingRect)

    // adjust coordinates to get more accurate results
    const left = boundingRect.left + 10
    const right = boundingRect.right - 10
    const top = boundingRect.top + 10
    const bottom = boundingRect.bottom - 10

    if (document.elementFromPoint(left, top) !== element) return document.elementFromPoint(left, top)
    if (document.elementFromPoint(right, top) !== element) return document.elementFromPoint(right, top)
    if (document.elementFromPoint(left, bottom) !== element) return document.elementFromPoint(left, bottom)
    if (document.elementFromPoint(right, bottom) !== element) return document.elementFromPoint(right, bottom)

    return false
  },
  getScrollTopMax (element) {
    const ref = element.scrollTopMax
    return (ref !== null || ref !== undefined)
      ? ref
      : (element.scrollHeight - element.clientHeight)
  },

  getScrollLeftMax (element) {
    const ref = element.scrollLeftMax
    return (ref !== null || ref !== undefined)
      ? ref
      : element.scrollWidth
  }
}
