describe('Home Page', () => {
  
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
    cy.visit('/')
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

  it('Checks Dashboard Tabs',() => {
    cy.visit('/', { timeout: 10000 })

    cy.measureHomeButtonLoadTime(
      '#home-button',        // button selector
      '#home-button',   // element to wait for
      'Home'                 // label to expect
    )
    
    cy.get('#send-button').click()
    cy.wait(5000)
    cy.url().should('equal', 'http://localhost:9000/#/send/select-asset')
    cy.get('#SEND')
    
    cy.get('#receive-button').click()
    cy.wait(5000)
    cy.url().should('equal', 'http://localhost:9000/#/receive/select-asset')
    cy.get('#RECEIVE')

    cy.get('#apps-button').click()
    cy.wait(5000)
    cy.url().should('equal', 'http://localhost:9000/#/apps')
    cy.get("#Applications")

    cy.get('#qr-reader-button').click()
    cy.wait(5000)
    cy.url().should('equal', 'http://localhost:9000/#/qr-reader')
    cy.get('#qr-reader-body')
  })
})
      
    
  
  
 
  




