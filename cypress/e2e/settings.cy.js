describe('Settings Page', () => {
  beforeEach(() => {
    cy.restoreLocalStorage();
    cy.setPushErrorHandling();
    cy.visit('http://localhost:9000/#/apps');
  });

  afterEach(() => {
    cy.saveLocalStorage();
  });

  const clickAll = (labels = []) => {
    labels.forEach((label) => cy.contains(label).click());
  };

  it('Settings page elements function as expected', () => {
    cy.visit('http://localhost:9000/#/apps', { timeout: 1000 });

    cy.measureSettingsLoadTime(
      'Settings',
      '.pt-app-name',
      'Settings'
    );
    cy.url().should('include', '/apps/settings');

    // Sections and their clickable sub-options
    const settingsSections = {
      Security: [], // Placeholder, uncomment actions below if needed
      Wallet: [
        'Currency',
        'Show Tokens',
        'Manage Ignored Tokens',
        'Use Chipnet Network',
        'Auto generate address',
        // 'Enable Stablehedge', // causes popup
        'BCH Denomination',
      ],
      Personalize: [
        'Country',
        'Language',
        'Dark Mode',
      ],
      'App Info': [
        'Version',
        'Source code repository',
      ],
    };

    Object.entries(settingsSections).forEach(([section, items]) => {
      cy.contains(section).click();
      clickAll(items);
    });
  });
});
