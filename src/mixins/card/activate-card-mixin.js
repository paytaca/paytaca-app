import { clearCardActivationAttempt, getCardActivationAttempt } from 'src/services/card/storage';
import Card from 'src/services/card/card';

export default {
  data() {
    return {
      user: null,
      showActivateCardForm: false,
      showResumeActivateCardDialog: false,
      idempotencyKey: ''
    }
  },
  methods: {
    async loadActivateCardAttempt() {
      const walletHash = this.user?.wallet?.walletHash;
      if (!walletHash) {
          console.log('No wallet hash available to load activate card attempt');
          return null;
      }
      const attempt = await getCardActivationAttempt(walletHash);
      console.log('Loaded activate card attempt:', attempt);
      return attempt;
    },
    async checkExistingActivateCardAttempt() {
      this.idempotencyKey = '' // Reset idempotency key before checking
      const attempt = await this.loadActivateCardAttempt();
      if (attempt) {
        console.log('Existing card activation attempt found:', attempt);
        this.showResumeActivateCardDialog = true;
        this.idempotencyKey = attempt.idempotencyKey || '';
      } else {
        console.log('No existing card activation attempt found');
      }
    },
    async onOpenActivateCardForm() {
      this.showActivateCardForm = true;
      await this.checkExistingActivateCardAttempt()
    },
    async onCloseActivateCardForm() {
      this.showActivateCardForm = false;
      await this.checkExistingActivateCardAttempt()
    },
    async onDeleteCardAttempt() {
      this.showResumeActivateCardDialog = false;
      // Clear the existing attempt from local storage
      await clearCardActivationAttempt();
      // Delete the attempt from the server as well
      await Card.deleteCardAttempt(this.idempotencyKey).catch(err => {
        console.error(err.response?.data);
      });
    },
    onCancelCardAttempt() {
      this.showResumeActivateCardDialog = false;
      this.$router.push({ path: '/apps/card' }) // Redirect to the same page to reset state
    }
  }
}