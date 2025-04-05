describe('Send Page', () => {
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
    cy.visit('http://localhost:9000/#/send/select-asset')
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
        cy.writeFile('cypress/fixtures/storage.json', mergedData)
        cy.log('Appended')
        cy.log(mergedData)  
      })
    })
  })

  it('Click Token Dropdown', () => {
    cy.get('#token-popup').click()
    cy.get('#CashTokens').click()
    cy.get('#token-popup').click()
    cy.get('#SLPtokens').click()
  })

  it('Send', () => {
    cy.get('#bitcoin-cash').click()
    cy.get('#paste-address-container').click().type('bitcoincash:qzpwfkssk45lgfj2r7r7a6qu9al29hfemcvs8ycejc')
    cy.get('#send-to').click()

    //SendPageForm
    cy.get('#send-form-qr')
    cy.get('#send-form-upload')
  })
})