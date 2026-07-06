import axios from 'axios'
import * as bchOauth from './bch-oauth.js'

// constant variables
const MAX_AUTH_RETRIES = 1

// create backend using axios
export const backend = axios.create({
  baseURL: process.env.AUCTION_HUB_API
})

/***
 * NOTES:
  - Check repository auction-hub README for api urls
  - date formats: new Date().toISOString(),
  - images: need to be saved in a FormData object  (use this for reference: https://www.javascripttutorial.net/web-apis/javascript-formdata/)
  * @param pathname = pathname in url for api 
  * @param id = could be pk, lot, etc. (specifically if we're referring to getting one item, so don't put anything if fetching multiple items)
  * @param method = ['get', 'post', 'put', 'delete']; default is get 
  * @param payload = object containing the data for post/put (not needed for get/delete)
*/
export async function callAPI(pathname, id=null, method="get", payload=null, args) {
  let apiURL = `${bchOauth.baseURL}/`

  if (Array.isArray(pathname)) { // other list apis
    for (let i = 0; i < pathname.length; i++) {
      apiURL += `${pathname[i]}/`
      if(id?.[i] !== null) apiURL += `${id[i]}/`
    }
  } else { // GENERAL FORMAT
    apiURL += `${pathname}/` // list, post
    if (id !== null) { 
      apiURL += `${id}/`  // retrieve
      if (method === "put" || method === "patch")     // update, partial_update
        apiURL += `update/`
      else if (method === "delete")  // destroy
        apiURL += `delete/`
    }
  } 
  console.log(apiURL)

  for (let attempt = 0; attempt <= MAX_AUTH_RETRIES; attempt++) {
    try {
      const headers = await bchOauth.getAuthHeaders()

      const response = 
      (method === "get") ? await backend.get(apiURL, { headers }) : 
      (method === "post") ? await backend.post(apiURL, payload, { headers }) :
      (method === "put") ? await backend.put(apiURL, payload, { headers }) :
      (method === "patch") ? await backend.patch(apiURL, payload, { headers }) :
      await backend.delete(apiURL, { headers }) 

      console.log("[callAPI] Response generated.")
      return {
        success: true,
        data: response.data,
        error: null
      }
    } catch (error) {
      // 401/403 - token expired or invalid; clear and retry
      if ((error.response?.status === 403 || error.response?.status === 401) && attempt < MAX_AUTH_RETRIES) {
        await bchOauth.clearToken()
        continue
      }

      let errorMessage = "";
      if (error.response?.status === 404) {
        errorMessage = 'No matching data found.'
        console.log("[callAPI] " + errorMessage)
      } else if (error.response?.status === 403) {
        errorMessage = 'FORBIDDEN ACCESS (must be admin user).'
        console.log("[callAPI] " + errorMessage)
      } else {
        errorMessage = error.response?.data?.detail || error.response?.data?.error || JSON.stringify(error.response?.data) || error.message || 'Failed to fetch'
        console.error("[callAPI] Error encountered: " + errorMessage)
      }
    
      return {
        success: false,
        data: null,
        error: `Network error: ${errorMessage}`
      }
    }
  }
  console.log("[callAPI] Maxed out retry attempts. Failed to fetch.")
	return { success: false, data: null, error: 'Failed to fetch' }
}





