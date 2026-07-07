import axios from "axios";
import { requestManager } from "src/utils/request-manager";

const baseURLs = {
  mainnet: 'https://watchtower.cash/api',
  chipnet: 'https://chipnet.watchtower.cash/api',

  // mainnet: 'http://localhost:8000/api',
  // chipnet: 'http://localhost:8000/api',
}

/** @typedef {import("axios").AxiosInstance} AxiosInstance */
/** @type {{ mainnet: AxiosInstance, chipnet: AxiosInstance }} */
const backend = { mainnet: null, chipnet: null }

export function getStablehedgeBackend(chipnet=false) {
  if (!chipnet && !backend.mainnet) {
    backend.mainnet = axios.create({ baseURL: baseURLs.mainnet })
    requestManager.attachTo(backend.mainnet)
  } else if (chipnet && !backend.chipnet) {
    backend.chipnet = axios.create({ baseURL: baseURLs.chipnet })
    requestManager.attachTo(backend.chipnet)
  }

  return chipnet ? backend.chipnet : backend.mainnet
}
