describe('Send Page', () => {
  beforeEach(() => {
    cy.restoreLocalStorage();
    cy.setPushErrorHandling();
    cy.visit('http://localhost:9000/#/apps');
  });

  afterEach(() => {
    cy.saveLocalStorage();
  });

  const clickToken = (tokenId) => {
    cy.get('#token-popup').click();
    cy.get(`#${tokenId}`).should('be.visible').click();
  };

  it('should switch between token options from dropdown', () => {
    ['CashTokens', 'SLPtokens'].forEach(clickToken);
  });

  it('should allow sending BCH and show send form options', () => {
    cy.get('#bitcoin-cash').click();
    cy.get('#paste-address-container')
      .click()
      .type('bitcoincash:qzpwfkssk45lgfj2r7r7a6qu9al29hfemcvs8ycejc');

    cy.get('#send-to').click();

    ['#send-form-qr', '#send-form-upload'].forEach((selector) => {
      cy.get(selector).should('be.visible');
    });
  });
});
