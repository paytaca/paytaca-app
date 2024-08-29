import axios from 'axios'

const ENGAGEMENT_HUB_URL =
  process.env.ENGAGEMENT_HUB_URL || 'https://engagementhub.paytaca.com/api/'
const CASHBACK_URL = `${ENGAGEMENT_HUB_URL}cashback/`

export async function getCashbackAmount (payload) {
  let data = null

  await axios
    .post(`${CASHBACK_URL}campaign/get_cashback_amount/`, payload)
    .then(response => {
      data = response.data
    })
    .catch(error => {
      console.log(error)
    })

  return data
}
