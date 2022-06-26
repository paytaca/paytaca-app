<template>
	<div v-show="val" class="scanner-container">
		<q-btn
			icon="close"
			rounded
			padding="xs"
			flat
			class="scanner-close-btn"
			style="z-index:2022;"
			@click="val = false"
		/>
		<div v-if="error" class="scanner-error-dialog text-center bg-red-1 text-red q-pa-lg">
			<q-icon name="error" left/>
			{{ error }}
		</div>
		<template v-else>
			<QrcodeStream
				v-if="val"
				:camera="frontCamera ? 'front': 'auto'"
				@decode="onScannerDecode"
				@init="onScannerInit"
				:style="{
					position: 'absolute',
					inset: 0,
				}"
			/>
			<div class="scanner-box" ref="box">
				<div class="scan-layout-design" v-if="val">
					<div class="scan-design1">
						<div class="line-design1"></div>
					</div>
					<div class="scan-design2">
						<div class="line-design2"></div>
					</div>
					<div class="scan-design3">
						<div class="line-design3"></div>
					</div>
					<div class="scan-design4">
						<div class="line-design4"></div>
					</div>
				</div>
				<span class="scanner-text text-center full-width">Scan QR code</span>
			</div>
		</template>
	</div>
</template>
<script>
import { QrcodeStream } from 'vue-qrcode-reader'
export default {
  name: 'QrScanner',
  components: { QrcodeStream },
  props: {
    value: {
      type: Boolean,
      default: false
    },
    frontCamera: {
      type: Boolean,
      defualt: false
    }
  },
  data () {
    return {
      val: this.value,
      error: ''
    }
  },
  methods: {
    onScannerInit (promise) {
      promise
        .then(() => {
          this.error = ''
        })
        .catch(error => {
          if (error.name === 'NotAllowedError') {
            this.error = 'Permission required to access to camera'
            // this.error = 'Hey! I need access to your camera'
          } else if (error.name === 'NotFoundError') {
            this.error = 'No camera found on this device'
            // this.error = 'Do you even have a camera on your device?'
          } else if (error.name === 'NotSupportedError') {
            this.error = 'Unable to acccess camera in non-secure context'
            // this.error = 'Seems like this page is served in non-secure context (HTTPS, localhost or file://)'
          } else if (error.name === 'NotReadableError') {
            this.error = 'Unable to access camera.'
            // this.error = 'Couldn\'t access your camera. Is it already in use?'
          } else if (error.name === 'OverconstrainedError') {
            this.frontCamera = false
            this.error = 'Constraints don\'t match any installed camera. Did you ask for the front camera although there is none?'
          } else {
            this.error = 'Unknown error: ' + error.message
          }
        })
    },
    onScannerDecode (content) {
      this.$emit('decode', content)
    }
  },
  watch: {
    val () {
      this.$emit('input', this.val)
    },
    value () {
      this.val = this.value
    }
  }
}
</script>
<style scoped lang="scss">
.scanner-container {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background: lightcoral;
  z-index: 999;
  display: flex;
}
.scanner-container > .scanner-close-btn {
  position: absolute;
  top: 0;
  right: 0;
  margin: 10px;
  color: #ef4f84;
}
.scanner-container > .scanner-error-dialog {
	border-radius: 15px;
	margin-top: 20%;
	margin-bottom: auto;
	margin-left: auto;
	margin-right: auto;
	width: 220px;
	max-width: 90vw;
}
.scanner-text {
	position: absolute;
	bottom: -30px;
	color: white;
	z-index: 1000;
}
.scanner-box {
	position: relative !important;
	display: flex !important;
	height: 220px !important;
	width: 220px !important;
	border-radius: 16% !important;
	box-shadow: 0px 0px 0px 1000px rgba(0, 0, 0, 0.6);
	vertical-align: middle;
	z-index: 2000 !important;
	align-self: center;
	margin-left: auto;
	margin-right: auto;
}
.scan-design1 {
	position: absolute;
	height: 24px;
	width: 24px;
	left: 10px;
	top: 10px;
	overflow: hidden;
}
.line-design1 {
	height: 150px;
	width: 150px;
	border: 3px solid #3b7bf6;
	border-radius: 15%;
}
.scan-design2 {
	position: absolute;
	height: 24px;
	width: 24px;
	right: 10px;
	top: 10px;
	overflow: hidden;
}
.line-design2 {
	position: absolute;
	height: 150px;
	width: 150px;
	right: 0px;
	top: 0px;
	border: 3px solid #3b7bf6;
	border-radius: 15%;
}
.scan-design3 {
	position: absolute;
	height: 24px;
	width: 24px;
	right: 10px;
	bottom: 10px;
	overflow: hidden;
}
.line-design3 {
	position: absolute;
	height: 150px;
	width: 150px;
	right: 0px;
	bottom: 0px;
	border: 3px solid #3b7bf6;
	border-radius: 15%;
}
.scan-design4 {
	position: absolute;
	height: 24px;
	width: 24px;
	left: 10px;
	bottom: 10px;
	overflow: hidden;
}
.line-design4 {
	position: absolute;
	height: 150px;
	width: 150px;
	left: 0px;
	bottom: 0px;
	border: 3px solid #3b7bf6;
	border-radius: 15%;
}
</style>
