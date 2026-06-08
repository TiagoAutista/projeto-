// ============================================================================
// BOT SDU - DIAGNOSE SERVICE PROBLEM
// Versão: 2.1.0 - Com suporte a ambiente corporativo
// ============================================================================

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs');

puppeteer.use(StealthPlugin());

// ============================================================================
// CONFIGURAÇÕES
// ============================================================================
const CONFIG = {
  url: "https://sdu.redecororp.br/DiagnoseServiceProblem/home",
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  idFibra: "SPO-76438046-069",
  
  // ⚙️ CONFIGURAÇÕES DE REDE (CRÍTICO PARA AMBIENTE CORPORATIVO)
  network: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ignoreHTTPSErrors: true,
    proxy: null, // Se usar proxy, descomente: { server: 'http://proxy.empresa.com:8080' }
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
    navigation: 90000, // Aumentado para 90s
    element: 20000,
    dropdown: 15000,
    search: 20000
  },
  
  retry: {
    maxAttempts: 3,
    delayBetweenAttempts: 5000
  },
  
  selectors: {
    homeState: ".ui-home-state",
    dropdownTrigger: '.ui-home-mat-form-field-selecionar .mat-select-trigger',
    dropdownOptions: '.cdk-overlay-pane .mat-option',
    searchInput: '.ui-home-mat-form-field-pesquisar input[formcontrolname="search"]',
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

// ============================================================================
// FUNÇÃO: Navegar com retry e tratamento de erros
// ============================================================================
async function navegarComRetry(page, url, maxTentativas = CONFIG.retry.maxAttempts) {
  let tentativa = 0;
  let ultimoErro = null;
  
  while (tentativa < maxTentativas) {
    tentativa++;
    console.log(`\n🔄 Tentativa ${tentativa}/${maxTentativas} de acessar o site...`);
    
    try {
      const response = await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: CONFIG.timeouts.navigation
      });
      
      // Verifica se a resposta foi válida
      if (!response) {
        throw new Error('Nenhuma resposta do servidor');
      }
      
      if (!response.ok()) {
        throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
      }
      
      console.log(`✅ Página carregada com sucesso (HTTP ${response.status()})`);
      return response;
      
    } catch (error) {
      ultimoErro = error;
      console.log(`⚠️ Falha na tentativa ${tentativa}: ${error.message}`);
      
      if (tentativa < maxTentativas) {
        console.log(`⏳ Aguardando ${CONFIG.retry.delayBetweenAttempts/1000}s antes de tentar novamente...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.retry.delayBetweenAttempts));
      }
    }
  }
  
  throw new Error(
    `Falha após ${maxTentativas} tentativas. Último erro: ${ultimoErro.message}\n\n` +
    `💡 Possíveis causas:\n` +
    `   1. Site bloqueando automação (verifique se está logado no Chrome normal)\n` +
    `   2. Problema de VPN/Proxy corporativo\n` +
    `   3. Certificado SSL não reconhecido\n` +
    `   4. Site fora do ar\n\n` +
    `🔧 Soluções:\n` +
    `   - Abra o site manualmente no Chrome e faça login primeiro\n` +
    `   - Verifique se precisa estar conectado à VPN da empresa\n` +
    `   - Confirme o caminho do Chrome em: ${CONFIG.executablePath}`
  );
}

// ============================================================================
// HELPER: Debug de Dropdown
// ============================================================================
async function debugDropdown(page, seletorTrigger) {
  console.log('\n🔎 === DEBUG DROPDOWN ===');
  
  await page.click(seletorTrigger);
  await page.waitForTimeout(800);
  
  const info = await page.evaluate(() => {
    const overlay = document.querySelector('.cdk-overlay-pane');
    const opcoes = Array.from(document.querySelectorAll('.cdk-overlay-pane .mat-option'));
    
    return {
      overlayExiste: !!overlay,
      totalOpcoes: opcoes.length,
      opcoes: opcoes.map((opt, i) => ({
        i,
        texto: opt.innerText.trim(),
        valor: opt.getAttribute('ng-reflect-value'),
        classes: opt.className,
        disabled: opt.classList.contains('mat-option-disabled')
      }))
    };
  });
  
  console.log('Overlay existe?', info.overlayExiste);
  console.log('Total de opções:', info.totalOpcoes);
  console.log('\nLista de opções:');
  info.opcoes.forEach(opt => {
    console.log(`  [${opt.i}] "${opt.texto}" | valor: ${opt.valor} | disabled: ${opt.disabled}`);
  });
  console.log('========================\n');
  
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  
  return info;
}

// ============================================================================
// HELPER: Selecionar opção do dropdown
// ============================================================================
async function selecionarOpcaoDropdown(page, textoAlvo, seletorTrigger) {
  console.log(`🖱️ Abrindo o menu de seleção...`);
  
  await page.waitForSelector(seletorTrigger, { visible: true, timeout: CONFIG.timeouts.dropdown });
  await page.click(seletorTrigger);
  await page.waitForTimeout(800);
  
  // ESTRATÉGIA 1: Digitar para filtrar
  console.log(`⌨️ Estratégia 1: Tentando digitar "${textoAlvo}" para filtrar...`);
  
  try {
    const temBusca = await page.$('.mat-select-search-inside-mat-form-field input, .mat-select-search-input');
    
    if (temBusca) {
      console.log('✅ Campo de busca encontrado no dropdown!');
      await temBusca.click({ clickCount: 3 });
      await temBusca.type(textoAlvo, { delay: 100 });
      await page.waitForTimeout(500);
      
      await page.waitForSelector('.cdk-overlay-pane .mat-option:not(.mat-option-disabled)', { 
        visible: true, 
        timeout: 5000 
      });
      await page.click('.cdk-overlay-pane .mat-option:not(.mat-option-disabled)');
      console.log(`✅ "${textoAlvo}" selecionado via busca!`);
      return true;
    } else {
      throw new Error('Sem campo de busca');
    }
  } catch (e) {
    console.log('⚠️ Estratégia 1 falhou, tentando estratégia 2...');
    
    // ESTRATÉGIA 2: Listar e clicar
    const resultado = await page.evaluate((texto) => {
      const opcoes = Array.from(document.querySelectorAll('.cdk-overlay-pane .mat-option'));
      
      const listaOpcoes = opcoes.map((opt, i) => ({
        indice: i,
        texto: opt.innerText.trim(),
        valor: opt.getAttribute('ng-reflect-value') || opt.getAttribute('data-value')
      }));
      
      const opcaoAlvo = opcoes.find(opt => {
        const textoOpt = opt.innerText.trim().toLowerCase();
        const textoBusca = texto.toLowerCase();
        return textoOpt.includes(textoBusca) || 
               textoOpt.replace(/\s+/g, '').includes(textoBusca.replace(/\s+/g, ''));
      });
      
      if (opcaoAlvo) {
        opcaoAlvo.scrollIntoView({ block: 'center' });
        opcaoAlvo.click();
        return { sucesso: true, textoSelecionado: opcaoAlvo.innerText.trim(), todasOpcoes: listaOpcoes };
      }
      
      return { sucesso: false, totalOpcoes: opcoes.length, todasOpcoes: listaOpcoes };
    }, textoAlvo);
    
    console.log('\n📋 OPÇÕES ENCONTRADAS NO DROPDOWN:');
    console.log('─'.repeat(50));
    resultado.todasOpcoes.forEach(opt => {
      console.log(`  [${opt.indice}] "${opt.texto}" (valor: ${opt.valor || 'N/A'})`);
    });
    console.log('─'.repeat(50));
    
    if (!resultado.sucesso) {
      throw new Error(
        `Opção "${textoAlvo}" não encontrada. Total de opções: ${resultado.totalOpcoes}.`
      );
    }
    
    console.log(`✅ Selecionado: "${resultado.textoSelecionado}"`);
    return true;
  }
}

// ============================================================================
// HELPER: Extrair dados
// ============================================================================
async function extrairDadosTabela(page) {
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
        const chave = headers[idx] || `coluna_${idx}`;
        linhaDados[chave] = col.innerText.trim();
      });
      
      if (Object.keys(linhaDados).length > 0) {
        dados.push(linhaDados);
      }
    });
    
    if (dados.length === 0) {
      const cards = document.querySelectorAll('.ui-card, .mat-card');
      cards.forEach((card, idx) => {
        const texto = card.innerText.trim();
        if (texto) {
          dados.push({ card_indice: idx + 1, conteudo: texto });
        }
      });
    }
    
    return dados;
  });
}

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================
(async () => {
  console.log("🚀 Iniciando o robô...");
  console.log(`📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}`);
  console.log(`🔍 ID a buscar: ${CONFIG.idFibra}\n`);

  // Verifica se o Chrome existe
  if (!fs.existsSync(CONFIG.executablePath)) {
    console.error(`❌ Chrome não encontrado em: ${CONFIG.executablePath}`);
    console.error(`💡 Verifique o caminho ou instale o Google Chrome`);
    return;
  }

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    executablePath: CONFIG.executablePath,
    ignoreHTTPSErrors: CONFIG.network.ignoreHTTPSErrors,
    args: [
      "--start-maximized",
      "--disable-blink-features=AutomationControlled",
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
      "--lang=pt-BR"
    ],
  });

  const page = await browser.newPage();

  try {
    // ========================================================================
    // CONFIGURAR NAVEGAÇÃO (CRÍTICO!)
    // ========================================================================
    console.log("⚙️ Configurando navegação corporativa...");
    
    // Define User-Agent real
    await page.setUserAgent(CONFIG.network.userAgent);
    
    // Define headers extras
    await page.setExtraHTTPHeaders(CONFIG.network.extraHeaders);
    
    // Bloqueia detecção de automação
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en-US', 'en'] });
      window.chrome = { runtime: {} };
    });
    
    console.log("✅ Navegação configurada!\n");

    // ========================================================================
    // 1. ACESSAR URL COM RETRY
    // ========================================================================
    await navegarComRetry(page, CONFIG.url);

    // ========================================================================
    // 2. AGUARDAR INTERFACE
    // ========================================================================
    console.log("\n⏳ Aguardando a interface carregar...");
    await page.waitForSelector(CONFIG.selectors.homeState, {
      visible: true,
      timeout: CONFIG.timeouts.element,
    });
    console.log("✅ Interface pronta!\n");

    // ========================================================================
    // 3. SELECIONAR "ID FIBRA"
    // ========================================================================
    await selecionarOpcaoDropdown(page, "ID Fibra", CONFIG.selectors.dropdownTrigger);
    await page.waitForTimeout(1000);
    console.log("✅ Dropdown processado!\n");

    // ========================================================================
    // 4. DIGITAR ID
    // ========================================================================
    console.log(`⌨️ Digitando o ID: ${CONFIG.idFibra}`);
    
    await page.waitForSelector(CONFIG.selectors.searchInput, { 
      visible: true, 
      timeout: CONFIG.timeouts.element 
    });
    
    await page.click(CONFIG.selectors.searchInput);
    await page.$eval(CONFIG.selectors.searchInput, (el) => (el.value = ""));
    await page.type(CONFIG.selectors.searchInput, CONFIG.idFibra, { delay: 80 });
    console.log("✅ ID digitado!\n");

    // ========================================================================
    // 5. CLICAR EM BUSCAR
    // ========================================================================
    console.log('🖱️ Clicando em "Buscar"...');
    
    await page.waitForSelector(CONFIG.selectors.searchButton, { 
      visible: true, 
      timeout: CONFIG.timeouts.element 
    });
    await page.click(CONFIG.selectors.searchButton);
    console.log("✅ Busca iniciada!\n");

    // ========================================================================
    // 6. AGUARDAR RESULTADO
    // ========================================================================
    console.log("⏳ Aguardando o sistema processar a busca...");
    
    await page.waitForFunction(
      (selectors) => {
        const temTabela = document.querySelector(selectors.resultTable);
        const temCard = document.querySelector(selectors.resultCard);
        const temErro = document.querySelector(selectors.errorMessage);
        return temTabela || temCard || temErro;
      },
      { timeout: CONFIG.timeouts.search },
      CONFIG.selectors
    );

    const temErro = await page.$(CONFIG.selectors.errorMessage);
    if (temErro) {
      const erroTexto = await page.evaluate((sel) => {
        const erro = document.querySelector(sel);
        return erro ? erro.innerText : 'Erro desconhecido';
      }, CONFIG.selectors.errorMessage);
      throw new Error(`Busca falhou: ${erroTexto}`);
    }

    console.log("✅ Busca realizada com sucesso!\n");

    // ========================================================================
    // 7. EXTRAIR DADOS
    // ========================================================================
    console.log("📊 Extraindo dados...");
    const dadosExtraidos = await extrairDadosTabela(page);

    console.log(`📦 Dados extraídos: ${dadosExtraidos.length} registros`);
    if (dadosExtraidos.length > 0) {
      console.log("\n📋 Prévia dos dados:");
      console.log(JSON.stringify(dadosExtraidos[0], null, 2));
    }

    // ========================================================================
    // 8. SALVAR SCREENSHOT
    // ========================================================================
    await page.screenshot({ 
      path: CONFIG.files.successScreenshot, 
      fullPage: true 
    });
    console.log(`\n📸 Screenshot salvo: ${CONFIG.files.successScreenshot}`);

    // ========================================================================
    // 9. SALVAR CSV
    // ========================================================================
    if (dadosExtraidos.length > 0) {
      const csvWriter = createCsvWriter({
        path: CONFIG.files.csvOutput,
        header: Object.keys(dadosExtraidos[0]).map(key => ({ id: key, title: key }))
      });
      await csvWriter.writeRecords(dadosExtraidos);
      console.log(`📄 CSV salvo: ${CONFIG.files.csvOutput}`);
    }

    console.log("\n🎉 Robô concluído com sucesso!");

  } catch (error) {
    console.error("\n❌ Erro durante a execução:", error.message);
    
    try {
      await page.screenshot({ 
        path: CONFIG.files.errorScreenshot, 
        fullPage: true 
      });
      console.log(`📸 Screenshot de erro salvo: ${CONFIG.files.errorScreenshot}`);
    } catch (screenshotError) {
      console.error("⚠️ Não foi possível tirar screenshot:", screenshotError.message);
    }
  } finally {
    console.log("\n🔒 Fechando navegador...");
    await browser.close();
    console.log("✅ Robô finalizado.");
  }
})();
