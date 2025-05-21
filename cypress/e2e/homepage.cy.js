describe('Home Page', () => {
  beforeEach(() => {
    cy.restoreLocalStorage();
    cy.setPushErrorHandling();
    cy.visit('http://localhost:9000/#/apps');
  });

  afterEach(() => {
    cy.saveLocalStorage();
  });

  const testTabNavigation = (buttonSelector, expectedUrl, checkSelector) => {
    cy.get(buttonSelector).click();
    cy.url().should('equal', expectedUrl);
    cy.get(checkSelector).should('exist');
  };

  it('Checks Dashboard Tabs', () => {
    cy.visit('/', { timeout: 10000 });

    cy.measureHomeButtonLoadTime('#home-button', '#home-button', 'Home');

    testTabNavigation('#send-button', 'http://localhost:9000/#/send/select-asset', '#SEND');
    testTabNavigation('#receive-button', 'http://localhost:9000/#/receive/select-asset', '#RECEIVE');
    testTabNavigation('#apps-button', 'http://localhost:9000/#/apps', '#Applications');
    testTabNavigation('#qr-reader-button', 'http://localhost:9000/#/qr-reader', '#qr-reader-body');
  });
});
