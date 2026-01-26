import axios from 'axios'
import { Store } from 'src/store'

export const backend = axios.create()
const baseURL = process.env.ELOAD_SERVICE_API || ''
const walletHash = Store.getters['global/getWallet']('bch')?.walletHash

// Add Authentication Later

export async function fetchService () {
	try {
		const response = await backend.get(baseURL + '/service/')		

		return {
			success: true,
			data: response.data,
			error: null
		}
	} catch (error) {
		const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch service'
		console.error('[fetchMemo] Error:', errorMessage)

		return {
			success: false,
			data: null,
			error: `Network error: ${errorMessage}`
		}
	}
}



export async function fetchServiceGroup (data) {
	try {
		let params = {
			'service-id': data.service.id,
			limit: data.limit,
			page: data.page
		}

		const response = await backend.get(baseURL + '/service/group/', { params: params })

			return {
				success: true,
				data: response.data,
				error: null
			}
	} catch (error) {
		const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch service group'
		console.error('[fetchMemo] Error:', errorMessage)

		return {
			success: false,
			data: null,
			error: `Network error: ${errorMessage}`
		}
	}
}


export async function fetchCategory (data) {
	try {
		let params = {
			'service-group-id': data.serviceGroup.id,
			limit: data.limit,
			page: data.page
		}

		const response = await backend.get(baseURL + '/category/', { params: params})

		return {
			success: true,
			data: response.data,
			error: null
		}
	} catch (error) {
		const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch category'
		console.error('[fetchMemo] Error:', errorMessage)

		return {
			success: false,
			data: null,
			error: `Network error: ${errorMessage}`
		}
	}
}


export async function fetchPromo (data) {
	try {
		let params = {
			limit: data.limit,
			page: data.page,
			service: data.service,
			'service-group': data.serviceGroup,
		}

		if ('category' in data) {
			params['category'] = data.category
		}

		console.log('params: ', params)
	} catch (error) {
		
	}
}