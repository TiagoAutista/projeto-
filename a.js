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
// 📂 EXPANDIR PAINEL (Com espera inteligente para sistemas lentos)
// ============================================================================
async function expandirPainelBloqueios(page) {
  console.log('   📂 Localizando painel "Informações de Bloqueios"...');
  
  const headerSelector = await page.evaluateHandle(() => {
    const headers = Array.from(document.querySelectorAll('mat-expansion-panel-header'));
    for (const header of headers) {
      const titulo = header.querySelector('mat-panel-title');
      if (titulo) {
        const texto = titulo.innerText.toLowerCase();
        if (texto.includes('informações de bloqueios') || texto.includes('informacoes de bloqueios')) {
          return header;
        }
      }
    }
    return null;
  });
  
  const headerExiste = await headerSelector.evaluate(h => h !== null);
  if (!headerExiste) {
    throw new Error('Painel "Informações de Bloqueios" não encontrado');
  }
  
  console.log('   🎯 Painel alvo localizado!');
  
  const jaExpandido = await page.evaluate((header) => {
    const painel = header.closest('mat-expansion-panel');
    const ariaExpanded = header.getAttribute('aria-expanded');
    return painel?.classList.contains('mat-expanded') || ariaExpanded === 'true';
  }, headerSelector);
  
  if (jaExpandido) {
    console.log('   ✅ Painel já está expandido!');
  } else {
    console.log('   ⏳ Painel fechado. Tentando expandir...');
    try {
      await page.evaluate((header) => { header.scrollIntoView({ block: 'center', behavior: 'instant' }); }, headerSelector);
      await aguardar(500);
      const tituloSelector = await headerSelector.evaluateHandle(h => h.querySelector('mat-panel-title'));
      await tituloSelector.click();
      await aguardar(1500);
    } catch (e) {
      await headerSelector.click({ delay: 150 });
      await aguardar(1500);
    }
    console.log('   ✅ Painel expandido com sucesso!');
  }
  
  console.log('   ⏳ Sistema lento detectado. Aguardando renderização COMPLETA dos textos...');
  await aguardar(3000); // Pausa base de 3 segundos
  
  let tentativas = 0;
  const maxTentativas = 8;
  let textoCompleto = false;
  
  while (tentativas < maxTentativas && !textoCompleto) {
    textoCompleto = await page.evaluate((header) => {
      const painel = header.closest('mat-expansion-panel');
      if (!painel) return false;
      const body = painel.querySelector('.mat-expansion-panel-body');
      if (!body) return false;
      const ps = body.querySelectorAll('p');
      for (let p of ps) {
        const texto = p.innerText.trim();
        if (texto.length > 30 || texto.toUpperCase().includes('BLOQUEADO') || texto.toUpperCase().includes('DESBLOQUEADO')) {
          return true;
        }
      }
      return false;
    }, headerSelector);
    
    if (!textoCompleto) {
      tentativas++;
      console.log(`   ⏳ Textos ainda incompletos. Aguardando... (${tentativas}/${maxTentativas})`);
      await aguardar(1000);
    }
  }
  
  if (textoCompleto) {
    console.log('   ✅ Textos renderizados completamente! Pronto para extração.');
  } else {
    console.log('   ⚠️ Tempo máximo de espera atingido. Tentando extrair mesmo assim...');
  }
  
  await headerSelector.dispose();
}

// ============================================================================
// 📊 EXTRAIR INFORMAÇÕES (COM DEBUG)
// ============================================================================
async function extrairInformacoesBloqueio(page) {
  console.log('   📊 Extraindo informações de bloqueio...');
  
  const resultado = await page.evaluate(() => {
    const paineis = Array.from(document.querySelectorAll('mat-expansion-panel'));
    const painelAlvo = paineis.find(p => {
      const titulo = p.querySelector('mat-panel-title');
      return titulo && titulo.innerText.toLowerCase().includes('informações de bloqueios');
    });
    
    if (!painelAlvo) return { linhasBrutas: [], debug: 'Painel não encontrado.' };
    
    const body = painelAlvo.querySelector('.mat-expansion-panel-body');
    if (!body) return { linhasBrutas: [], debug: 'Body não encontrado.' };
    
    const ps = Array.from(body.querySelectorAll('p'));
    const linhasBrutas = ps.map(p => p.innerText.trim());
    const linhasValidas = linhasBrutas.filter(texto => texto.length > 0 && texto.includes(':'));
    
    return { linhasBrutas, linhasValidas, debug: `Encontrados ${ps.length} <p>, ${linhasValidas.length} válidos.` };
  });
  
  console.log(`   🔍 Debug extração: ${resultado.debug}`);
  
  if (resultado.linhasBrutas.length > 0) {
    console.log('   📝 Textos brutos encontrados:');
    resultado.linhasBrutas.forEach((texto, i) => console.log(`      [${i}] "${texto}"`));
  }
  
  if (!resultado.linhasValidas || resultado.linhasValidas.length === 0) {
    console.log('   ⚠️ Nenhuma linha válida (com ":") encontrada.');
    return {};
  }
  
  const dados = {};
  for (const linha of resultado.linhasValidas) {
    const indiceDoisPontos = linha.indexOf(':');
    if (indiceDoisPontos === -1) continue;
    
    const label = linha.substring(0, indiceDoisPontos).trim();
    const valor = linha.substring(indiceDoisPontos + 1).trim();
    
    if (!label || !valor) continue;
    
    const chave = sanitizarChave(label);
    if (chave) dados[chave] = valor;
  }
  
  console.log(`   ✅ ${Object.keys(dados).length} informação(ões) extraída(s) com sucesso!`);
  return dados;
}

// ============================================================================
// 🔧 SANITIZAR CHAVE (Transforma label em nome de coluna CSV)
// ============================================================================
function sanitizarChave(label) {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/\([^)]*\)/g, '')       // Remove parênteses
    .replace(/[^a-z0-9\s]/g, '')     // Remove caracteres especiais
    .trim()
    .replace(/\s+/g, '_');           // Espaços viram underscore
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
    
    // ✅ AQUI ESTAVA O ERRO: Agora a função está devidamente definida e será chamada
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

// ============================================================================
// 🛡️ ANTI-DETECÇÃO
// ============================================================================
async function configurarAntiDetecao(page) {
  await page.setUserAgent(CONFIG.network.userAgent);
  await page.setExtraHTTPHeaders(CONFIG.network.extraHeaders);
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    window.chrome = { runtime: {} };
  });
}

// ============================================================================
// 📤 EXPORTAÇÕES (Garantindo que tudo esteja disponível)
// ============================================================================
module.exports = {
  aguardar,
  aguardarEnter,
  lerCsvEntrada,
  fazerLoginAutomatico,
  processarUmId,
  configurarAntiDetecao,
  sanitizarChave,
  extrairInformacoesBloqueio // ✅ Agora exportada corretamente
};
