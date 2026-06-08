// src/lib/browser.js
// Dentro da função obterPagina(), adicione o case "sdu":

async function obterPagina(browser, target) {
  // ... código existente
  
  const targets = {
    'wfm': 'appwfm.gvt.net.br',
    'gps': 'gps', // ou a URL real
    'siebel': 'siebel', // ou a URL real
    'sdu': 'sdu.redecorp.br' // ✅ NOVO
  };
  
  // ... resto do código
}
