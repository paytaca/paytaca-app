const { waitForDebugger } = require("inspector")

describe('Applications Page', () => {
  beforeEach(() => {
    //Restore localStorage and sessionStorage
    cy.readFile('cypress/fixtures/storage.json').then((data) => {
      //restore wallet info into localStorage
      if(data){
        cy.window().then((win) => {
          Object.keys(data).forEach((key) => {
            win.localStorage.setItem(key, data[key])
          })
          cy.log('Restored data: ', data)
        })
      }
      else{
        cy.log('no data found in storage.json')
      }
    })
    cy.visit('http://localhost:9000/#/apps')
  })

  beforeEach('Push Error handling',() => {
    Cypress.on('uncaught:exception', (err) => {
      //Ignore push notifications error and 403 status code errors
      if(
        (err.message && err.message.includes('"PushNotifications" plugin is not implemented on web')) ||
        (err.message && err.message.includes('Request failed with status code 403'))
      ){
        return false
      }
      return true
    })
  })

  it('should load the applications page', () => {
    // Basic test to verify the page loads
    cy.visit('http://localhost:9000/#/apps')
  })

  it('should navigate through all menu tabs', () => {
    // Test P2P Exchange
    cy.visit('http://localhost:9000/#/apps')
    cy.contains('.pt-app-name', 'P2P Exchange').parent().find('.pt-app').click()
    cy.url().should('include', '/apps/exchange')
    
    // Test Marketplace
    cy.visit('http://localhost:9000/#/apps')
    cy.contains('.pt-app-name', 'Marketplace').parent().find('.pt-app').click()
    cy.url().should('include', '/apps/marketplace')

    // Test Wallet Connect with Translation Handling
    cy.visit('http://localhost:9000/#/apps')
    cy.get('.pt-app[data-test="apps-wallet-connect"]', { timeout: 10000 })
      .should('exist')
      .should('be.visible')
      .click()
    cy.url().should('include', '/#/apps/wallet-connect')

    // Go back to apps page to ensure navigation works
    cy.visit('http://localhost:9000/#/apps')
    cy.url().should('include', '/#/apps')
    cy.get('.pt-app[data-test="apps-wallet-connect"]', { timeout: 10000 }).should('be.visible')

    //Test Gifts
    cy.visit('http://localhost:9000/#/apps')
    cy.get('.pt-app[data-test="apps-gifts-"]', { timeout: 10000 })
      .should('exist')
      .should('be.visible')
      .click({timeout: 10000})
    cy.url().should('include', '/#/apps/gifts')

    // Go back to apps page to ensure navigation works
    cy.visit('http://localhost:9000/#/apps')
    cy.url().should('include', '/#/apps')
    cy.get('.pt-app[data-test="apps-gifts-"]', { timeout: 10000 }).should('be.visible')

    // Test Collectibles
    cy.visit('http://localhost:9000/#/apps')
    cy.get('.pt-app[data-test="apps-collectibles"]', { timeout: 10000 })
      .should('exist')
      .should('be.visible')
      .click()
    cy.url().should('include', '/#/apps/collectibles')
    // Go back to apps page
    cy.visit('http://localhost:9000/#/apps')
    cy.url().should('include', '/#/apps')
    cy.get('.pt-app[data-test="apps-collectibles"]', { timeout: 10000 }).should('be.visible') 

    //Test AnyHedge
    cy.visit('http://localhost:9000/#/apps')
    cy.contains('.pt-app-name', 'AnyHedge').parent().find('.pt-app').click()
    cy.url().should('include', '/apps/anyhedge')

    // Test Map with translation
    cy.visit('http://localhost:9000/#/apps')
    // Set up window.open stub before clicking
    cy.window().then((win) => {
      cy.stub(win, 'open').as('windowOpen')
    })
    cy.contains('.pt-app-name', 'Map').parent().find('.pt-app').click()
    // Verify new tab opens with map.paytaca.com
    cy.get('@windowOpen').should('have.been.calledWith', 'https://www.paytaca.com/map/', '_blank')
    // Verify we're back on apps page
    cy.url().should('include', '/#/apps')

    // Test Merchant Admin
    cy.visit('http://localhost:9000/#/apps')
    cy.get('.pt-app-name', { timeout: 10000 })
      .filter((_, el) => {
        const text = el.textContent.trim()
        return /^(Merchant Admin|Administrador comercial|Administrateur marchand|Kaufmann Admin|Amministratore commerciale|Handelaarbeheerder|Admin|المسؤول التاجر|商人管理员|商人管理員)$/.test(text)
      })
      .parent()
      .find('.pt-app')
      .click()
    cy.url().should('include', '/apps/pos-admin')

   // Test Wallet Info with Translation Handling
    cy.visit('http://localhost:9000/#/apps')
    cy.get('.pt-app[data-test="apps-wallet-info"]', { timeout: 10000 })
      .should('exist')
      .should('be.visible')
      .click()
    cy.url().should('include', '/#/apps/wallet-info')

    // Go back to apps page to ensure navigation works
    cy.visit('http://localhost:9000/#/apps')
    cy.url().should('include', '/#/apps')
    cy.get('.pt-app[data-test="apps-wallet-info"]', { timeout: 10000 }).should('be.visible')

    //Test Wallet Backup with Translation Handling
    cy.visit('http://localhost:9000/#/apps')
    cy.get('.pt-app[data-test="apps-wallet-backup"]', { timeout: 10000 })
      .should('exist')
      .should('be.visible')
      .click()
    cy.url().should('include', '/#/apps')

    // Go back will not work since url is the same
    cy.go('back')
    cy.go('back')

    // Test Settings with Translation Handling
    cy.visit('http://localhost:9000/#/apps')
    cy.get('.pt-app[data-test="apps-settings"]', { timeout: 10000 })
      .should('exist')
      .should('be.visible')
      .click()
    cy.url().should('include', '/#/apps/settings')

    //Go back to apps page to ensure navigation works
    cy.visit('http://localhost:9000/#/apps')
    cy.url().should('include', '/#/apps')
    cy.get('.pt-app[data-test="apps-settings"]', { timeout: 10000 }).should('be.visible')

  })
}) 