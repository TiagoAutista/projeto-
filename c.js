// src/lib/bot/bot.js
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');

const CONFIG = require('./config');
const {
  aguardar, aguardarEnter, estaNaTelaDeLogin, fazerLoginManual,
  navegarComRetry, selecionarOpcaoDropdown, extrairDadosTabela, configurarAntiDetecao
} = require('./helpers');

puppeteer.use(StealthPlugin());

(async () => {
  console.log("🚀 Iniciando o robô...");
  console.log(`📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}`);
  console.log(`🔍 ID a buscar: ${CONFIG.idFibra}\n`);

  if (!fs.existsSync(CONFIG.executablePath)) {
    console.error(`❌ Chrome não encontrado em: ${CONFIG.executablePath}`);
    return;
  }

  const launchOptions = {
    headless: false,
    defaultViewport: null,
    executablePath: CONFIG.executablePath,
    ignoreHTTPSErrors: CONFIG.network.ignoreHTTPSErrors,
    args: ["--start-maximized", "--disable-blink-features=AutomationControlled", "--lang=pt-BR"]
  };
  
  if (CONFIG.userDataDir) {
    console.log(`📂 Usando perfil do Chrome: ${CONFIG.userDataDir}`);
    launchOptions.userDataDir = CONFIG.userDataDir;
  }

  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();

  try {
    console.log("⚙️ Configurando navegação corporativa...");
    await configurarAntiDetecao(page, CONFIG.network);
    console.log("✅ Navegação configurada!\n");

    await navegarComRetry(page, CONFIG.url);

    console.log("\n🔍 Verificando status de autenticação...");
    await aguardar(2000);
    
    if (await estaNaTelaDeLogin(page)) {
      console.log('🔒 Tela de login detectada!');
      await fazerLoginManual(page);
    } else {
      console.log('✅ Sessão ativa detectada!\n');
      try {
        await page.waitForSelector(CONFIG.selectors.homeState, { visible: true, timeout: 10000 });
      } catch (e) {
        await aguardarEnter('👉 Se estiver na HOME, pressione ENTER para continuar...');
      }
    }

    await selecionarOpcaoDropdown(page, "ID Fibra", CONFIG.selectors.dropdownTrigger);
    await aguardar(1000);

    console.log(`\n⌨️ Digitando o ID: ${CONFIG.idFibra}`);
    await page.waitForSelector(CONFIG.selectors.searchInput, { visible: true, timeout: CONFIG.timeouts.element });
    await page.click(CONFIG.selectors.searchInput);
    await page.$eval(CONFIG.selectors.searchInput, (el) => (el.value = ""));
    await page.type(CONFIG.selectors.searchInput, CONFIG.idFibra, { delay: 80 });

    console.log('\n🖱️ Clicando em "Buscar"...');
    await page.waitForSelector(CONFIG.selectors.searchButton, { visible: true, timeout: CONFIG.timeouts.element });
    await page.click(CONFIG.selectors.searchButton);

    console.log("\n⏳ Aguardando o sistema processar a busca...");
    await page.waitForFunction(
      (sel) => document.querySelector(sel.resultTable) || document.querySelector(sel.resultCard) || document.querySelector(sel.errorMessage),
      { timeout: CONFIG.timeouts.search },
      CONFIG.selectors
    );

    const temErro = await page.$(CONFIG.selectors.errorMessage);
    if (temErro) {
      const erroTexto = await page.evaluate((sel) => document.querySelector(sel)?.innerText || 'Erro desconhecido', CONFIG.selectors.errorMessage);
      throw new Error(`Busca falhou: ${erroTexto}`);
    }
    console.log("✅ Busca realizada com sucesso!\n");

    console.log("📊 Extraindo dados...");
    const dadosExtraidos = await extrairDadosTabela(page);
    console.log(`📦 Dados extraídos: ${dadosExtraidos.length} registros`);
    if (dadosExtraidos.length > 0) console.log("📋 Prévia:", JSON.stringify(dadosExtraidos[0], null, 2));

    await page.screenshot({ path: CONFIG.files.successScreenshot, fullPage: true });
    console.log(`\n📸 Screenshot salvo: ${CONFIG.files.successScreenshot}`);

    if (dadosExtraidos.length > 0) {
      const csvWriter = createCsvWriter({
        path: CONFIG.files.csvOutput,
        header: Object.keys(dadosExtraidos[0]).map(key => ({ id: key, title: key }))
      });
      await csvWriter.writeRecords(dadosExtraidos);
      console.log(`📄 CSV salvo: ${CONFIG.files.csvOutput}`);
    }

    console.log("\n🎉 Robô concluído com sucesso!");
    await aguardarEnter('\n✅ Pressione ENTER para fechar o navegador...');

  } catch (error) {
    console.error("\n❌ Erro durante a execução:", error.message);
    try {
      await page.screenshot({ path: CONFIG.files.errorScreenshot, fullPage: true });
      console.log(`📸 Screenshot de erro salvo: ${CONFIG.files.errorScreenshot}`);
    } catch (e) { console.error("⚠️ Falha ao salvar screenshot de erro:", e.message); }
  } finally {
    console.log("\n🔒 Fechando navegador...");
    await browser.close();
    console.log("✅ Robô finalizado.");
  }
})();
