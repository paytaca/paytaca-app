export const ELOAD_SERVICE_INFO = Object.freeze({
	eload: {
		altName: 'Mobile E-load',
		icon: 'phone_in_talk',
		description: 'Instantly top up prepaid mobile credits for calls, texts, and data.'
	},
	cable: {
		altName: 'Cable Services',
		icon: 'tv',
		description: 'Pay for your cable TV subscription quickly and conveniently.'
	},
	gamepins: {
		altName: 'Gamepins',
		icon: 'gamepad',
		description: 'Purchase digital codes or credits to unlock in‑game items and play online games.'
	}
})

export function resolveEloadServiceKey (serviceName) {
	if (typeof serviceName !== 'string') return ''
	return serviceName.trim().toLowerCase()
}

export function getEloadServiceInfo (serviceName) {
	const key = resolveEloadServiceKey(serviceName)
	return (key && ELOAD_SERVICE_INFO[key]) || null
}

