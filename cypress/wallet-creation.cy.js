describe('Onboarding', () => {
  afterEach(() => {
    cy.saveLocalStorage();
  });

  it('Create Wallet', () => {
    cy.visit('/accounts');
    cy.get('#create-new-wallet', { timeout: 10000 }).click();

    const subscriptionRequests = [
      {
        desc: 'Subscription Request 1',
        url: 'https://watchtower.cash/api/subscription/',
        body: {
          address_index: 0,
          addresses: {
            change: "bitcoincash:qzn96ukkln2mtwfseccnjts4qdqldghnxgq9qdlsea",
            receiving: "bitcoincash:qp27rdp69agjqsa3a0tlpcs2ch7xluz0nyp7w7254q"
          },
          project_id: "d9d471d0-9f52-4d5b-8761-e71254f3720f",
          wallet_hash: "c3dceeb344b36f62c827694144164c4b941b07551b3ad1872cbfd0955e8914f5"
        }
      },
      {
        desc: 'Subscription Request 2',
        url: 'https://chipnet.watchtower.cash/api/subscription/',
        body: {
          address_index: 0,
          addresses: {
            change: "bchtest:qq9h0a9astsa7lmyvljxqyc7e2wljjpqf5n9tp3yze",
            receiving: "bchtest:qp3ufw3x4g2dkw06fem9n4mhcdxrvxfmfszz979ydd"
          },
          project_id: "5348e8fd-c001-47c7-b97c-807f545cf44e",
          wallet_hash: "db21293c86642ab8ba294f5b2c1a0e47ad5bd49f6774e8f01ef81ecaced1013e"
        }
      },
      {
        desc: 'Subscription Request 3',
        url: 'https://watchtower.cash/api/subscription/',
        body: {
          address_index: 0,
          addresses: {
            change: "simpleledger:qzx3wcvrjypyj8wt9ggpmg07ann8a99m7utt6ernxx",
            receiving: "simpleledger:qzlwxm0hy68ng64atqkknkt960sg0lj0nyhr9qr4j5"
          },
          project_id: "d9d471d0-9f52-4d5b-8761-e71254f3720f",
          wallet_hash: "3dd58a73f7bff449044db8325efa5ec91b80044a4f519cdcbad214348187ccb4"
        }
      },
      {
        desc: 'Subscription Request 4',
        url: 'https://chipnet.watchtower.cash/api/subscription/',
        body: {
          address_index: 0,
          addresses: {
            change: "slptest:qzx3wcvrjypyj8wt9ggpmg07ann8a99m7uckj7wnde",
            receiving: "slptest:qzlwxm0hy68ng64atqkknkt960sg0lj0nyy7d8w4et"
          },
          project_id: "5348e8fd-c001-47c7-b97c-807f545cf44e",
          wallet_hash: "3dd58a73f7bff449044db8325efa5ec91b80044a4f519cdcbad214348187ccb4"
        }
      },
      {
        desc: 'Subscription Request 5',
        url: 'https://watchtower.cash/api/subscription/',
        body: {
          address_index: 0,
          address: "0x9aC9c7c328AB6a53BCf82FAE517279122E733070",
          project_id: "d9d471d0-9f52-4d5b-8761-e71254f3720f",
          wallet_hash: "a4aad90cfb2687f946f21c27eb384b2e950553113516f912d39529a12e2bb7a1",
          wallet_index: 0
        }
      }
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
      cy.get('#mnem-continue-btn3').click();
      cy.wrap(correctSeedPhrase).each(word => {
        cy.get('.shuffledphrase').contains(word).click();
      });
      cy.get('#continue-verify-phrase-button').click();
    });

    // Localization
    cy.request('GET', 'https://api.yadio.io/currencies').its('status').should('equal', 200);
    cy.get('#country-selector').click();
    cy.get('[data-country]').then(($options) => {
      const index = Math.floor(Math.random() * $options.length);
      cy.wrap($options[index]).click({ force: true });
    });

    cy.clickContinue(); // accounts.vue localization
    cy.clickContinue(); // theme selection

    // PIN Entry
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
      cy.get('.col-3.pt-col-key').eq(14).click(); // check button
      pin.forEach(num => cy.get('.pp-key.pt-key-num').contains(num).click());
      cy.get('.col-3.pt-col-key').eq(14).click();
    });

    cy.visit('/');
    cy.url().should('eq', 'http://localhost:9000/#/');
  });
});
