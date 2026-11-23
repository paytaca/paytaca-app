// `elite-program.js` and `lookup-key.js` import their axios instance and the
// hub base URL from this module. Specs replace the methods they need; the URL
// stays the production host so lookup-key storage keys keep their real tag.
//
// `rewards.js` imports `REWARDS_URL` from the same module, so it is stubbed
// here too and reset alongside the Elite instance.

export const ENGAGEMENT_HUB_URL = 'https://engagementhub.paytaca.com/api/'

const NOT_STUBBED = (method) => async () => {
  throw new Error(`engagement-hub api mock: ${method} is not stubbed`)
}

export const ELITEPROGRAM_URL = {
  get: NOT_STUBBED('ELITEPROGRAM_URL.get'),
  post: NOT_STUBBED('ELITEPROGRAM_URL.post'),
}

export const REWARDS_URL = {
  get: NOT_STUBBED('REWARDS_URL.get'),
  post: NOT_STUBBED('REWARDS_URL.post'),
}

export function resetEngagementHubApiMock () {
  ELITEPROGRAM_URL.get = NOT_STUBBED('ELITEPROGRAM_URL.get')
  ELITEPROGRAM_URL.post = NOT_STUBBED('ELITEPROGRAM_URL.post')
  REWARDS_URL.get = NOT_STUBBED('REWARDS_URL.get')
  REWARDS_URL.post = NOT_STUBBED('REWARDS_URL.post')
}
