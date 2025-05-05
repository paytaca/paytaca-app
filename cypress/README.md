# Paytaca App Testing - WIP

**HOW TO RUN:**

- Install [Cypress](https://www.cypress.io)

Once Cypress is installed, copy the test files from `cypress` folder into the installed `cypress/e2e` directory

- Go to the directory where Cypress is installed
- `npx cypress open`
- Choose E2E Testing
- Choose your preferred browser
- Run paytaca-app

For the ***first run***, you **must run the spec files in order (as displayed below)**:
To run, just click the specific spec file.
- `wallet-creation.cy.js`
- `homepage.cy.js`
- `send-page.cy.js`
- `applications.cy.js`

Custom commands can be found in the `command.js` file

