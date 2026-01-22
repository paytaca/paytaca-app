<template>
	<div class="text-center text-black">
		
		<div v-for="type in purchase_type">
			{{ type.name }}
		</div>
	</div>
</template>
<script>

export default {
	data() {
		return {
			purchase_type: [
				{
					'name': 'ELOAD'
				},
				{
					'name': 'CABLE'
				},
				{
					'name': 'GAMEPINS'
				}
			]
		}
	}
}
</script>