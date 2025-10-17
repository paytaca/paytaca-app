export default {
  mounted(el, binding) {
    let clickCount = 0;
    let timer = null;

    el.__dblclickHandler__ = () => {
      clickCount++;

      if (clickCount === 1) {
        // Start timer on first click
        timer = setTimeout(() => {
          clickCount = 0;
        }, 300); // 300ms window for double-click
      } else if (clickCount === 2) {
        clearTimeout(timer);
        clickCount = 0;

        // Call the provided function
        console.log('Double click triggered!', binding);
        if (typeof binding.value === 'function') {
          binding.value();
        }
      }
    };

    el.addEventListener('click', el.__dblclickHandler__);
  },

  unmounted(el) {
    el.removeEventListener('click', el.__dblclickHandler__);
    delete el.__dblclickHandler__;
  }
};
