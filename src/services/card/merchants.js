import { backend as watchtowerBackend } from 'src/exchange/backend';

export async function getMerchantList(pagination = { limit: 20, page: 1, offset: 0 }) {
    const response = await watchtowerBackend.get('/paytacapos/merchants/', { params: pagination });
    return response.data;
  } 