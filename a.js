// src/config/config.js

const config = {
  // ... suas configurações existentes (wfm, gps, siebel, etc.)
  
  // ✅ ADICIONE ESTA SEÇÃO SDU
  sdu: {
    url: 'https://sdu.redecorp.br/DiagnoseServiceProblem/home',
    selectors: {
      homeState: '.ui-home-state',
      searchInput: 'input.mat-input-element[formcontrolname="search"]',
      searchButton: '.ui-button-home',
      resultTable: '.mat-table',
      resultCard: '.ui-card',
      errorMessage: '.mat-error, .mat-snack-bar-container'
    }
  }
};

module.exports = config;
