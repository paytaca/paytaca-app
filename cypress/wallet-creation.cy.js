const { hasUncaughtExceptionCaptureCallback } = require("process");

describe('Onboarding', () => {
  //Save local storage and session storage
  afterEach(() => {
    cy.window().then((win) => {
      cy.wait(4000)
      
      const allLocalStorageData = {}
      Object.keys(win.localStorage).forEach((key) => {
        //if(key === 'vuex'){
        //  allLocalStorageData[key] = JSON.parse(win.localStorage.getItem(key)) -- to be function
        //}
        allLocalStorageData[key] = win.localStorage.getItem(key)
      })
      if(Object.keys(allLocalStorageData).length > 0){
        cy.writeFile('cypress/fixtures/storage.json', allLocalStorageData)
        cy.log('Progress saved to storage.json')
      }
      else{
        cy.log('no data found')
      }
    })
  })

  it('Create Wallet', () => {
    cy.visit('/accounts')
    cy.get('#create-new-wallet', {timeout: 10000}).click();

    //logs RequestTime
    function logRequestTime(description, requestFn){
      cy.then(() => {
        performance.mark(`${description}-start`)
        requestFn().then((response) => {
          performance.mark(`${description}-end`)
          performance.measure(description, `${description}-start`, `${description}-end`)

          const measure = performance.getEntriesByName(description)[0]
          const elapsedTime = measure.duration.toFixed(2)
          cy.log(`${description} took ${elapsedTime} ms`)
          
          performance.clearMarks()
          performance.clearMeasures()
        })
      })
    }

    logRequestTime('Subscription Request 1', () =>
      cy.request('POST', 'https://watchtower.cash/api/subscription/', {
        address_index: 0,
        addresses: { 
          change: "bitcoincash:qzn96ukkln2mtwfseccnjts4qdqldghnxgq9qdlsea",
          receiving: "bitcoincash:qp27rdp69agjqsa3a0tlpcs2ch7xluz0nyp7w7254q"
        },
        project_id: "d9d471d0-9f52-4d5b-8761-e71254f3720f",
        wallet_hash: "c3dceeb344b36f62c827694144164c4b941b07551b3ad1872cbfd0955e8914f5"
      })
    )

    logRequestTime('Wallet Preferences Request 1', () => 
      cy.request({url: 'https://watchtower.cash/api/wallet/preferences/5978c1c76cc1dc2d0f4172d874c88110fcdfd55ac9b2d8c5c7e310f08104f5b0/', failOnStatusCode: false})
      .its('status')
      .should('equal', 404)
    )

    logRequestTime('Subscription Request 2', () => 
      cy.request('POST', 'https://chipnet.watchtower.cash/api/subscription/', {
        address_index: 0,
        addresses: { 
        change: "bchtest:qq9h0a9astsa7lmyvljxqyc7e2wljjpqf5n9tp3yze",
        receiving: "bchtest:qp3ufw3x4g2dkw06fem9n4mhcdxrvxfmfszz979ydd"
        },
        project_id: "5348e8fd-c001-47c7-b97c-807f545cf44e",
        wallet_hash: "db21293c86642ab8ba294f5b2c1a0e47ad5bd49f6774e8f01ef81ecaced1013e"
      })
    )

    logRequestTime('Wallet Preferences Request 2', () => 
      cy.request({url: 'https://watchtower.cash/api/wallet/preferences/c7e431baeb12161d65f2950fa2a15c6e38f5bae909a40b2b7df361b3eb846ed4/', failOnStatusCode: false})
      .its('status')
      .should('equal', 404)
    )

    logRequestTime('Subscription Request 3', () => 
      cy.request('POST', 'https://watchtower.cash/api/subscription/', {
        address_index: 0,
        addresses: { 
          change: "simpleledger:qzx3wcvrjypyj8wt9ggpmg07ann8a99m7utt6ernxx",
          receiving: "simpleledger:qzlwxm0hy68ng64atqkknkt960sg0lj0nyhr9qr4j5"
        },
        project_id: "d9d471d0-9f52-4d5b-8761-e71254f3720f",
        wallet_hash: "3dd58a73f7bff449044db8325efa5ec91b80044a4f519cdcbad214348187ccb4"
      })
    )

    logRequestTime('Subscription Request 4', () => 
      cy.request('POST', 'https://chipnet.watchtower.cash/api/subscription/', {
        address_index: 0,
        addresses: { 
          change: "slptest:qzx3wcvrjypyj8wt9ggpmg07ann8a99m7uckj7wnde",
          receiving: "slptest:qzlwxm0hy68ng64atqkknkt960sg0lj0nyy7d8w4et"
        },
        project_id: "5348e8fd-c001-47c7-b97c-807f545cf44e",
        wallet_hash: "3dd58a73f7bff449044db8325efa5ec91b80044a4f519cdcbad214348187ccb4"
      })
    )

    logRequestTime('Subscription Request 5', () =>
      cy.request('POST', 'https://watchtower.cash/api/subscription/', {
        address_index: 0,
        address: "0x9aC9c7c328AB6a53BCf82FAE517279122E733070",
        project_id: "d9d471d0-9f52-4d5b-8761-e71254f3720f",
        wallet_hash: "a4aad90cfb2687f946f21c27eb384b2e950553113516f912d39529a12e2bb7a1",
        wallet_index: 0
      })
    )

    logRequestTime('Mainnet Options Request 1', () =>
      cy.request('OPTIONS', 'https://smartbch.fountainhead.cash/mainnet')
    )

    logRequestTime('Mainnet POST Request 1',() => 
      cy.request('POST', 'https://smartbch.fountainhead.cash/mainnet', [{
        id: 42,
        jsonrpc: "2.0",
        method: "eth_chainId",
        params: []
      }])
    )

    //Get Correct Seed Phrase
    const correctSeedPhrase = []
    cy.get('.col-10 > .word', {timeout: 10000}).each(($el) => {
      const word = $el.text().trim()
      cy.log('Adding Word:', word) // Log each word
      correctSeedPhrase.push(word)
    }).then(() => {
        cy.log('Correct Seed Phrase:', correctSeedPhrase)
      })
    
    cy.get('#mnem-continue-btn3', {timeout: 10000}).click() //continue button
    cy.wait(1000)
    cy.log('correct seed phrase: ', correctSeedPhrase)

    //Simulate user clicking buttons in order
    cy.wrap(correctSeedPhrase).each((word) =>{
      cy.get('.shuffledphrase').each(($button) => {
        const buttonText = $button.text().trim()
        cy.log('Button text:', buttonText, 'Word:', word)
        if(buttonText === word){
          cy.wrap($button)
            .should('be.visible')
            .should('be.enabled')
            .click()
        }
      })   
    })
    
    cy.get('#continue-verify-phrase-button', {timeout:10000}).click()
    //Set localization Preferences
    cy.request('GET', 'https://api.yadio.io/currencies', {}).its('status').should('equal', 200)
    
    cy.intercept('GET', '**/api/market-prices/***').as('getMarketPrices');
    cy.get('#country-selector', {timeout: 10000}).click()
    cy.get('[data-country]').then(($options) => {
        const randomIndex = Math.floor(Math.random() * $options.length);
        const selectedCountry = $options[randomIndex].innerText.trim();
        cy.log(`Selected Country: ${selectedCountry}`);
        cy.log('Options: ', $options)
        cy.wrap($options[randomIndex]).click({ force: true });
    })

    //BLOCKER
    //  cy.wait(2000); // Short wait to allow rendering
    //  cy.contains('#selected-country')
   
    cy.get('#Continue', {timeout:10000}).click() //accounts.vue localization 
    cy.get('#Continue', {timeout:10000}).click() //themeselector

    //Enter and confirm pin code
    const selectedNumbers = []
    cy.get('.pp-key.pt-key-num').then(($options) => {
      let count = 0

      while(count < 6){
        const randomNumber = Math.floor(Math.random() * $options.length)
        const selectedElement = $options[randomNumber]

        //check if the element is disabled
        if(!selectedElement.hasAttribute('disabled')){
          selectedNumbers.push(selectedElement.innerText.trim())
          cy.wrap(selectedElement).click()
          cy.log(`Selected number ${count+1}: ${selectedElement.innerText.trim()}`)
          count++
        }
        else{
          cy.log(`Skipping disabled number: ${selectedElement.innerText.trim()}`)
        }
      }
    }).then(() => {
        cy.wrap(selectedNumbers).as('savedNumbers')
        cy.log(`Final selected numbers: ${selectedNumbers}`)
      })
      .then(() =>{
        cy.get('.col-3.pt-col-key').eq(14).click();
        cy.log('Clicked the check button (First time)')
      })
      .then(() => {
        cy.get('@savedNumbers').then((numbers) => {
          numbers.forEach((num) => {
            cy.get('.pp-key.pt-key-num')
              .contains(num)
              .click()
            cy.log('`Confirmed number: ${num}')
          })
        })
      })
      .then(() => {
        //Clicking the check button again
        cy.get('.col-3.pt-col-key').eq(14).click()
        cy.log('Clicked the check button (Second Time)')
        cy.wait(5000)
      })
    //Ensure wallet is created
    cy.visit('/')
    cy.url().should('equal', 'http://localhost:9000/#/')
  })
})


