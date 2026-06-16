import { clearLinkCardAttempt, getLinkCardAttempt } from 'src/services/card/storage';
import Card from 'src/services/card/card';

export default {
  data() {
    return {
      user: null,
      showLinkCardForm: false,
      showResumeLinkCardDialog: false,
      idempotencyKey: ''
    }
  },
  methods: {
    async loadLinkCardAttempt() {
      const walletHash = this.user?.wallet?.walletHash;
      if (!walletHash) {
          console.log('No wallet hash available to load create card attempt');
          return null;
      }
      const attempt = await getLinkCardAttempt(walletHash);
      console.log('Loaded create card attempt:', attempt);
      return attempt;
    },
    async checkExistingLinkCardAttempt() {
      this.idempotencyKey = '' // Reset idempotency key before checking
      const attempt = await this.loadLinkCardAttempt();
      if (attempt) {
        console.log('Existing card creation attempt found:', attempt);
        this.showResumeLinkCardDialog = true;
        this.idempotencyKey = attempt.idempotencyKey || '';
      } else {
        console.log('No existing card creation attempt found');
      }
    },
    async onOpenLinkCardForm() {
      await this.checkExistingLinkCardAttempt()
      this.showLinkCardForm = true;
    },
    async onCloseLinkCardForm() {
      this.showLinkCardForm = false;
      await this.checkExistingLinkCardAttempt()
    },
    async onResumeCardAttempt() {
      this.showResumeLinkCardDialog = false;
      this.showLinkCardForm = true;
    },
    async onDeleteCardAttempt() {
      this.showResumeLinkCardDialog = false;
      // Clear the existing attempt from local storage
      await clearLinkCardAttempt();
      // Delete the attempt from the server as well
      await Card.deleteCardAttempt(this.idempotencyKey).catch(err => {
        console.error(err.response?.data);
      });
    },
    onCancelCardAttempt() {
      this.showResumeLinkCardDialog = false;
      this.$router.push({ path: '/apps' }) // Redirect to the same page to reset state
    }
  }
}