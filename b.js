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
// 🔐 Login automático
// ============================================================================
async function fazerLoginAutomatico(page, rl) {
  console.log('\n' + '═'.repeat(70));
  console.log('🔐 LOGIN DETECTADO - PREENCHIMENTO AUTOMÁTICO');
  console.log('═'.repeat(70));

  const matricula = await new Promise(res => rl.question('👤 Digite sua matrícula: ', res));
  const senha = await new Promise(res => rl.question('🔑 Digite sua senha: ', res));

  if (!matricula.trim() || !senha.trim()) {
    throw new Error('Matrícula e senha são obrigatórias.');
  }

  console.log('\n⚙️ Preenchendo campos e enviando...');

  await page.waitForSelector(CONFIG.selectors.login.username, { visible: true, timeout: 15000 });
  await page.click(CONFIG.selectors.login.username);
  await page.type(CONFIG.selectors.login.username, matricula.trim(), { delay: 50 });

  await page.waitForSelector(CONFIG.selectors.login.password, { visible: true, timeout: 15000 });
  await page.click(CONFIG.selectors.login.password);
  await page.type(CONFIG.selectors.login.password, senha.trim(), { delay: 50 });

  await page.waitForSelector(CONFIG.selectors.login.button, { visible: true, timeout: 15000 });
  await page.click(CONFIG.selectors.login.button);
  
  console.log('✅ Credenciais enviadas! Aguardando o sistema processar...\n');
  await aguardar(3000);

  await aguardarEnter(
    '👉 Olhe para o navegador. Se o login foi bem-sucedido e você está na HOME,\n' +
    '   pressione [ENTER] para o robô continuar.'
  );

  try {
    await page.waitForSelector(CONFIG.selectors.homeState, { visible: true, timeout: 10000 });
    console.log('✅ Home do sistema confirmada!\n');
  } catch (e) {
    console.log('⚠️ Robô não detectou a home automaticamente, mas prosseguindo conforme sua confirmação.\n');
  }
}

// ============================================================================
// 📑 NOVO: Clicar na aba "Banda Larga"
// ============================================================================
async function clicarAbaBandaLarga(page) {
  console.log('   📑 Clicando na aba "Banda Larga"...');
  
  // Procura a aba pelo texto exato
  const abas = await page.$$('.mat-tab-label');
  let abaEncontrada = null;
  
  for (const aba of abas) {
    const texto = await page.evaluate(el => el.innerText.trim(), aba);
    if (texto.toLowerCase().includes('banda larga')) {
      abaEncontrada = aba;
      break;
    }
  }
  
  if (!abaEncontrada) {
    throw new Error('Aba "Banda Larga" não encontrada na página');
  }
  
  await abaEncontrada.click();
  await aguardar(1500); // Aguarda conteúdo da aba carregar
  console.log('   ✅ Aba "Banda Larga" ativada!');
}

// ============================================================================
// 📂 NOVO: Expandir painel "Informações de Bloqueios"
// ============================================================================
async function expandirPainelBloqueios(page) {
  console.log('   📂 Expandindo painel "Informações de Bloqueios"...');
  
  const headers = await page.$$('mat-expansion-panel-header');
  let headerEncontrado = null;
  
  for (const header of headers) {
    const texto = await page.evaluate(el => el.innerText.trim(), header);
    if (texto.toLowerCase().includes('informações de bloqueios') || 
        texto.toLowerCase().includes('informacoes de bloqueios')) {
      headerEncontrado = header;
      break;
    }
  }
  
  if (!headerEncontrado) {
    throw new Error('Painel "Informações de Bloqueios" não encontrado');
  }
  
  // Verifica se já está expandido
  const estaExpandido = await page.evaluate(
    el => el.closest('mat-expansion-panel')?.classList.contains('mat-expanded'),
    headerEncontrado
  );
  
  if (!estaExpandido) {
    await headerEncontrado.click();
    await aguardar(1000);
    console.log('   ✅ Painel expandido!');
  } else {
    console.log('   ✅ Painel já estava expandido!');
  }
}

