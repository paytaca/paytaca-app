describe('P2P Ramp Page', () => {
  beforeEach(() => {
    cy.restoreLocalStorage();
    cy.setPushErrorHandling();
    cy.visit('http://localhost:9000/#/apps');
  });

  afterEach(() => {
    cy.saveLocalStorage();
  });

  const clickTab = (label, urlPart) => {
    cy.contains(label).click();
    cy.url().should('include', urlPart);
  };

  const clickLabels = (labels) => {
    labels.forEach(label => cy.contains(label).click());
  };

  it('should navigate through P2P Ramp sections and verify elements', () => {
    // Launch P2P Ramp
    cy.contains('.pt-app-name', 'P2P Ramp')
      .closest('.pt-app')
      .click();

    cy.url().should('include', '/apps/exchange');

    const tabs = [
      { name: 'Home', url: '/exchange/peer-to-peer/store/', labels: ['Buy BCH', 'Sell BCH'] },
      { name: 'Ads', url: '/exchange/peer-to-peer/ads/', labels: ['Buy Ads', 'Sell Ads'] },
      { name: 'Orders', url: '/exchange/peer-to-peer/orders/', labels: ['Ongoing', 'Completed'] },
      { name: 'Profile', url: '/exchange/peer-to-peer/profile/', labels: ['REVIEWS', 'ADS'] }
    ];

    tabs.forEach(({ name, url, labels }) => {
      clickTab(name, url);
      clickLabels(labels);
    });
  });
});
