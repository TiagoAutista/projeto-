// src/lib/bot/config.js
const path = require('path');

const CONFIG = {
  url: "https://sdu.redecororp.br/DiagnoseServiceProblem/home",
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  userDataDir: null,
  
  files: {
    inputCsv: path.join(process.cwd(), 'ids.csv'),
    outputCsv: path.join(process.cwd(), 'resultado_lote.csv'),
    outputFolder: path.join(process.cwd(), 'sdu_resultados'),
    errorScreenshot: "erro_geral.png"
  },
  
  network: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ignoreHTTPSErrors: true,
    extraHeaders: {
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"'
    }
  },
  
  timeouts: {
    navigation: 90000,
    element: 20000,
    search: 20000,
    loginValidation: 120000,
    entreIds: 2000
  },
  
  selectors: {
    login: {
      username: 'input[formcontrolname="username"]',
      password: 'input[formcontrolname="password"]',
      button: 'button.ui-button-login'
    },
    homeState: ".ui-home-state",
    searchInput: 'input.mat-input-element[formcontrolname="search"]',
    searchButton: '.ui-button-home',
    resultTable: '.mat-table',
    resultCard: '.ui-card',
    errorMessage: '.mat-error, .mat-snack-bar-container',
    
    // ✅ NOVOS SELETORES - ABAS E PAINÉIS
    tabs: {
      bandaLarga: '.mat-tab-label' // Seletor genérico; o texto "Banda Larga" é filtrado no código
    },
    panels: {
      informacoesBloqueios: 'mat-expansion-panel-header' // Seletor genérico; o texto é filtrado no código
    },
    bloqueios: {
      // Dentro do painel expandido, os dados estão em <p>
      linhas: '.mat-expansion-panel-body p'
    }
  }
};

module.exports = CONFIG;
