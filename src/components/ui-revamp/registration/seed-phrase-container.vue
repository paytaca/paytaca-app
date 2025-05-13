<template>
	<headerNav title="Account Login" subtitle="Seed Phrase" :useEmitBack="true" :hasGradient="true" @back="$emit('back')"/>

	<!--<div class="container" style="margin-top: 84px;">
		<q-card dark="false" class="card-container card-light br-15">
			<div class="title-small">Enter Seed Phrase</div>
			<div class="body-small">Select each word in the order it was presented to you.</div>

			
		</q-card>
	</div>	-->
	<div class="card-container full-width">
		<q-card class="main-card br-15" :dark="darkmode" :class="darkmode ? 'card-dark' : 'card-light'">
			<div class="title-small">Enter Seed Phrase</div>
			<div class="body-small" style="padding-bottom: 10px;">Select each word in the order it was presented to you.</div>

			<a v-if="isImport"><div class="text-right q-px-md text-link" :style="invalidSeedPhrase ? 'padding-bottom: 5px;' : 'padding-bottom: 10px;'" @click="pasteSeedPhrase()"><q-icon name="arrow_back_ios" size="xs"/>Paste Seed Phrase</div></a>
			<div class="text-center body-small text-secondary" v-if="invalidSeedPhrase">Invalid Seed Phrase</div>
			<q-card :dark="darkmode" class="br-15" style="border: 1px dashed #295BF6; padding: 16px;">
				<div class="grid-container">
					<div id="grid" class="grid-item" v-for="i in 12" @click="selectGrid(i)" :style="i === selectedIndex ? 'border: 2px solid #416EB4;' : 'border: 1px solid #ccc;'">
						<span class="non-editable text-royal-blue">{{ i }}</span>						
						<q-input :disable="!isImport" :ref="`grid${i}`" dense v-model="seedPhrase[i - 1]" input-style="text-align: center; font-weight: 500; color: black;" borderless @update:model-value="updateText()" @keyup.enter = "handleEnter()"/>
					</div>
				</div>
			</q-card>

			<q-card v-if="!isImport && selector.length !== 0" :dark="darkmode" class="br-15" style="border: 1px dashed #295BF6; margin-top: 24px; padding: 16px;">
				<div class="grid-container">
					<div v-for="i in selector.length" class="text-center">
						<q-btn @click="selectWord(i-1)" no-caps flat rounded filled class="full-width" :label="selector[i-1]" style="background-color: #416EB4; color: #fff;"/>
					</div>					
				</div>
			</q-card>

			<q-btn :disable="!isValidSeedPhrase()" class="full-width button-default" no-caps label="Proceed" style="margin-top: 24px; border-radius: 10px; height: 54px;" @click="handleSubmit()"/>

		</q-card>	
	</div>	
</template>
<script>
import { utils } from 'ethers'
import headerNav from 'src/components/header-nav.vue'

