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

  //sample sitemap implementation for important screens to use in CI/CD
  //On every code push using Github actions or Bitrise
  //Track load time per screen
  const appScreens = [
    { name: 'Home', navigate: () => cy.get('#home-button').click() },
    { name: 'Send', navigate: () => cy.get('#send-button').click() },
    { name: 'Receive', navigate: () => cy.get('#receive-button').click() },
    { name: 'Apps', navigate: () => cy.get('#apps-button').click() },
    { name: 'QRreader', navigate:() => cy.get('#qr-reader-button').click() }
  ];

  appScreens.forEach(screen => {
    it(`Visits ${screen.name} screen`, () => {
      const start = performance.now();

      screen.navigate();
      cy.get(screen.selector, {timeout: 1000}).should('be.visible') //screen.selector is a specific selector

      const end = performance.now();
      const loadTime = (end - start).toFixed(2);
      //cy.get('body').should('be.visible'); // basic load check
      cy.screenshot(); // optional for visual check
      cy.log(`$(screen.name) loaded in $(loadTime)ms`);
    });
  });

  //Verify API responses if the screen loads data.
  cy.intercept('**/api/**').as('apiCalls'); // Watch API requests

  appScreens.forEach(screen => {
    it(`Checks ${screen.name} screen performance & API`, () => {
      const t0 = Date.now();

      screen.navigate();
      cy.get(screen.selector, { timeout: 10000 }).should('be.visible');

      const t1 = Date.now();
      cy.log(`${screen.name} loaded in ${t1 - t0}ms`);

      // Wait for APIs and check status
      cy.wait('@apiCalls').its('response.statusCode').should('eq', 200);

      // Optional: Check for visible errors
      cy.get('body').should('not.contain.text', 'Error');
    });
  });



});
