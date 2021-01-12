<template>
  <div>
    <div class="row">
        <div class="col q-mt-md">
          <h3 class="text-center brandname q-mt-xl">Paytaca</h3>
             <!-- <p class="text-center receive"><b>Let's get started</b></p> -->
        </div>
    </div>
    <div class="row">
      <div class="get-started q-mt-lg q-pa-lg">
        <h5 class="q-ma-none get-started-text">Get Started</h5>
        <p class="dim-text">Let's create your account.</p>

        <div class="row">
          <div class="col q-mt-md">
            <label class="get-started-text">Firstname</label>
            <input type="text" class="form-input q-mt-xs">
          </div>
        </div>
        <div class="row">
          <div class="col q-mt-md">
            <label class="get-started-text">Lastname</label>
            <input type="text" class="form-input q-mt-xs">
          </div>
        </div>
        <div class="row">
          <div class="col q-mt-md">
            <label class="get-started-text">Name</label>
            <input type="text" class="form-input q-mt-xs">
          </div>
        </div>
        <div class="row">
          <div class="col q-mt-md">
            <label class="get-started-text">Email</label>
            <input type="text" class="form-input q-mt-xs">
          </div>
        </div>
        <div class="row">
          <div class="col q-mt-md">
            <label class="get-started-text">Mobile Number</label>
            <input type="text" class="form-input q-mt-xs">
          </div>
        </div>
        <div class="row">
          <button class="submit-btn q-mt-md">Submit</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>

export default {
  name: 'Receive-page',
  data () {
    return {
    }
  }
}
</script>

<style lang="scss">
  body {
    background-color: #2E73D2;
  }
  .brandname {
    color: #fff;
  }
  .get-started {
    width: 100%;
    border-top-left-radius: 22px;
    border-top-right-radius: 22px;
    background-color: #fff;
    padding-top: 28px;
  }
  .icon-container {
    width: 30px;
  }
  .form-input {
    width: 100%;
    height: 38px;
    border-radius: 18px;
    border: 1px solid gray;
    outline: 0;
    padding-left: 14px;
  }
  .form-input:focus {
    border-color: #89BFF4;
    box-shadow: 0px 0px 2px 2px rgba(137, 191, 244, .5);
  }
  .get-started-text {
    color: #4C4F4F;
  }
  .dim-text {
    color: #BAC2C2;
  }
  .submit-btn {
    background-color: #15568E;
    border: 1px solid gray;
    width: 100%;
    height: 40px;
    border-radius: 20px;
    color: #fff;
    outline: 0;
  }
  .submit-btn:focus {
    box-shadow: 0px 0px 2px 2px rgba(93, 173, 226, .8);
  }
</style>
