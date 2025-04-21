const { waitForDebugger } = require("inspector")

describe('P2P Exchange Page', () => {
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

  afterEach(() => {
    cy.window().then((win) => {
      cy.wait(4000)
      //reading existing data
      cy.readFile('cypress/fixtures/storage.json').then((existingData) => {
        const allLocalStorageData = {}
        cy.log(existingData)
        //get new data
        Object.keys(win.localStorage).forEach((key) => {
          allLocalStorageData[key] = win.localStorage.getItem(key)
        })
        //merge the existing data with the new data 
        const mergedData = {
          ...existingData,
          ...allLocalStorageData
        }
        //write the merged data to storage.json
        cy.writeFile('cypress/fixtures/storage.json',mergedData)
        cy.log('Appended')
        cy.log(mergedData)  
      })
    })
  })

  it('should load the applications page', () => {
    // Basic test to verify the page loads
    cy.visit('http://localhost:9000/#/apps')
  })

  it('P2P Page elements function as expected', () => {
    cy.contains('.pt-app-name', 'P2P Exchange').parent().find('.pt-app').click()
    cy.url().should('include', '/apps/exchange')

    //store or home
    cy.contains('Home').click()
    cy.url().should('include', '/exchange/peer-to-peer/store/')
    cy.contains('P2P Exchange').click()
    cy.contains('Buy BCH').click()
    cy.contains('Sell BCH').click()
    //cy.contains('USD').click()
    //cy.contains('Amount').click()
    //cy.contains('Payment Types').click()
    // Randomize currency click

    //Ads
    cy.contains('Ads').click()
    cy.url().should('include', '/exchange/peer-to-peer/ads/')
    cy.contains('Buy Ads').click()
    cy.contains('Sell Ads').click()

    //Orders
    cy.contains('Orders').click()
    cy.url().should('include', '/exchange/peer-to-peer/orders/')
    cy.contains('Ongoing').click()
    cy.contains('Completed').click()
    //cy.contains('All').click()
    // Randomize currency click

    //Profile
    cy.contains('Profile').click()
    cy.url().should('include', '/exchange/peer-to-peer/profile/')
    cy.contains('REVIEWS').click()
    cy.contains('ADS').click()
    //profile causes internal server error atm

  }
)





})