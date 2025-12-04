describe('Document Lifecycle', () => {
  const docTitle = 'E2E Test Document ' + Date.now();

  it('should allow Engineer to login and see dashboard', () => {
    // 1. Login as Engineer
    cy.visit('/');
    cy.contains('Ingeniero').click();
    
    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');
    cy.contains('Ingeniero').should('be.visible'); // In navbar profile
  });

  it('should allow Director to login and see dashboard', () => {
    // 2. Login as Director
    cy.visit('/');
    cy.contains('Director').click();

    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');
    cy.contains('Director').should('be.visible'); // In navbar profile
  });
});
