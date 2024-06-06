/**
 * - File & FileReader class are overwritten by cordova-plugin-file in capacitor build
 * - Native classes are backed up in index.template.html before it gets overwritten
 * - There might be other classes overwritten by the plugin, so use them if you can
*/

export const nativeFileAPI = Object.freeze({
  /** @type {File}  */
  File: window.File_native || window.File,
  /** @type {FileReader}  */
  FileReader: window.FileReader_native || window.FileReader,
})
