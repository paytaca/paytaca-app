const { waitForDebugger } = require("inspector");

describe('P2P Exchange Page', () => {
  beforeEach(() => {
    cy.restoreLocalStorage();
    cy.setPushErrorHandling();
    cy.visit('http://localhost:9000/#/apps');
  });

  afterEach(() => {
    cy.saveLocalStorage();
  });

  it('should load the applications page', () => {
    cy.visit('http://localhost:9000/#/apps');
  });

  const clickTab = (label, expectedUrlPart) => {
    cy.contains(label).click();
    cy.url().should('include', expectedUrlPart);
  };

  const clickMultipleLabels = (labels) => {
    labels.forEach(label => {
      cy.contains(label).click();
    });
  };

  it('P2P Page elements function as expected', () => {
    // Launch P2P Exchange app
    cy.contains('.pt-app-name', 'P2P Exchange').parent().find('.pt-app').click();
    cy.url().should('include', '/apps/exchange');

    // Store / Home tab
    clickTab('Home', '/exchange/peer-to-peer/store/');
    cy.contains('P2P Exchange').click();
    clickMultipleLabels(['Buy BCH', 'Sell BCH']);

    // Ads tab
    clickTab('Ads', '/exchange/peer-to-peer/ads/');
    clickMultipleLabels(['Buy Ads', 'Sell Ads']);

    // Orders tab
    clickTab('Orders', '/exchange/peer-to-peer/orders/');
    clickMultipleLabels(['Ongoing', 'Completed']);

    // Profile tab
    clickTab('Profile', '/exchange/peer-to-peer/profile/');
    clickMultipleLabels(['REVIEWS', 'ADS']);
  });
});
