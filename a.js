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

async function clicarAbaBandaLarga(page) {
  console.log('   📑 Clicando na aba "Banda Larga"...');
  
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
  await aguardar(2000);
  console.log('   ✅ Aba "Banda Larga" ativada!');
}

// ============================================================================
// 📂 EXPANDIR PAINEL (Lógica blindada baseada no HTML fornecido)
// ============================================================================
async function expandirPainelBloqueios(page) {
  console.log('   📂 Localizando e expandindo painel "Informações de Bloqueios"...');
  
  // 1. Encontrar todos os headers de painéis
  const headers = await page.$$('mat-expansion-panel-header');
  let headerAlvo = null;
  let painelAlvo = null;
  
  for (const header of headers) {
    const texto = await page.evaluate(el => el.innerText.trim(), header);
    if (texto.toLowerCase().includes('informações de bloqueios') || 
        texto.toLowerCase().includes('informacoes de bloqueios')) {
      headerAlvo = header;
      // O painel é o pai direto do header
      painelAlvo = await headerAlvo.evaluateHandle(el => el.closest('mat-expansion-panel'));
      break;
    }
  }
  
  if (!headerAlvo || !painelAlvo) {
    throw new Error('Painel "Informações de Bloqueios" não encontrado na página.');
  }
  
  // 2. Verificar se já está expandido (classe 'mat-expanded' no painel)
  const estaExpandido = await page.evaluate(el => el.classList.contains('mat-expanded'), painelAlvo);
  
  if (!estaExpandido) {
    console.log('   ⏳ Painel fechado. Clicando para expandir...');
    await headerAlvo.click();
    
    // 3. Aguardar a animação do Angular e a classe 'mat-expanded' ser aplicada
    await page.waitForFunction(
      (painel) => painel.classList.contains('mat-expanded'),
      { timeout: 5000 },
      painelAlvo
    );
    console.log('   ✅ Painel expandido com sucesso!');
  } else {
    console.log('   ✅ Painel já estava expandido!');
  }
  
  // 4. VALIDAÇÃO CRÍTICA: Aguardar os <p> serem renderizados dentro do body
  console.log('   ⏳ Aguardando conteúdo (tags <p>) ser renderizado pelo Angular...');
  try {
    await page.waitForFunction(() => {
      const bodies = document.querySelectorAll('.mat-expansion-panel-body');
      for (const body of bodies) {
        if (body.querySelectorAll('p').length > 0) return true;
      }
      return false;
    }, { timeout: 5000 });
    console.log('   ✅ Conteúdo renderizado e pronto para extração!');
  } catch (e) {
    console.log('   ⚠️ Timeout ao aguardar conteúdo, mas tentaremos extrair mesmo assim...');
  }
  
  // Limpeza de handles do Puppeteer
  await headerAlvo.dispose();
  await painelAlvo.dispose();
}

// ============================================================================
// 📊 EXTRAIR INFORMAÇÕES (Lógica blindada baseada no HTML fornecido)
// ============================================================================
async function extrairInformacoesBloqueio(page) {
  console.log('   📊 Extraindo informações de bloqueio...');
  
  const resultado = await page.evaluate(() => {
    // 1. Encontrar o painel expandido correto
    const paineis = Array.from(document.querySelectorAll('mat-expansion-panel.mat-expanded'));
    const painelAlvo = paineis.find(p => {
      const titulo = p.querySelector('mat-panel-title');
      return titulo && titulo.innerText.toLowerCase().includes('informações de bloqueios');
    });
    
    if (!painelAlvo) {
      return { linhas: [], debug: 'Painel expandido com o título correto não encontrado.' };
    }
    
    // 2. Buscar o body e todos os <p> dentro dele
    const body = painelAlvo.querySelector('.mat-expansion-panel-body');
    if (!body) {
      return { linhas: [], debug: '.mat-expansion-panel-body não encontrado.' };
    }
    
    const ps = Array.from(body.querySelectorAll('p'));
    const linhas = ps.map(p => p.innerText.trim()).filter(texto => texto.length > 0 && texto.includes(':'));
    
    return { 
      linhas, 
      debug: `Encontrados ${ps.length} <p> no total, ${linhas.length} válidos (contêm ':').` 
    };
  });
  
  console.log(`   🔍 Debug extração: ${resultado.debug}`);
  
  if (resultado.linhas.length === 0) {
    console.log('   ⚠️ Nenhuma informação de bloqueio válida encontrada.');
    return {};
  }
  
  // 3. Parsear "Chave: Valor"
  const dados = {};
  for (const linha of resultado.linhas) {
    const indiceDoisPontos = linha.indexOf(':');
    if (indiceDoisPontos === -1) continue;
    
    const label = linha.substring(0, indiceDoisPontos).trim();
    const valor = linha.substring(indiceDoisPontos + 1).trim();
    
    if (!label || !valor) continue;
    
    const chave = sanitizarChave(label);
    dados[chave] = valor;
  }
  
  console.log(`   ✅ ${Object.keys(dados).length} informação(ões) extraída(s) com sucesso!`);
  return dados;
}

function sanitizarChave(label) {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

async function processarUmId(page, idFibra) {
  const resultado = {
    id_fibra: idFibra,
    status: 'falha',
    timestamp: new Date().toISOString(),
    mensagem: '',
    dados_extraidos: null,
    bloqueios: {}
  };
  
  try {
    const estaNaHome = await page.$(CONFIG.selectors.homeState);
    if (!estaNaHome) {
      console.log(`   🔄 Recarregando página...`);
      await page.goto(CONFIG.url, { waitUntil: 'networkidle2', timeout: CONFIG.timeouts.navigation });
      await page.waitForSelector(CONFIG.selectors.homeState, { visible: true, timeout: 15000 });
    }
    
    const searchSelector = CONFIG.selectors.searchInput;
    await page.waitForSelector(searchSelector, { visible: true, timeout: 10000 });
    await page.click(searchSelector);
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await aguardar(300);
    
    await page.type(searchSelector, idFibra, { delay: 60 });
    
    await page.waitForSelector(CONFIG.selectors.searchButton, { visible: true, timeout: 5000 });
    await page.click(CONFIG.selectors.searchButton);
    
    console.log('   ⏳ Aguardando resultado da busca...');
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
    
    await clicarAbaBandaLarga(page);
    await expandirPainelBloqueios(page);
    resultado.bloqueios = await extrairInformacoesBloqueio(page);
    
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
  sanitizarChave
};
