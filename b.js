// src/lib/bot/helpers.js
const readline = require('readline');
const CONFIG = require('./config');

function aguardar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function aguardarEnter(mensagem) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(mensagem, () => { rl.close(); resolve(); });
  });
}

async function estaNaTelaDeLogin(page) {
  for (const seletor of CONFIG.selectors.loginIndicators) {
    try {
      const elemento = await page.$(seletor);
      if (elemento && await elemento.isIntersectingViewport()) return true;
    } catch (e) { /* ignora */ }
  }
  return false;
}

async function fazerLoginManual(page) {
  console.log('\n' + '═'.repeat(70));
  console.log('🔐 LOGIN MANUAL NECESSÁRIO');
  console.log('═'.repeat(70));
  console.log('👉 Faça o login manualmente no navegador que abriu.');
  console.log('👉 Aguarde até aparecer a HOME do sistema.');
  console.log('💡 DICA: Configure "userDataDir" no config.js para não precisar fazer isso sempre.');
  console.log('═'.repeat(70) + '\n');
  
  await aguardarEnter('✅ Pressione ENTER quando estiver logado e na HOME...');
  
  try {
    await page.waitForSelector(CONFIG.selectors.homeState, { visible: true, timeout: CONFIG.timeouts.loginValidation });
    console.log('✅ Login validado! Home detectada.\n');
    return true;
  } catch (error) {
    console.log('❌ Home não detectada. Verifique se está logado.');
    await aguardarEnter('🔄 Pressione ENTER para tentar validar novamente...');
    await page.waitForSelector(CONFIG.selectors.homeState, { visible: true, timeout: 30000 });
    console.log('✅ Login validado na segunda tentativa!\n');
    return true;
  }
}

async function navegarComRetry(page, url, maxTentativas = CONFIG.retry.maxAttempts) {
  let ultimoErro = null;
  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    console.log(`\n🔄 Tentativa ${tentativa}/${maxTentativas} de acessar o site...`);
    try {
      const response = await page.goto(url, { waitUntil: "networkidle2", timeout: CONFIG.timeouts.navigation });
      if (!response || !response.ok()) throw new Error(`HTTP ${response ? response.status() : 'Sem resposta'}`);
      console.log(`✅ Página carregada (HTTP ${response.status()})`);
      return response;
    } catch (error) {
      ultimoErro = error;
      console.log(`⚠️ Falha: ${error.message}`);
      if (tentativa < maxTentativas) await aguardar(CONFIG.retry.delayBetweenAttempts);
    }
  }
  throw new Error(`Falha após ${maxTentativas} tentativas. Último erro: ${ultimoErro.message}`);
}

async function selecionarOpcaoDropdown(page, textoAlvo, seletorTrigger) {
  console.log(`🖱️ Abrindo menu de seleção...`);
  await page.waitForSelector(seletorTrigger, { visible: true, timeout: CONFIG.timeouts.dropdown });
  await page.click(seletorTrigger);
  await aguardar(800);

  try {
    const temBusca = await page.$('.mat-select-search-inside-mat-form-field input, .mat-select-search-input');
    if (temBusca) {
      await temBusca.click({ clickCount: 3 });
      await temBusca.type(textoAlvo, { delay: 100 });
      await aguardar(500);
      await page.waitForSelector('.cdk-overlay-pane .mat-option:not(.mat-option-disabled)', { visible: true, timeout: 5000 });
      await page.click('.cdk-overlay-pane .mat-option:not(.mat-option-disabled)');
      console.log(`✅ "${textoAlvo}" selecionado via busca!`);
      return true;
    }
    throw new Error('Sem campo de busca');
  } catch (e) {
    const resultado = await page.evaluate((texto) => {
      const opcoes = Array.from(document.querySelectorAll('.cdk-overlay-pane .mat-option'));
      const opcaoAlvo = opcoes.find(opt => opt.innerText.trim().toLowerCase().includes(texto.toLowerCase()));
      if (opcaoAlvo) {
        opcaoAlvo.scrollIntoView({ block: 'center' });
        opcaoAlvo.click();
        return { sucesso: true, texto: opcaoAlvo.innerText.trim() };
      }
      return { sucesso: false, total: opcoes.length };
    }, textoAlvo);

    if (!resultado.sucesso) throw new Error(`Opção "${textoAlvo}" não encontrada. Total de opções: ${resultado.total}`);
    console.log(`✅ Selecionado: "${resultado.texto}"`);
    return true;
  }
}

async function extrairDadosTabela(page) {
  return await page.evaluate(() => {
    const dados = [];
    const headers = Array.from(document.querySelectorAll('.mat-header-cell')).map(h => h.innerText.trim().replace(/\s+/g, '_').toLowerCase());
    const linhas = document.querySelectorAll('.mat-table tbody tr, .mat-row');
    
    linhas.forEach(linha => {
      const colunas = linha.querySelectorAll('.mat-cell, td');
      const linhaDados = {};
      colunas.forEach((col, idx) => { linhaDados[headers[idx] || `coluna_${idx}`] = col.innerText.trim(); });
      if (Object.keys(linhaDados).length > 0) dados.push(linhaDados);
    });

    if (dados.length === 0) {
      document.querySelectorAll('.ui-card, .mat-card').forEach((card, idx) => {
        if (card.innerText.trim()) dados.push({ card_indice: idx + 1, conteudo: card.innerText.trim() });
      });
    }
    return dados;
  });
}

async function configurarAntiDetecao(page, networkConfig) {
  await page.setUserAgent(networkConfig.userAgent);
  await page.setExtraHTTPHeaders(networkConfig.extraHeaders);
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en-US', 'en'] });
    window.chrome = { runtime: {} };
  });
}

module.exports = {
  aguardar, aguardarEnter, estaNaTelaDeLogin, fazerLoginManual,
  navegarComRetry, selecionarOpcaoDropdown, extrairDadosTabela, configurarAntiDetecao
};
