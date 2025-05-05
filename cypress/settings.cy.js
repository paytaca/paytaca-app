const { waitForDebugger } = require("inspector")

describe('Settings Page', () => {
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

  it('Settings page elements function as expected', () => {
    cy.visit('http://localhost:9000/#/apps',{timeout:1000})

    cy.measureSettingsLoadTime(
      'Settings',         // text to look for
      '.pt-app-name',     // element to wait for, flaky, should increase timeout here
      'Settings'          // label to expect
    )
    cy.url().should('include', '/apps/settings')
    
    //Update all elements that can be subject to translations
    //Security
    cy.contains('Security').click()
        //Change PIN
        //cy.contains('Change PIN').click()
        // cy.go('back')

    //Wallet
    cy.contains('Wallet').click()
    cy.contains('Currency').click()
    cy.contains('Show Tokens').click()
    cy.contains('Manage Ignored Tokens').click()
    cy.contains('Use Chipnet Network').click()
    cy.contains('Auto generate address').click()
    // cy.contains('Enable Stablehedge').click() -- contains popup
    cy.contains('BCH Denomination').click()

    //Personalize
    cy.contains('Personalize').click()
    cy.contains('Country').click()
    cy.contains('Language').click()
    cy.contains('Dark Mode').click() // -- toggle back for dark mode

    //App Info
    cy.contains('App Info').click()
    cy.contains('Version').click()
    cy.contains('Source code repository').click()
    
    
    
  })
}) 