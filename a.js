// ============================================================================
// BOT SDU - DIAGNOSE SERVICE PROBLEM
// Versão: 2.0.0 - Com suporte robusto para Angular Material
// ============================================================================

// ============================================================================
// IMPORTS
// ============================================================================
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs');

// Ativa o modo "stealth" ANTES de lançar o navegador
puppeteer.use(StealthPlugin());

// ============================================================================
// CONFIGURAÇÕES
// ============================================================================
const CONFIG = {
  url: "https://sdu.redecororp.br/DiagnoseServiceProblem/home",
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  idFibra: "SPO-76438046-069", // Altere aqui para o ID que deseja buscar
  timeouts: {
    navigation: 60000,
    element: 15000,
    dropdown: 10000,
    search: 15000
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
// HELPER: Debug de Dropdown Angular Material
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
// HELPER: Selecionar opção do dropdown com múltiplas estratégias
// ============================================================================
async function selecionarOpcaoDropdown(page, textoAlvo, seletorTrigger) {
  console.log(`🖱️ Abrindo o menu de seleção...`);
  
  await page.waitForSelector(seletorTrigger, { visible: true, timeout: CONFIG.timeouts.dropdown });
  await page.click(seletorTrigger);
  await page.waitForTimeout(800);
  
  // ESTRATÉGIA 1: Tentar digitar para filtrar (mais confiável)
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
      throw new Error('Sem campo de busca, usando estratégia 2');
    }
  } catch (e) {
    console.log('⚠️ Estratégia 1 falhou, tentando estratégia 2...');
    
    // ESTRATÉGIA 2: Listar todas as opções e clicar
    console.log('🔍 Estratégia 2: Listando todas as opções do dropdown...');
    
    const resultado = await page.evaluate((texto) => {
      const opcoes = Array.from(document.querySelectorAll('.cdk-overlay-pane .mat-option'));
      
      const listaOpcoes = opcoes.map((opt, i) => ({
        indice: i,
        texto: opt.innerText.trim(),
        textoExato: JSON.stringify(opt.innerText),
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
        return { 
          sucesso: true, 
          textoSelecionado: opcaoAlvo.innerText.trim(),
          todasOpcoes: listaOpcoes
        };
      }
      
      return { 
        sucesso: false, 
        totalOpcoes: opcoes.length,
        todasOpcoes: listaOpcoes
      };
    }, textoAlvo);
    
    console.log('\n📋 OPÇÕES ENCONTRADAS NO DROPDOWN:');
    console.log('─'.repeat(50));
    resultado.todasOpcoes.forEach(opt => {
      console.log(`  [${opt.indice}] "${opt.texto}" (valor: ${opt.valor || 'N/A'})`);
    });
    console.log('─'.repeat(50));
    
    if (!resultado.sucesso) {
      // ESTRATÉGIA 3: Tentar com XPath mais tolerante
      console.log('🔍 Estratégia 3: Tentando XPath...');
      
      try {
        const xpath = `//*[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${textoAlvo.toLowerCase()}')]`;
        await page.waitForXPath(xpath, { visible: true, timeout: 3000 });
        
        const [xpathElement] = await page.$x(xpath);
        
        if (xpathElement) {
          await xpathElement.click();
          console.log('✅ Selecionado via XPath!');
          return true;
        } else {
          throw new Error('XPath não encontrou');
        }
      } catch (xpathError) {
        throw new Error(
          `Opção "${textoAlvo}" não encontrada. Total de opções: ${resultado.totalOpcoes}. ` +
          `Veja o log acima para ver os textos exatos disponíveis.`
        );
      }
    } else {
      console.log(`✅ Selecionado: "${resultado.textoSelecionado}"`);
      return true;
    }
  }
}

// ============================================================================
// HELPER: Extrair dados de tabela Angular Material
// ============================================================================
async function extrairDadosTabela(page) {
  return await page.evaluate(() => {
    const dados = [];
    
    // Extrair cabeçalhos da tabela
    const headers = Array.from(document.querySelectorAll('.mat-header-cell')).map(h => 
      h.innerText.trim().replace(/\s+/g, '_').toLowerCase()
    );
    
    // Extrair linhas da tabela
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
    
    // Se não encontrou tabela, tenta cards
    if (dados.length === 0) {
      const cards = document.querySelectorAll('.ui-card, .mat-card');
      cards.forEach((card, idx) => {
        const texto = card.innerText.trim();
        if (texto) {
          dados.push({
            card_indice: idx + 1,
            conteudo: texto
          });
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

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    executablePath: CONFIG.executablePath,
    args: ["--start-maximized", "--disable-blink-features=AutomationControlled"],
  });

  const page = await browser.newPage();

  try {
    // ========================================================================
    // 1. ACESSAR URL
    // ========================================================================
    console.log(`🌐 Acessando: ${CONFIG.url}`);
    await page.goto(CONFIG.url, { 
      waitUntil: "networkidle2", 
      timeout: CONFIG.timeouts.navigation 
    });
    console.log("✅ Página carregada!\n");

    // ========================================================================
    // 2. AGUARDAR INTERFACE CARREGAR
    // ========================================================================
    console.log("⏳ Aguardando a interface carregar...");
    await page.waitForSelector(CONFIG.selectors.homeState, {
      visible: true,
      timeout: CONFIG.timeouts.element,
    });
    console.log("✅ Interface pronta!\n");

    // ========================================================================
    // 3. SELECIONAR "ID FIBRA" NO DROPDOWN
    // ========================================================================
    const selecionado = await selecionarOpcaoDropdown(
      page, 
      "ID Fibra", 
      CONFIG.selectors.dropdownTrigger
    );
    
    if (!selecionado) {
      throw new Error('Falha ao selecionar "ID Fibra" no dropdown');
    }
    
    // Pausa para Angular processar
    await page.waitForTimeout(1000);
    console.log("✅ Dropdown processado!\n");

    // ========================================================================
    // 4. DIGITAR ID NO CAMPO DE PESQUISA
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
    // 5. CLICAR NO BOTÃO "BUSCAR"
    // ========================================================================
    console.log('🖱️ Clicando em "Buscar"...');
    
    await page.waitForSelector(CONFIG.selectors.searchButton, { 
      visible: true, 
      timeout: CONFIG.timeouts.element 
    });
    await page.click(CONFIG.selectors.searchButton);
    console.log("✅ Busca iniciada!\n");

    // ========================================================================
    // 6. AGUARDAR RESULTADO DA BUSCA
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

    // Verificar se há erro na busca
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
    // 7. EXTRAIR DADOS DA BUSCA
    // ========================================================================
    console.log("📊 Extraindo dados...");
    const dadosExtraidos = await extrairDadosTabela(page);

    console.log(`📦 Dados extraídos: ${dadosExtraidos.length} registros`);
    if (dadosExtraidos.length > 0) {
      console.log("\n📋 Prévia dos dados:");
      console.log(JSON.stringify(dadosExtraidos[0], null, 2));
      if (dadosExtraidos.length > 1) {
        console.log(`... e mais ${dadosExtraidos.length - 1} registros\n`);
      }
    } else {
      console.log("⚠️ Nenhum dado encontrado na página\n");
    }

    // ========================================================================
    // 8. SALVAR SCREENSHOT DE SUCESSO
    // ========================================================================
    await page.screenshot({ 
      path: CONFIG.files.successScreenshot, 
      fullPage: true 
    });
    console.log(`📸 Screenshot salvo: ${CONFIG.files.successScreenshot}`);

    // ========================================================================
    // 9. SALVAR EM CSV
    // ========================================================================
    if (dadosExtraidos.length > 0) {
      const csvWriter = createCsvWriter({
        path: CONFIG.files.csvOutput,
        header: Object.keys(dadosExtraidos[0]).map(key => ({ 
          id: key, 
          title: key 
        }))
      });
      await csvWriter.writeRecords(dadosExtraidos);
      console.log(`📄 CSV salvo: ${CONFIG.files.csvOutput}`);
    } else {
      console.log("⚠️ Nenhum dado para salvar em CSV");
    }

    console.log("\n🎉 Robô concluído com sucesso!");

  } catch (error) {
    console.error("\n❌ Erro durante a execução:", error.message);
    console.error("📍 Stack:", error.stack);
    
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