export default{
	data () {
		return {
			darkmode: this.$store.getters['darkmode/getStatus'],
			seedPhrase: new Array(12).fill(''),
			selector: [],
			selectedIndex: null,
			currentIndex: 0,
			invalidSeedPhrase: false
		}		
	},
	computed: {
		emptySeedPhrase () {
			return this.seedPhrase.every(str => str === "");
		}
	},
	props: {
		mnemonic: {
			type: String,
			default: ''
		},
		isImport: {
			type: Boolean,
			default: false
		}
	},
	components: {
		headerNav
	},
	watch: {		
		selectedIndex () {
			this.updateText()
		}
	},
	emits: ['back', 'submit'],
	mounted () {
		this.selector = this.mnemonic.split(" ")
		console.log('here: ', this.mnemonic)		
	},
	methods: {
		 updateText() {		 	
		 	this.seedPhrase[this.selectedIndex - 1] = this.cleanUpSeedPhrase(this.seedPhrase[this.selectedIndex - 1]) 
        },
        selectGrid (index) {
        	if (this.isImport) {
        		this.invalidSeedPhrase = false
	        	this.selectedIndex = index

	        	this.$refs[`grid${index}`][0].focus()
        	} else {
        		console.log('selecting grid')

        		if (this.seedPhrase[index - 1] !== '') {
        			this.selector.push(this.seedPhrase[index - 1])
	        		// this.seedPhrase[index - 1] = ''
	        		for (let i = (index-1); i < this.currentIndex; i++) {
	        			console.log(i)
	        			if (i < 11) {
	        				this.seedPhrase[i] = this.seedPhrase[i + 1]
	        			} else {
	        				this.seedPhrase[i] = ''
	        			} 			
	        		}
	        		this.currentIndex--
        		}
        	}
        },
        cleanUpSeedPhrase (seedPhrase) {
        	return seedPhrase.toLowerCase().trim()
		 					.replace(/\s+/g, "")
		 					.replace(/\s{2,}/g, ' ')
		 					.replace(/[^\x00-\x7F]/g, '')
		 					.replace(/[0-9]/g, "")
		 					.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '') 	      
	    },
	    handleEnter () {
	    	if (this.selectedIndex < 12) {
	    		this.selectedIndex++

	    		this.selectGrid(this.selectedIndex)
	    	} else if (this.selectedIndex === 12) {
	    		this.selectedIndex = 1
	    		this.selectGrid(this.selectedIndex)
	    	}	    	
	    },
	    handleSubmit () {
	    	if (this.isImport) {	    		
	    		const mnemonic = this.seedPhrase.join(' ').trim()
	    		// console.log(mnemonic)
	    		this.$emit('submit', mnemonic)
	    	}
	    },
	    isValidSeedPhrase() {	    	
	    	const temp = this.seedPhrase.toString().trim()
	    	// console.log('Continue?: ', this.validateSeedPhrase(temp))
		    return this.validateSeedPhrase(temp)
		},
		async pasteSeedPhrase () {			
			let clipboardText = await navigator.clipboard.readText()
			this.invalidSeedPhrase = false
			clipboardText = clipboardText.replace(/\s+/g, " ").trim()
			console.log('clipboard: ', clipboardText)
			console.log('isValid: ', this.validateSeedPhrase(clipboardText))
			if (this.validateSeedPhrase(clipboardText)) {
				this.seedPhrase = clipboardText.split(" ")
			}


			// this.seedPhrase[0] = clipboardText 			
		},
		validateSeedPhrase (phrase) {			
		  let temp = phrase.replace(/,/g, " ")			
	      if (this.countWords(temp) === 12) {
	      	this.invalidSeedPhrase = !utils.isValidMnemonic(temp)
	        return utils.isValidMnemonic(temp)
	      } else {
	        return false
	      }
	    },
	    countWords(str) {
		  if (str) {
		    return str.trim().split(/\s+/).length
		  } else {
		    return 0
		  }
		},
		selectWord (index) {
			this.seedPhrase[this.currentIndex++] = (this.selector[index])
			console.log('seedPhrase: ', this.seedPhrase)
			if (index >= 0 && index < this.selector.length) {
		        this.selector.splice(index, 1) // Removes 1 item at the given index
		    }
		}
	}
}	
</script>
<style lang="scss" scoped>
.main-card {
	margin: 106px 16px;
	padding: 24px;	
}
.seed-phrase-container {
	background-color: aqua;	

}
.grid-container {
	display: grid;
    grid-template-columns: repeat(2, 1fr); /* 3 equal columns */
    grid-template-rows: repeat(6, auto); /* 4 rows */
    gap: 10px; /* Space between grid items */
    width: 100%; /* Make it flexible */   
    margin: auto; /* Center the grid */    

}
.grid-item {
     background-color: #eaefff;
    padding-top: 20px;
    padding-bottom: 20px;    
    text-align: center;
    border-radius: 10px;
    position: relative;
    user-select: none;
}
[contenteditable] {
  outline: 0px solid transparent;
}
.non-editable {
    user-select: none; /* Prevents selection */
    pointer-events: none; /* Disables interaction */
    position: absolute;
    top: 10px;
    left: 10px;
    font-size: 12px;
}

</style>