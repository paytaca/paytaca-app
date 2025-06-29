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

// Custom command to restore localStorage from storage.json
Cypress.Commands.add('restoreLocalStorage', () => {
cy.readFile('cypress/fixtures/storage.json').then((data) => {
  if (data) {
    cy.window().then((win) => {
      Object.keys(data).forEach((key) => {
        win.localStorage.setItem(key, data[key]);
      });
      cy.log('Restored data: ', data);
    });
  } else {
    cy.log('No data found in storage.json');
  }
});
});

// Custom command to save localStorage to storage.json
Cypress.Commands.add('saveLocalStorage', () => {
cy.window().then((win) => {
  cy.readFile('cypress/fixtures/storage.json').then((existingData) => {
    const allLocalStorageData = {};
    // Get new data
    Object.keys(win.localStorage).forEach((key) => {
      allLocalStorageData[key] = win.localStorage.getItem(key);
    });
    // Merge and write data
    const mergedData = { ...existingData, ...allLocalStorageData };
    cy.writeFile('cypress/fixtures/storage.json', mergedData);
    cy.log('Appended');
    cy.log(mergedData);
  });
});
});

// Custom command for error handling
Cypress.Commands.add('setPushErrorHandling', () => {
Cypress.on('uncaught:exception', (err) => {
  if (
    (err.message && err.message.includes('"PushNotifications" plugin is not implemented on web')) ||
    (err.message && err.message.includes('Request failed with status code 403'))
  ) {
    return false;
  }
  return true;
});
});

// cypress/support/commands.js (if not already added)
Cypress.Commands.add('logRequestTime', (label, fn) => {
  const start = Date.now();
  fn().then(() => {
    const time = Date.now() - start;
    cy.task('logRequestTime', { url: label, time });
  });
});

Cypress.Commands.add('logInteractionTime', (selector, fn) => {
  const start = Date.now();
  fn();
  cy.then(() => {
    const time = Date.now() - start;
    cy.task('logInteraction', { element: selector, time });
  });
});

Cypress.Commands.add('clickContinue', () => {
  cy.get('#Continue', { timeout: 10000 }).click();
});










