describe('Onboarding', () => {
  afterEach(() => {
    cy.saveLocalStorage();
  });

  it('Create Wallet', () => {
    cy.visit('/accounts');
    cy.logInteractionTime('#create-new-wallet', () => {
      cy.get('#create-new-wallet', { timeout: 10000 }).click();
    });

    const subscriptionRequests = [
      // Same data as before...
    ];

    subscriptionRequests.forEach(({ desc, url, body }) => {
      cy.logRequestTime(desc, () => cy.request('POST', url, body));
    });

    const preferences = [
      '5978c1c76cc1dc2d0f4172d874c88110fcdfd55ac9b2d8c5c7e310f08104f5b0',
      'c7e431baeb12161d65f2950fa2a15c6e38f5bae909a40b2b7df361b3eb846ed4'
    ];
    preferences.forEach((hash, index) => {
      cy.logRequestTime(`Wallet Preferences Request ${index + 1}`, () =>
        cy.request({ url: `https://watchtower.cash/api/wallet/preferences/${hash}/`, failOnStatusCode: false })
          .its('status').should('equal', 404)
      );
    });

    cy.logRequestTime('Mainnet Options Request 1', () =>
      cy.request('OPTIONS', 'https://smartbch.fountainhead.cash/mainnet')
    );

    cy.logRequestTime('Mainnet POST Request 1', () =>
      cy.request('POST', 'https://smartbch.fountainhead.cash/mainnet', [{
        id: 42, jsonrpc: "2.0", method: "eth_chainId", params: []
      }])
    );

    // Seed phrase verification
    const correctSeedPhrase = [];
    cy.get('.col-10 > .word', { timeout: 10000 }).each($el => {
      correctSeedPhrase.push($el.text().trim());
    }).then(() => {
      cy.logInteractionTime('#mnem-continue-btn3', () => {
        cy.get('#mnem-continue-btn3').click();
      });
      cy.wrap(correctSeedPhrase).each(word => {
        cy.get('.shuffledphrase').contains(word).click();
      });
      cy.logInteractionTime('#continue-verify-phrase-button', () => {
        cy.get('#continue-verify-phrase-button').click();
      });
    });

    cy.logRequestTime('GET Currencies', () => {
      cy.request('GET', 'https://api.yadio.io/currencies').its('status').should('equal', 200);
    });

    cy.logInteractionTime('#country-selector', () => {
      cy.get('#country-selector').click();
    });

    cy.get('[data-country]').then(($options) => {
      const index = Math.floor(Math.random() * $options.length);
      cy.wrap($options[index]).click({ force: true });
    });

    cy.logInteractionTime('accounts-continue', () => {
      cy.clickContinue(); // accounts.vue localization
    });

    cy.logInteractionTime('theme-continue', () => {
      cy.clickContinue(); // theme selection
    });

    const pin = [];
    cy.get('.pp-key.pt-key-num').then($keys => {
      let i = 0;
      while (pin.length < 6 && i < $keys.length * 2) {
        const index = Math.floor(Math.random() * $keys.length);
        const key = $keys[index];
        if (!key.disabled) {
          pin.push(key.innerText.trim());
          cy.wrap(key).click();
        }
        i++;
      }
    }).then(() => {
      cy.get('.col-3.pt-col-key').eq(14).click();
      pin.forEach(num => cy.get('.pp-key.pt-key-num').contains(num).click());
      cy.get('.col-3.pt-col-key').eq(14).click();
    });

    cy.visit('/');
    cy.url().should('eq', 'http://localhost:9000/#/');
  });
});