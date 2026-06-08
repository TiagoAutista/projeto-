// src/lib/bot/helpers.js
const readline = require('readline');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
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

function lerCsvEntrada() {
  const caminho = CONFIG.files.inputCsv;
  if (!fs.existsSync(caminho)) {
    throw new Error(`Arquivo CSV não encontrado: ${caminho}\n💡 Crie um arquivo "ids.csv" com a coluna "id_fibra"`);
  }
  const conteudo = fs.readFileSync(caminho, 'utf-8');
  const registros = parse(conteudo, { columns: true, skip_empty_lines: true, trim: true });
  const ids = registros.map(r => r.id_fibra || r.id || r.ID).filter(id => id && id.trim() !== '');
  if (ids.length === 0) throw new Error('Nenhum ID válido encontrado no CSV.');
  return ids;
}

// ============================================================================
// 🔐 NOVA FUNÇÃO: Login Automatizado com Pausa para Confirmação
// ============================================================================
async function fazerLoginAutomatico(page, rl) {
  console.log('\n' + '═'.repeat(70));
  console.log('🔐 LOGIN DETECTADO - PREENCHIMENTO AUTOMÁTICO');
  console.log('═'.repeat(70));

  // 1. Coletar dados do operador
  const matricula = await new Promise(res => rl.question('👤 Digite sua matrícula: ', res));
  const senha = await new Promise(res => rl.question('🔑 Digite sua senha: ', res));

  if (!matricula.trim() || !senha.trim()) {
    throw new Error('Matrícula e senha são obrigatórias.');
  }

  console.log('\n⚙️ Preenchendo campos e enviando...');

  // 2. Preencher Matrícula
  await page.waitForSelector(CONFIG.selectors.login.username, { visible: true, timeout: 15000 });
  await page.click(CONFIG.selectors.login.username);
  await page.type(CONFIG.selectors.login.username, matricula.trim(), { delay: 50 });

  // 3. Preencher Senha
  await page.waitForSelector(CONFIG.selectors.login.password, { visible: true, timeout: 15000 });
  await page.click(CONFIG.selectors.login.password);
  await page.type(CONFIG.selectors.login.password, senha.trim(), { delay: 50 });

  // 4. Clicar em Entrar
  await page.waitForSelector(CONFIG.selectors.login.button, { visible: true, timeout: 15000 });
  await page.click(CONFIG.selectors.login.button);
  
  console.log('✅ Credenciais enviadas! Aguardando o sistema processar...\n');

  // 5. Pausa para o sistema carregar a próxima tela
  await aguardar(3000);

  // 6. PAUSA CRÍTICA: Aguarda confirmação do operador
  await aguardarEnter(
    '👉 Olhe para o navegador. Se o login foi bem-sucedido e você está na HOME,\n' +
    '   pressione [ENTER] para o robô continuar.\n' +
    '   (Se deu erro de senha, pressione Ctrl+C para cancelar e tente de novo).'
  );

  // 7. Validação de segurança (o robô tenta confirmar se a home apareceu)
  try {
    await page.waitForSelector(CONFIG.selectors.homeState, { visible: true, timeout: 10000 });
    console.log('✅ Home do sistema confirmada pelo robô! Prosseguindo...\n');
  } catch (e) {
    console.log('⚠️ O robô não detectou a classe da home automaticamente, mas vai prosseguir conforme sua confirmação visual.\n');
  }
}

// ============================================================================
// 🎯 Processar UM ID
// ============================================================================
async function processarUmId(page, idFibra) {
  const resultado = { id_fibra: idFibra, status: 'falha', timestamp: new Date().toISOString(), mensagem: '', dados_extraidos: null };
  try {
    const estaNaHome = await page.$(CONFIG.selectors.homeState);
    if (!estaNaHome) {
      console.log(`   🔄 Recarregando página para garantir que está na home...`);
      await page.goto(CONFIG.url, { waitUntil: 'networkidle2', timeout: CONFIG.timeouts.navigation });
      await page.waitForSelector(CONFIG.selectors.homeState, { visible: true, timeout: 15000 });
    }
    
    const searchSelector = CONFIG.selectors.searchInput;
    await page.waitForSelector(searchSelector, { visible: true, timeout: 10000 });
    await page.click(searchSelector);
    
    // Limpar campo de forma robusta
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await aguardar(300);
    
    await page.type(searchSelector, idFibra, { delay: 60 });
    
    await page.waitForSelector(CONFIG.selectors.searchButton, { visible: true, timeout: 5000 });
    await page.click(CONFIG.selectors.searchButton);
    
    await page.waitForFunction(
      (sel) => document.querySelector(sel.resultTable) || document.querySelector(sel.resultCard) || document.querySelector(sel.errorMessage),
      { timeout: CONFIG.timeouts.search },
      CONFIG.selectors
    );
    
    const temErro = await page.$(CONFIG.selectors.errorMessage);
    if (temErro) {
      const erroTexto = await page.evaluate((sel) => document.querySelector(sel)?.innerText || 'Erro desconhecido', CONFIG.selectors.errorMessage);
      resultado.mensagem = `Erro na busca: ${erroTexto}`;
      return resultado;
    }
    
    const dados = await extrairDados(page);
    if (dados.length === 0) {
      resultado.mensagem = 'Nenhum dado retornado';
      return resultado;
    }
    
    const screenshotPath = `${CONFIG.files.outputFolder}/${idFibra.replace(/[^a-z0-9]/gi, '_')}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    
    resultado.status = 'sucesso';
    resultado.mensagem = `${dados.length} registro(s) extraído(s)`;
    resultado.dados_extraidos = dados;
    return resultado;
  } catch (error) {
    resultado.mensagem = `Erro: ${error.message}`;
    return resultado;
  }
}

async function extrairDados(page) {
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
        const texto = card.innerText.trim();
        if (texto) dados.push({ card_indice: idx + 1, conteudo: texto });
      });
    }
    return dados;
  });
}

async function configurarAntiDetecao(page) {
  await page.setUserAgent(CONFIG.network.userAgent);
  await page.setExtraHTTPHeaders(CONFIG.network.extraHeaders);
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    window.chrome = { runtime: {} };
  });
}

module.exports = {
  aguardar,
  aguardarEnter,
  lerCsvEntrada,
  fazerLoginAutomatico, // Exportando a nova função
  processarUmId,
  configurarAntiDetecao
};
