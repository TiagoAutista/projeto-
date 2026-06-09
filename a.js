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
// 📂 EXPANDIR PAINEL (Versão Cirúrgica baseada no HTML fornecido)
// ============================================================================
async function expandirPainelBloqueios(page) {
  console.log('   📂 Localizando painel "Informações de Bloqueios"...');
  
  // 1. Encontrar o header pelo título exato
  const headerHandle = await page.evaluateHandle(() => {
    const headers = Array.from(document.querySelectorAll('mat-expansion-panel-header'));
    return headers.find(h => {
      const titulo = h.querySelector('mat-panel-title');
      return titulo && titulo.innerText.trim().toLowerCase().includes('informações de bloqueios');
    }) || null;
  });

  const existe = await headerHandle.evaluate(h => h !== null);
  if (!existe) {
    throw new Error('Painel "Informações de Bloqueios" não encontrado');
  }
  console.log('   🎯 Painel alvo localizado!');

  // 2. Verificar se já está expandido (aria-expanded="true" e classe mat-expanded)
  const jaExpandido = await page.evaluate((header) => {
    const painel = header.closest('mat-expansion-panel');
    return painel?.classList.contains('mat-expanded') || header.getAttribute('aria-expanded') === 'true';
  }, headerHandle);

  if (!jaExpandido) {
    console.log('   ⏳ Painel fechado. Clicando para expandir...');
    
    // Clicar no mat-panel-title é mais seguro no Angular Material
    const tituloHandle = await headerHandle.evaluateHandle(h => h.querySelector('mat-panel-title'));
    await tituloHandle.click({ delay: 100 });
    await aguardar(500);
    
    // Aguardar o Angular aplicar as classes e atributos de expansão
    await page.waitForFunction((header) => {
      const painel = header.closest('mat-expansion-panel');
      return painel?.classList.contains('mat-expanded') || header.getAttribute('aria-expanded') === 'true';
    }, { timeout: 5000 }, headerHandle);
    
    console.log('   ✅ Painel expandido com sucesso!');
    await tituloHandle.dispose();
  } else {
    console.log('   ✅ Painel já estava expandido!');
  }

  // 3. ESPERA INTELIGENTE: Aguardar o texto REAL aparecer dentro dos <p>
  console.log('   ⏳ Aguardando o sistema lento carregar os dados (CRM/Radius/ACS)...');
  
  try {
    await page.waitForFunction(() => {
      // Pega todos os <p> dentro do body do painel expandido
      const paineis = Array.from(document.querySelectorAll('mat-expansion-panel.mat-expanded'));
      const painelAlvo = paineis.find(p => {
        const titulo = p.querySelector('mat-panel-title');
        return titulo && titulo.innerText.toLowerCase().includes('informações de bloqueios');
      });
      
      if (!painelAlvo) return false;
      
      const body = painelAlvo.querySelector('.mat-expansion-panel-body');
      if (!body) return false;
      
      const textos = Array.from(body.querySelectorAll('p')).map(p => p.innerText.toUpperCase());
      
      // Só retorna true se encontrar uma das palavras-chave reais
      return textos.some(t => t.includes('CRM') || t.includes('RADIUS') || t.includes('ACS') || t.includes('BLOQUEADO'));
    }, { timeout: 15000 }); // Aguarda até 15 segundos pelos dados
    
    console.log('   ✅ Dados carregados e visíveis na tela!');
  } catch (e) {
    console.log('   ⚠️ Timeout ao aguardar dados. Tentando extrair mesmo assim...');
  }

  await headerHandle.dispose();
}

// ============================================================================
// 📊 EXTRAIR INFORMAÇÕES (Versão Cirúrgica)
// ============================================================================
async function extrairInformacoesBloqueio(page) {
  console.log('   📊 Extraindo informações de bloqueio...');
  
  const resultado = await page.evaluate(() => {
    // 1. Achar o painel expandido correto
    const paineis = Array.from(document.querySelectorAll('mat-expansion-panel.mat-expanded'));
    const painelAlvo = paineis.find(p => {
      const titulo = p.querySelector('mat-panel-title');
      return titulo && titulo.innerText.toLowerCase().includes('informações de bloqueios');
    });
    
    if (!painelAlvo) {
      return { debug: 'Painel expandido não encontrado.' };
    }
    
    // 2. Achar o body e os <p>
    const body = painelAlvo.querySelector('.mat-expansion-panel-body');
    if (!body) {
      return { debug: '.mat-expansion-panel-body não encontrado.' };
    }
    
    // Pega APENAS os <p> que estão dentro da div de conteúdo (ignora o <p> vazio de alinhamento)
    const ps = Array.from(body.querySelectorAll('.ui-flex-inner-container > div > p, .mat-expansion-panel-body > div > div > p, p'));
    
    const linhasBrutas = ps.map(p => p.innerText.trim()).filter(t => t.length > 0);
    const linhasValidas = linhasBrutas.filter(t => t.includes(':'));
    
    return { 
      linhasBrutas, 
      linhasValidas, 
      debug: `Encontrados ${ps.length} <p>, ${linhasValidas.length} válidos com ":".` 
    };
  });
  
  console.log(`   🔍 Debug: ${resultado.debug}`);
  
  if (resultado.linhasBrutas.length > 0) {
    console.log('   📝 Textos encontrados:');
    resultado.linhasBrutas.forEach((t, i) => console.log(`      [${i}] "${t}"`));
  }
  
  if (!resultado.linhasValidas || resultado.linhasValidas.length === 0) {
    console.log('   ⚠️ Nenhuma linha válida encontrada.');
    return {};
  }
  
  const dados = {};
  for (const linha of resultado.linhasValidas) {
    const idx = linha.indexOf(':');
    if (idx === -1) continue;
    
    const label = linha.substring(0, idx).trim();
    const valor = linha.substring(idx + 1).trim();
    
    if (!label || !valor) continue;
    
    // Sanitiza para virar coluna de CSV (ex: "Status Bloqueio Banda Larga (Inventário CRM)" -> "status_bloqueio_banda_larga_inventario_crm")
    const chave = label
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/\([^)]*\)/g, '') // remove parênteses
      .replace(/[^a-z0-9\s]/g, '') // remove caracteres especiais
      .trim()
      .replace(/\s+/g, '_'); // espaços viram _
      
    if (chave) {
      dados[chave] = valor;
    }
  }
  
  console.log(`   ✅ ${Object.keys(dados).length} informação(ões) extraída(s) com sucesso!`);
  return dados;
}

// ============================================================================
// 🎯 PROCESSAR UM ID
// ============================================================================
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
      const erroTexto = await page.evaluate((sel) => document.querySelector(sel)?.innerText || 'Erro desconhecido', CONFIG.selectors.errorMessage);
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
    resultado.mensagem = qtdBloqueios > 0 ? `${qtdBloqueios} informação(ões) de bloqueio extraída(s)` : 'Painel aberto, mas sem dados de bloqueio';
    
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
  extrairInformacoesBloqueio
};
