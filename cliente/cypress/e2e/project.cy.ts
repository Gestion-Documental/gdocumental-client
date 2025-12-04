describe('Project Management', () => {
  beforeEach(() => {
    // Login as Director using Quick Access
    cy.visit('/');
    cy.contains('Director').click(); // Click the quick access button
    // Wait for login to complete and dashboard to load
    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');
  });

  it('should load the dashboard successfully', () => {
    cy.contains('Total Docs').should('be.visible');
    cy.contains('Pendientes').should('be.visible');
  });
});
