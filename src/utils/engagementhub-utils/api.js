import axios from 'axios'

import { requestManager } from 'src/utils/request-manager'

// const ENGAGEMENT_HUB_URL =
//   process.env.ENGAGEMENT_HUB_URL || 'https://engagementhub.paytaca.com/api/'
export const ENGAGEMENT_HUB_URL = 'http://127.0.0.1:8000/api/'

export const REWARDS_URL = axios.create({ baseURL: `${ENGAGEMENT_HUB_URL}rewards/` })
requestManager.attachTo(REWARDS_URL)

export const ELITEPROGRAM_URL = axios.create({ baseURL: `${ENGAGEMENT_HUB_URL}eliteprogram/` })
requestManager.attachTo(ELITEPROGRAM_URL)
