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
    cy.get(`#${tokenId}`).click();
  };

  it('Click Token Dropdown', () => {
    clickToken('CashTokens');
    clickToken('SLPtokens');
  });

  it('Send', () => {
    cy.get('#bitcoin-cash').click();
    cy.get('#paste-address-container')
      .click()
      .type('bitcoincash:qzpwfkssk45lgfj2r7r7a6qu9al29hfemcvs8ycejc');
    cy.get('#send-to').click();

    // Check send form options
    cy.get('#send-form-qr');
    cy.get('#send-form-upload');
  });
});
