/**
 * Add custom directives globally through this boot file
 */

import { boot } from 'quasar/wrappers'
import doubleClick from 'src/directives/double-click'
import preventImageContext from 'src/directives/prevent-image-context'

export default boot(({ app }) => {
  app.directive('dblclick', doubleClick);
  app.directive('prevent-image-context', preventImageContext);
})
