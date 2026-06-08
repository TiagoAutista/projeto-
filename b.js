// src/lib/bot/config.js

const path = require('path');

const CONFIG = {
  url: "https://sdu.redecororp.br/DiagnoseServiceProblem/home",
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  
  // 📂 Perfil do Chrome (descomente para manter sessão)
  // userDataDir: 'C:\\Users\\A0161921\\AppData\\Local\\Google\\Chrome\\User Data',
  userDataDir: null,
  
  // 📁 ARQUIVOS DE ENTRADA E SAÍDA
  files: {
    inputCsv: path.join(process.cwd(), 'ids.csv'),           // CSV com IDs para processar
    outputCsv: path.join(process.cwd(), 'resultado_lote.csv'), // Relatório consolidado
    outputFolder: path.join(process.cwd(), 'sdu_resultados'),  // Pasta para screenshots/CSVs individuais
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
    entreIds: 2000 // Pausa entre processamento de cada ID
  },
  
  selectors: {
    loginIndicators: [
      'input[type="password"]', 'input[name="password"]',
      'input[id*="password" i]', 'input[id*="senha" i]'
    ],
    homeState: ".ui-home-state",
    searchInput: 'input.mat-input-element[formcontrolname="search"]',
    searchButton: '.ui-button-home',
    resultTable: '.mat-table',
    resultCard: '.ui-card',
    errorMessage: '.mat-error, .mat-snack-bar-container'
  }
};

module.exports = CONFIG;
