/**
 * Add custom directives globally through this boot file
 */

import { boot } from 'quasar/wrappers'
import doubleClick from 'src/directives/double-click'

export default boot(({ app }) => {
  app.directive('dblclick', doubleClick);
})
