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
  await aguardar(2000); // ✅ AUMENTADO: 2 segundos para a aba carregar completamente
  console.log('   ✅ Aba "Banda Larga" ativada!');
}

// ============================================================================
// 📂 EXPANDIR PAINEL (COM VALIDAÇÃO DE CONTEÚDO)
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
  
  const estaExpandido = await page.evaluate(
    el => el.closest('mat-expansion-panel')?.classList.contains('mat-expanded'),
    headerEncontrado
  );
  
  if (!estaExpandido) {
    await headerEncontrado.click();
    console.log('   ⏳ Aguardando painel expandir e carregar conteúdo...');
    await aguardar(2500); // ✅ AUMENTADO: 2.5 segundos para o Angular renderizar
  } else {
    console.log('   ✅ Painel já estava expandido!');
    await aguardar(500); // Mesmo assim aguarda um pouco
  }
  
  // ✅ VALIDAÇÃO: Verifica se os <p> existem antes de prosseguir
  let tentativas = 0;
  const maxTentativas = 5;
  
  while (tentativas < maxTentativas) {
    const temConteudo = await page.evaluate(() => {
      const headers = Array.from(document.querySelectorAll('mat-expansion-panel-header'));
      const headerAlvo = headers.find(h => {
        const t = h.innerText.toLowerCase();
        return t.includes('informações de bloqueios') || t.includes('informacoes de bloqueios');
      });
      
      if (!headerAlvo) return false;
      
      const painel = headerAlvo.closest('mat-expansion-panel');
      if (!painel) return false;
      
      const ps = painel.querySelectorAll('.mat-expansion-panel-body p');
      return ps.length > 0;
    });
    
    if (temConteudo) {
      console.log('   ✅ Painel expandido e conteúdo carregado!');
      return;
    }
    
    tentativas++;
    console.log(`   ⏳ Conteúdo ainda não renderizado (tentativa ${tentativas}/${maxTentativas})...`);
    await aguardar(1000);
  }
  
  console.log('   ⚠️ Conteúdo pode não ter carregado completamente, tentando extrair mesmo assim...');
}

// ============================================================================
// 📊 EXTRAIR INFORMAÇÕES (COM DEBUG)
// ============================================================================
async function extrairInformacoesBloqueio(page) {
  console.log('   📊 Extraindo informações de bloqueio...');
  
  const resultado = await page.evaluate(() => {
    const headers = Array.from(document.querySelectorAll('mat-expansion-panel-header'));
    const headerAlvo = headers.find(h => {
      const t = h.innerText.toLowerCase();
      return t.includes('informações de bloqueios') || t.includes('informacoes de bloqueios');
    });
    
    if (!headerAlvo) {
      return { linhas: [], debug: 'Header não encontrado' };
    }
    
    const painel = headerAlvo.closest('mat-expansion-panel');
    if (!painel) {
      return { linhas: [], debug: 'Painel não encontrado' };
    }
    
    const body = painel.querySelector('.mat-expansion-panel-body');
    if (!body) {
      return { linhas: [], debug: 'Body do painel não encontrado' };
    }
    
    const ps = body.querySelectorAll('p');
    const linhas = Array.from(ps).map(p => p.innerText.trim()).filter(t => t.length > 0);
    
    return { 
      linhas, 
      debug: `Encontrados ${ps.length} <p> no body, ${linhas.length} com texto` 
    };
  });
  
  console.log(`   🔍 Debug: ${resultado.debug}`);
  
  if (resultado.linhas.length === 0) {
    console.log('   ⚠️ Nenhuma informação de bloqueio encontrada');
    return {};
  }
  
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
  
  console.log(`   ✅ ${Object.keys(dados).length} informação(ões) extraída(s)`);
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
