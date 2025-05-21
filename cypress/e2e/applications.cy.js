describe('Applications Page', () => {
  beforeEach(() => {
    // Restore localStorage and set error handling
    cy.restoreLocalStorage();
    cy.setPushErrorHandling();
    cy.visit('http://localhost:9000/#/apps');
  });

  afterEach(() => {
    cy.saveLocalStorage(); // Save localStorage data after each test
  });

  it('should load the applications page', () => {
    // Basic test to verify the page loads
    cy.visit('http://localhost:9000/#/apps');
  });

  it('should navigate through all menu tabs', () => {
    // Test P2P Exchange
    cy.visit('http://localhost:9000/#/apps');
    cy.contains('.pt-app-name', 'P2P Exchange').parent().find('.pt-app').click();
    cy.url().should('include', '/apps/exchange');
    cy.wait(3000); // Wait for navigation to load

    // Test Marketplace
    cy.visit('http://localhost:9000/#/apps');
    cy.wait(5000); // Wait for elements to load
    cy.contains('.pt-app-name', 'Marketplace').parent().find('.pt-app').should('be.visible').click();
    cy.url().should('include', '/apps/marketplace');
    
    // Test Wallet Connect with Translation Handling
    testAppNavigation('apps-wallet-connect', '/#/apps/wallet-connect');

    // Test Gifts
    testAppNavigation('apps-gifts-', '/#/apps/gifts');

    // Test Collectibles
    testAppNavigation('apps-collectibles', '/#/apps/collectibles');

    // Test AnyHedge
    cy.visit('http://localhost:9000/#/apps');
    cy.contains('.pt-app-name', 'AnyHedge').parent().find('.pt-app').click();
    cy.url().should('include', '/apps/anyhedge');

    // Test Map with translation
    cy.visit('http://localhost:9000/#/apps');
    cy.window().then((win) => {
      cy.stub(win, 'open').as('windowOpen');
    });
    cy.contains('.pt-app-name', 'Map').parent().find('.pt-app').click();
    cy.get('@windowOpen').should('have.been.calledWith', 'https://www.paytaca.com/map/', '_blank');
    cy.url().should('include', '/#/apps');

    // Test Merchant Admin with Translation Handling
    testAppNavigation('apps-pos-admin', '/#/apps/pos-admin');

    // Test Wallet Info with Translation Handling
    testAppNavigation('apps-wallet-info', '/#/apps/wallet-info');

    // Test Wallet Backup with Translation Handling
    testAppNavigation('apps-wallet-backup', '/#/apps');

    // Test Settings with Translation Handling
    testAppNavigation('apps-settings', '/#/apps/settings');
  });

  // Helper function to handle repeated navigation tests
  function testAppNavigation(dataTest, expectedUrl) {
    cy.visit('http://localhost:9000/#/apps');
    cy.get(`.pt-app[data-test="${dataTest}"]`, { timeout: 10000 })
      .should('exist')
      .should('be.visible')
      .click();
    cy.url().should('include', expectedUrl);
    cy.visit('http://localhost:9000/#/apps');
    cy.url().should('include', '/#/apps');
    cy.get(`.pt-app[data-test="${dataTest}"]`, { timeout: 10000 }).should('be.visible');
  }
});
