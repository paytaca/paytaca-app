<template>
    <q-dialog v-model="showDialog" persistent :maximized="$q.screen.xs" transition-show="fade" transition-hide="fade">
        <q-card style="min-width: 350px" :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-white'">
            <!-- Dialog Header -->
            <q-card-section class="row items-center">
                <div class="text-h6" :class="textColor">Create New Card</div>
                <q-space />
                <q-btn icon="close" flat round dense :color="$q.dark.isActive ? 'grey-4' : 'grey-7'" @click="closeDialog" />
            </q-card-section>

            <q-separator :dark="$q.dark.isActive" />

            <!-- Normal Content -->
            <q-card-section v-if="state === 'form'">
                <q-input
                    v-model="newCardName"
                    label="Card Name *"
                    :dark="$q.dark.isActive"
                    :rules="[
                    val => !!val || 'Card name is required',
                    val => val.length <= 10 || 'Maximum 10 characters'
                    ]"
                    @keyup.enter="createCard"
                    autofocus
                    outlined
                    maxlength="10"
                    counter
                    hint="Max of 10 characters allowed">
                    <template v-slot:prepend>
                        <q-icon name="credit_card" :color="$q.dark.isActive ? 'grey-4' : 'grey-7'" />
                    </template>
                </q-input>
            </q-card-section>

            <!-- Minting Loading State -->
            <q-card-section v-if="state === 'minting'" class="text-center q-pa-lg">
                <q-icon
                    name="token"
                    size="64px"
                    :color="$q.dark.isActive ? 'primary' : 'primary'"
                    class="q-mb-md"/>
                <div 
                    class="text-h6 q-mb-sm"
                    :class="textColor">
                    {{ mintingMessage || 'Creating your card...' }}
                </div>
                <div 
                    class="text-caption"
                    :class="textColorGrey">
                    Please wait while we create your new card...
                </div>
                <q-linear-progress indeterminate color="primary" class="q-mt-md" />
            </q-card-section>

            <q-card-section v-if="state === 'success'" class="text-center q-pa-lg">
                <q-icon
                    name="check_circle"
                    size="64px"
                    :color="$q.dark.isActive ? 'green-4' : 'green-6'"
                    class="q-mb-md"/>
                <div 
                    class="text-h6 q-mb-sm"
                    :class="textColor">
                    Card Created Successfully!
                </div>
                <div 
                    class="text-caption"
                    :class="textColorGrey">
                    Your new card has been created and is ready to use.
                </div>
            </q-card-section>

            <q-card-section v-if="state === 'error'" class="text-center q-pa-lg">
                <q-icon
                    name="error"
                    size="64px"
                    :color="$q.dark.isActive ? 'red-4' : 'red-6'"
                    class="q-mb-md"/>
                <div 
                    class="text-h6 q-mb-sm"
                    :class="textColor">
                    Error Creating Card
                </div>
                <div 
                    class="text-caption"
                    :class="textColorGrey">
                    {{ mintingMessage || 'An error occurred while creating your card. Please try again.' }}
                </div>
            </q-card-section>

            <!-- Action Buttons (only show when not minting) -->
            <q-card-actions v-if="state === 'form'" align="right" class="q-pa-md">
                <q-btn 
                    flat 
                    label="Cancel" 
                    :color="$q.dark.isActive ? 'grey-4' : 'grey-7'" 
                    @click="closeDialog" />
                <q-btn 
                    label="Done" 
                    color="primary" 
                    :disable="!newCardName || !newCardName.trim() || newCardName.length > 10"
                    @click="createCard"/>
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>

<script>
import Card from 'src/services/card/card';

export default {
    name: 'CreateCardDialog',
    emits: ['onClose'],
    data () {
        return {
            showDialog: true,
            newCardName: '',
            mintingMessage: '',
            state: 'form', // 'form' | 'minting' | 'success' | 'error'
        }
    },

    computed: {
        textColor () {
            return this.$q.dark.isActive ? 'text-white' : 'text-dark';
        },
        textColorGrey () {
            return this.$q.dark.isActive ? 'text-grey-5' : 'text-grey-7';
        }
    },

    mounted() {
        // Reset state when dialog is opened
        this.newCardName = '';
        this.mintingMessage = '';
        this.state = 'form';
    },

    methods: {
        closeDialog () {
            this.$emit('onClose');
        },

        onCardMintingProgress (message) {
            // This can be used to update the UI with progress messages if desired
            console.log('Card minting progress:', message);
            this.mintingMessage = message;
        },

        async createCard () {
            console.log('Creating card with name:', this.newCardName);
            this.state = 'minting';
            const card = await Card.createInitialized()
            card.create(this.newCardName, this.onCardMintingProgress)
                .then(card => {
                    console.log('Card created successfully:', card);
                    this.state = 'success';
                    setTimeout(() => {
                        this.$emit('handleCreateCard', card);
                        this.closeDialog();
                    }, 1500); // Show success message for 1.5 seconds before closing
                })
                .catch(error => {
                    console.error('Error creating card:', error);
                    this.state = 'error'; // Set state to error on failure
                    this.mintingMessage = error.message || 'An error occurred while creating the card.';
                });
        }
    }
}

</script>