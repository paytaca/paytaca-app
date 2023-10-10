<template>
  <div class="scanner-box" ref="box">
    <div class="scan-layout-design">
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
    <span class="scanner-text text-center full-width">{{ $t('ScanQrCode') }}</span>
  </div>
</template>

<style>
/* Scanner UI */
.hide-section {
  display: none !important;
}
.qrcode-scanner {
  position: fixed;
  top: 0px;
  right: 0px;
  width: 100% !important;
  height: 100% !important;
  background: transparent;
  display: flex;
}
.qrcode-scanner {
  visibility: visible;
  position: fixed;
  top: 0;
  right: 0;
  margin: 10px;
  color: #ef4f84;
  z-index: 10000;
}
.qrcode-scanner > .scanner-error-dialog {
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
