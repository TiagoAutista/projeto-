// src/lib/bot/config.js

const CONFIG = {
  url: "https://sdu.redecorp.br/DiagnoseServiceProblem/home",
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  idFibra: "SPO-76438046-069", 
  
  // 📂 Perfil do Chrome (Descomente para manter sessão logada)
  // userDataDir: 'C:\\Users\\A0161921\\AppData\\Local\\Google\\Chrome\\User Data',
  userDataDir: null,
  
  network: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ignoreHTTPSErrors: true,
    extraHeaders: {
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-User': '?1',
      'Sec-Fetch-Dest': 'document'
    }
  },
  
  timeouts: {
    navigation: 90000,
    element: 20000,
    dropdown: 15000,
    search: 20000,
    loginValidation: 120000
  },
  
  retry: {
    maxAttempts: 3,
    delayBetweenAttempts: 5000
  },
  
  selectors: {
    loginIndicators: [
      'input[type="password"]', 
      'input[name="password"]',
      'input[id*="password" i]', 
      'input[id*="senha" i]',
      'form.login', 
      '#login-form'
    ],
    homeState: ".ui-home-state",
    
    // ✅ ATUALIZADO: Mira diretamente no componente Angular Material, ignorando wrappers instáveis
    dropdownTrigger: 'mat-select',
    
    // ✅ Seletor do input de busca já validado anteriormente
    searchInput: 'input.mat-input-element[formcontrolname="search"]',
    
    searchButton: '.ui-button-home',
    resultTable: '.mat-table',
    resultCard: '.ui-card',
    errorMessage: '.mat-error, .mat-snack-bar-container'
  },
  
  files: {
    successScreenshot: "sucesso_busca.png",
    errorScreenshot: "erro_tela.png",
    csvOutput: "resultado_busca.csv"
  }
};

module.exports = CONFIG;
