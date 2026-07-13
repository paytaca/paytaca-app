import { clearCardActivationAttempt, getCardActivationAttempt } from 'src/services/card/storage';
import Card from 'src/services/card/card';

export default {
  data() {
    return {
      user: null,
      showActivateCardForm: false,
      showResumeCreateCardDialog: false,
      idempotencyKey: ''
    }
  },
  methods: {
    async loadCreateCardAttempt() {
      const walletHash = this.user?.wallet?.walletHash;
      if (!walletHash) {
          console.log('No wallet hash available to load create card attempt');
          return null;
      }
      const attempt = await getCardActivationAttempt(walletHash);
      console.log('Loaded create card attempt:', attempt);
      return attempt;
    },
    async checkExistingCreateCardAttempt() {
      this.idempotencyKey = '' // Reset idempotency key before checking
      const attempt = await this.loadCreateCardAttempt();
      if (attempt) {
        console.log('Existing card creation attempt found:', attempt);
        this.showResumeCreateCardDialog = true;
        this.idempotencyKey = attempt.idempotencyKey || '';
      } else {
        console.log('No existing card creation attempt found');
      }
    },
    async onOpenCreateCardForm() {
      await this.checkExistingCreateCardAttempt()
      this.showActivateCardForm = true;
    },
    async onCloseCreateCardForm() {
      this.showActivateCardForm = false;
      await this.checkExistingCreateCardAttempt()
    },
    async onResumeCardAttempt() {
      this.showResumeCreateCardDialog = false;
      this.showActivateCardForm = true;
    },
    async onDeleteCardAttempt() {
      this.showResumeCreateCardDialog = false;
      // Clear the existing attempt from local storage
      await clearCardActivationAttempt();
      // Delete the attempt from the server as well
      await Card.deleteCardAttempt(this.idempotencyKey).catch(err => {
        console.error(err.response?.data);
      });
    },
    onCancelCardAttempt() {
      this.showResumeCreateCardDialog = false;
      this.$router.push({ path: '/apps' }) // Redirect to the same page to reset state
    }
  }
}