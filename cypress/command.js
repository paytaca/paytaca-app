// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
//
// -- This will measure the load time of an element --
Cypress.Commands.add('measureHomeButtonLoadTime', (buttonSelector, waitForSelector, waitForLabel, timeout = 10000) => {
  const start = Date.now()

  // Click the home button
  cy.get(buttonSelector)
    .click()
    .then(() => {
      // Wait for the element you want to load
      cy.get(waitForSelector, { timeout })
        .should('contain', waitForLabel)
        .then(() => {
          const duration = Date.now() - start
          cy.log(`⏱️ '${waitForLabel}' loaded in ${duration} ms after clicking '${buttonSelector}'`)
        })
    })
})

Cypress.Commands.add('measureSettingsLoadTime', (labelText, waitForSelector, waitForLabel, timeout = 10000) => {
  const start = Date.now()

  // Find the label element containing the app name (e.g., 'Settings')
  cy.contains('.pt-app-name', labelText)  // Look for the label, e.g., 'Settings'
    .parent()  // Get its parent div (the entire app tile)
    .find('[data-test]')  // Find the clickable div
    .click()  // Click it
    .then(() => {
      // Wait for the app element to load after the click
      cy.get(waitForSelector, { timeout })
        .should('contain', waitForLabel)  // Verify that it contains the expected label
        .then(() => {
          const duration = Date.now() - start
          cy.log(`⏱️ '${waitForLabel}' loaded in ${duration} ms after clicking '${labelText}'`)
        })
    })
})








