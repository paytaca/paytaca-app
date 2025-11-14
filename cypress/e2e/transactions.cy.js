describe('Transaction detail navigation', () => {
  it('navigates to dedicated URL and renders transaction detail', () => {
    const txid = 'TX1'

    cy.intercept('GET', '**/history/wallet/**', {
      statusCode: 200,
      body: {
        history: [
          {
            txid,
            record_type: 'incoming',
            amount: 0.001,
            tx_fee: 1000,
            market_prices: {},
            asset: { id: 'bch', symbol: 'BCH' }
          }
        ],
        page: 1,
        num_pages: 1,
        has_next: false
      }
    }).as('getTx')

    cy.visit(`/#/transaction/tx/${txid}`)

    cy.wait('@getTx')

    // Verify some UI from the transaction dialog appears
    cy.contains('Transaction').should('exist')
    cy.contains('View in explorer', { matchCase: false }).should('exist')
  })
})


