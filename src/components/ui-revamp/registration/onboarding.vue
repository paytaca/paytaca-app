<template>
  <div class="onboarding-container">
    <div class="image-container" v-if="status === 'splash'">
      <div class="centered-image">
        <img height="85px" width="85px" src="paytaca-logo.png" alt="">        
      </div>
    </div>
    <div v-if="status === 'info'">
      <div v-if="step === 1" class="stepper-content">
        <div class="image-container text-center">
          <div class="stepper">
            <img height="362px" width="362px" src="ui-revamp/onboarding-1.png" alt="">
            <div class="text-center">
              <div class="title-medium">
                Low Transaction Fees
              </div>
              <p class="body-medium q-pt-sm q-px-md">
                Keep more of your money with ultra-low fees on every transfer, no matter the amount.</p>
            </div>
          </div>
        </div>
      </div>
      <div v-if="step === 2" class="stepper-content">
        <div class="image-container text-center">
          <div class="stepper">
            <img height="362px" width="362px" src="ui-revamp/onboarding-2.png" alt="">
            <div class="text-center">
              <div class="title-medium">
                Unlimited Transactions per Day
              </div>
              <p class="body-medium q-pt-sm q-px-md">
                Send and receive as many payments as you want—no daily limits, no restrictions.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div v-if="step === 3" class="stepper-content">
        <div class="image-container text-center">
          <div class="stepper">
            <img height="362px" width="362px" src="ui-revamp/onboarding-3.png" alt="">
            <div class="text-center">
              <div class="title-medium">
                Instant Global Transfer
              </div>
              <p class="body-medium q-pt-sm q-px-md">
                Send BCH anywhere in the world in seconds—fast, secure, and borderless.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div class="row button-container">
          <div class="col-4 q-pr-sm">
            <q-btn outline label="Skip" class="full-width" style="border-radius: 10px; padding: 10px 0px 10px;" @click="$emit('register')"/>
          </div>
          <div class="col-8 q-pl-sm">
            <q-btn @click="nextStep()" padding="sm" label="Continue" class="full-width button-red" style="border-radius: 10px; padding: 10px 0px 10px"/>
          </div>
        </div>
    </div>
  </div>
</template>
<script>
export default {
  data () {
    return {
      splashScreen: true,
      status: 'splash', // splash, info,
      step: 0
    }
  },
  mounted () {
    setTimeout(() => {
      // this.splashScreen = false
      document.querySelector(".image-container").classList.add("image-container-hidden");

      setTimeout(() => {
        this.status = 'info'
        this.nextStep()
        // document.querySelector(".image-container").classList.add("image-container-hidden");
      }, 1000)
    }, 1500)
  },
  emits: ['register'],
  methods: {
    nextStep () {
      this.step++

      if (this.step > 3) {
        this.$emit('register')
      } else {
        setTimeout(() =>{
          document.querySelector(`.stepper-content`).classList.add("visible");
        if (this.step === 1){
          document.querySelector(`.button-container`).classList.add("visible");
        }
      }, 100)}

    }
  }
}
</script>
<style lang="scss" scoped>
.image-container {
  display: flex;
  justify-content: center;
  align-items: center;
  transition: opacity 1s ease-in-out;
}
.image-container-hidden {
  opacity: 0;
}
.centered-image {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}
.stepper {
  position: absolute;
  top: 25%;
  left: 50%;
  transform: translate(-50%, -25%);
}
.stepper-content {
  opacity: 0;
  transition: opacity .5s ease-in-out;
}
.stepper-content.visible {
  opacity: 1;
}
.button-container {
  position: absolute;
  width: 100%;
  padding: 0px 16px 25px;
  // margin: 0px 16px 25px;
  bottom: 0;
  opacity: 0;
  transition: opacity .5s ease-in-out;
}
.button-container.visible {
  opacity: 1;
}
</style>