// ============================================================================
// 📊 NOVO: Extrair informações do painel de bloqueios
// ============================================================================
async function extrairInformacoesBloqueio(page) {
  console.log('   📊 Extraindo informações de bloqueio...');
  
  // Pega todos os <p> dentro do painel expandido
  const linhas = await page.evaluate(() => {
    // Busca o painel que contém "Informações de Bloqueios"
    const headers = Array.from(document.querySelectorAll('mat-expansion-panel-header'));
    const headerAlvo = headers.find(h => {
      const t = h.innerText.toLowerCase();
      return t.includes('informações de bloqueios') || t.includes('informacoes de bloqueios');
    });
    
    if (!headerAlvo) return [];
    
    const painel = headerAlvo.closest('mat-expansion-panel');
    if (!painel) return [];
    
    const ps = painel.querySelectorAll('.mat-expansion-panel-body p');
    return Array.from(ps).map(p => p.innerText.trim()).filter(t => t.length > 0);
  });
  
  if (linhas.length === 0) {
    console.log('   ⚠️ Nenhuma informação de bloqueio encontrada');
    return {};
  }
  
  // Parseia cada linha no formato "Label: Valor"
  const dados = {};
  for (const linha of linhas) {
    // Divide no primeiro ":" encontrado
    const indiceDoisPontos = linha.indexOf(':');
    if (indiceDoisPontos === -1) continue;
    
    const label = linha.substring(0, indiceDoisPontos).trim();
    const valor = linha.substring(indiceDoisPontos + 1).trim();
    
    if (!label || !valor) continue;
    
    // Sanitiza o label para virar nome de coluna CSV
    const chave = sanitizarChave(label);
    dados[chave] = valor;
  }
  
  console.log(`   ✅ ${Object.keys(dados).length} informação(ões) extraída(s)`);
  return dados;
}

// ============================================================================
// 🔧 Helper: Sanitizar label para nome de coluna CSV
// ============================================================================
function sanitizarChave(label) {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/\([^)]*\)/g, '')       // Remove parênteses e conteúdo
    .replace(/[^a-z0-9\s]/g, '')     // Remove caracteres especiais
    .trim()
    .replace(/\s+/g, '_');           // Espaços viram underscore
}

// ============================================================================
// 🎯 Processar UM ID (ATUALIZADO)
// ============================================================================
async function processarUmId(page, idFibra) {
  const resultado = {
    id_fibra: idFibra,
    status: 'falha',
    timestamp: new Date().toISOString(),
    mensagem: '',
    dados_extraidos: null,
    bloqueios: {} // ✅ NOVO: armazenar dados de bloqueio
  };
  
  try {
    // 1. Garantir que está na home
    const estaNaHome = await page.$(CONFIG.selectors.homeState);
    if (!estaNaHome) {
      console.log(`   🔄 Recarregando página...`);
      await page.goto(CONFIG.url, { waitUntil: 'networkidle2', timeout: CONFIG.timeouts.navigation });
      await page.waitForSelector(CONFIG.selectors.homeState, { visible: true, timeout: 15000 });
    }
    
    // 2. Limpar e digitar ID
    const searchSelector = CONFIG.selectors.searchInput;
    await page.waitForSelector(searchSelector, { visible: true, timeout: 10000 });
    await page.click(searchSelector);
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await aguardar(300);
    
    await page.type(searchSelector, idFibra, { delay: 60 });
    
    // 3. Clicar em Buscar
    await page.waitForSelector(CONFIG.selectors.searchButton, { visible: true, timeout: 5000 });
    await page.click(CONFIG.selectors.searchButton);
    
    // 4. Aguardar resultado
    await page.waitForFunction(
      (sel) => document.querySelector(sel.resultTable) || 
               document.querySelector(sel.resultCard) || 
               document.querySelector(sel.errorMessage) ||
               document.querySelector('.mat-tab-label'),
      { timeout: CONFIG.timeouts.search },
      CONFIG.selectors
    );
    
    const temErro = await page.$(CONFIG.selectors.errorMessage);
    if (temErro) {
      const erroTexto = await page.evaluate(
        (sel) => document.querySelector(sel)?.innerText || 'Erro desconhecido',
        CONFIG.selectors.errorMessage
      );
      resultado.mensagem = `Erro na busca: ${erroTexto}`;
      return resultado;
    }
    
    // 5. ✅ NOVO FLUXO: Clicar em "Banda Larga" → Expandir "Informações de Bloqueios" → Extrair
    await clicarAbaBandaLarga(page);
    await expandirPainelBloqueios(page);
    resultado.bloqueios = await extrairInformacoesBloqueio(page);
    
    // 6. Screenshot individual
    const screenshotPath = `${CONFIG.files.outputFolder}/${idFibra.replace(/[^a-z0-9]/gi, '_')}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    
    resultado.status = 'sucesso';
    const qtdBloqueios = Object.keys(resultado.bloqueios).length;
    resultado.mensagem = `${qtdBloqueios} informação(ões) de bloqueio extraída(s)`;
    
    return resultado;
    
  } catch (error) {
    resultado.mensagem = `Erro: ${error.message}`;
    return resultado;
  }
}

// ============================================================================
// 🛡️ Anti-detecção
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
  fazerLoginAutomatico,
  processarUmId,
  configurarAntiDetecao,
  sanitizarChave // ✅ Exportado para uso no bot.js
};
