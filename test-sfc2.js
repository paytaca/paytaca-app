const { parse, compileScript } = require('@vue/compiler-sfc')
const fs = require('fs')
const content = fs.readFileSync('src/pages/apps/payment-hub/StoreDetail.vue', 'utf-8')
const { descriptor } = parse(content)
try {
  compileScript(descriptor, { id: 'test' })
  console.log("Script compiled successfully!")
} catch (e) {
  console.error("Compile error:", e)
}
