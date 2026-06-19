const { parse } = require('@vue/compiler-sfc')
const fs = require('fs')
const content = fs.readFileSync('src/pages/apps/payment-hub/StoreDetail.vue', 'utf-8')
const { descriptor, errors } = parse(content)
if (errors.length) {
  console.error("Errors:", errors)
} else {
  console.log("Parsed correctly. Script tag starts at line", descriptor.scriptSetup?.loc?.start?.line)
}
