<template>
  <h4 class="col-12 no-margin q-px-md">The page will be live in:</h4>
  <div class="col-12 q-my-xl">
    <q-spinner-clock size="100px" />
  </div>
  <div class="text-h5">
    <p>{{ countdown }}</p>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';

export default {
  setup() {
    const countdown = ref('');
    let intervalId = null;

    const targetDate = new Date('2025-05-15T00:00:00Z'); // May 15, 2025, UTC

    const updateCountdown = () => {
      const now = new Date();
      const timeLeft = targetDate.getTime() - now.getTime();

      if (timeLeft <= 0) {
        countdown.value = 'The page is now live! Please wait...';
        clearInterval(intervalId);
        return;
      }

      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

      countdown.value = `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`;
    };

    onMounted(() => {
      updateCountdown(); // Initial update
      intervalId = setInterval(updateCountdown, 1000); // Update every second
    });

    onUnmounted(() => {
      clearInterval(intervalId); // Clear interval when component unmounts
    });

    return {
      countdown,
    };
  },
};
</script>
