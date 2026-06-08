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

// ============================================================================
// 📥 LER CSV DE ENTRADA
// ============================================================================
function lerCsvEntrada() {
  const caminho = CONFIG.files.inputCsv;
  
  if (!fs.existsSync(caminho)) {
    throw new Error(`Arquivo CSV não encontrado: ${caminho}\n💡 Crie um arquivo "ids.csv" com a coluna "id_fibra"`);
  }
  
  const conteudo = fs.readFileSync(caminho, 'utf-8');
  const registros = parse(conteudo, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
  
  // Extrai IDs (aceita coluna "id_fibra" ou "id")
  const ids = registros
    .map(r => r.id_fibra || r.id || r.ID)
    .filter(id => id && id.trim() !== '');
  
  if (ids.length === 0) {
    throw new Error('Nenhum ID válido encontrado no CSV. Verifique a coluna "id_fibra".');
  }
  
  return ids;
}

// ============================================================================
// 🔍 Detectar tela de login
// ============================================================================
async function estaNaTelaDeLogin(page) {
  for (const seletor of CONFIG.selectors.loginIndicators) {
    try {
      const elemento = await page.$(seletor);
      if (elemento && await elemento.isIntersectingViewport()) return true;
    } catch (e) { /* ignora */ }
  }
  return false;
}

// ============================================================================
// 🔐 Login manual
// ============================================================================
async function fazerLoginManual(page) {
  console.log('\n' + '═'.repeat(70));
  console.log('🔐 LOGIN MANUAL NECESSÁRIO');
  console.log('═'.repeat(70));
  console.log('👉 Faça o login manualmente no navegador.');
  console.log('👉 Aguarde até aparecer a HOME do sistema.');
  console.log('═'.repeat(70) + '\n');
  
  await aguardarEnter('✅ Pressione ENTER quando estiver logado e na HOME...');
  
  try {
    await page.waitForSelector(CONFIG.selectors.homeState, { 
      visible: true, 
      timeout: CONFIG.timeouts.loginValidation 
    });
    console.log('✅ Login validado!\n');
    return true;
  } catch (error) {
    throw new Error('Home do sistema não detectada. Verifique se está logado.');
  }
}

// ============================================================================
// 🎯 Processar UM ID (retorna objeto com resultado)
// ============================================================================
async function processarUmId(page, idFibra) {
  const resultado = {
    id_fibra: idFibra,
    status: 'falha',
    timestamp: new Date().toISOString(),
    mensagem: '',
    dados_extraidos: null
  };
  
  try {
    // 1. Garantir que está na home (recarrega se necessário)
    const estaNaHome = await page.$(CONFIG.selectors.homeState);
    if (!estaNaHome) {
      console.log(`   🔄 Recarregando página...`);
      await page.goto(CONFIG.url, { waitUntil: 'networkidle2', timeout: CONFIG.timeouts.navigation });
      await page.waitForSelector(CONFIG.selectors.homeState, { visible: true, timeout: 15000 });
    }
    
    // 2. Limpar campo de busca (caso tenha valor anterior)
    const searchSelector = CONFIG.selectors.searchInput;
    await page.waitForSelector(searchSelector, { visible: true, timeout: 10000 });
    await page.click(searchSelector);
    
    // Seleciona tudo e limpa
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await aguardar(300);
    
    // 3. Digitar novo ID
    await page.type(searchSelector, idFibra, { delay: 60 });
    
    // 4. Clicar em Buscar
    await page.waitForSelector(CONFIG.selectors.searchButton, { visible: true, timeout: 5000 });
    await page.click(CONFIG.selectors.searchButton);
    
    // 5. Aguardar resultado
    await page.waitForFunction(
      (sel) => {
        return document.querySelector(sel.resultTable) || 
               document.querySelector(sel.resultCard) || 
               document.querySelector(sel.errorMessage);
      },
      { timeout: CONFIG.timeouts.search },
      CONFIG.selectors
    );
    
    // 6. Verificar erro
    const temErro = await page.$(CONFIG.selectors.errorMessage);
    if (temErro) {
      const erroTexto = await page.evaluate(
        (sel) => document.querySelector(sel)?.innerText || 'Erro desconhecido',
        CONFIG.selectors.errorMessage
      );
      resultado.mensagem = `Erro na busca: ${erroTexto}`;
      return resultado;
    }
    
    // 7. Extrair dados
    const dados = await extrairDados(page);
    
    if (dados.length === 0) {
      resultado.mensagem = 'Nenhum dado retornado';
      return resultado;
    }
    
    // 8. Salvar screenshot individual
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

// ============================================================================
// 📊 Extrair dados da página
// ============================================================================
async function extrairDados(page) {
  return await page.evaluate(() => {
    const dados = [];
    
    const headers = Array.from(document.querySelectorAll('.mat-header-cell')).map(h => 
      h.innerText.trim().replace(/\s+/g, '_').toLowerCase()
    );
    
    const linhas = document.querySelectorAll('.mat-table tbody tr, .mat-row');
    linhas.forEach(linha => {
      const colunas = linha.querySelectorAll('.mat-cell, td');
      const linhaDados = {};
      colunas.forEach((col, idx) => {
        linhaDados[headers[idx] || `coluna_${idx}`] = col.innerText.trim();
      });
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

// ============================================================================
// 🛡️ Configurar anti-detecção
// ============================================================================
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
  estaNaTelaDeLogin,
  fazerLoginManual,
  processarUmId,
  configurarAntiDetecao
};
