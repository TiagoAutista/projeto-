// ============================================================================
const { parse } = require('csv-parse/sync');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs');

const { extrairTexto } = require("../utils/helpers");

// Ativa o modo "stealth" para evitar bloqueios do F5/WAF
puppeteer.use(StealthPlugin());

(async () => {
  console.log("🚀 Iniciando o robô...");

  // Inicia o navegador (headless: false permite que você veja o robô trabalhando)
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null, // Usa a tamanho normalA tela
    args: ["--start-maximized"],
  });

  const page = await browser.newPage();

  try {
    // 1. Acesse a URL do sistema (SUBSTITUA PELA URL REAL)
    const url = "http://URL_DO_SEU_SISTEMA_AQUI/DiagnoseServiceProblem";
    console.log(`🌐 Acessando: ${url}`);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    // 2. Aguardar o Angular carregar o campo de seleção
    console.log("⏳ Aguardando a interface carregando...");
    await page.waitForSelector("#mat-select-0", {
      visible: true,
      timeout: 15000,
    });

    // 3. Abrir o dropdown de seleção (Angular Material exige clique para abrir)
    console.log("🖱️ Abrindo o menu de seleção...");
    await page.click("#mat-select-0");

    // Aguardar as opções do dropdown aparecerem na tela
    await page.waitForSelector(".mat-option", {
      visible: true,
      timeout: 10000,
    });

    // 4. Selecionar a opção "ID Fibra" (ou "ID Fibra Óptica", ajuste o texto se necessário)
    console.log('🖱️ Selecionando "ID Fibra"...');
    await page.evaluate(() => {
      const opcoes = Array.from(document.querySelectorAll(".mat-option"));
      const opcaoAlvo = opcoes.find((opt) =>
        opt.innerText.trim().includes("ID Fibra"),
      );
      if (opcaoAlvo) {
        opcaoAlvo.click();
      } else {
        console.warn(
          '⚠️ Opção "ID Fibra" não encontrada. Verifique o nome exato no sistema.',
        );
      }
    });

    // Pequena pausa para o Angular processar a mudança do dropdown
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 5. Digitar o ID no campo de pesquisa
    const idFibra = "SPO-123455654-069";
    console.log(`⌨️ Digitando o ID: ${idFibra}`);

    // Limpa o campo e digita com delay humano para evitar detecção
    await page.click('input[formcontrolname="search"]');
    await page.$eval(
      'input[formcontrolname="search"]',
      (el) => (el.value = ""),
    );
    await page.type('input[formcontrolname="search"]', idFibra, { delay: 150 });

    // 6. Clicar no botão "Buscar"
    console.log('🖱️ Clicando em "Buscar"...');
    await page.waitForSelector("button.ui-button-home", { visible: true });
    await page.click("button.ui-button-home");

    // 7. Aguardar o resultado da busca aparecer na tela
    console.log("⏳ Aguardando o sistema processar a busca...");
    // Ajuste o seletor abaixo para o elemento que aparece APENAS quando a busca é concluída
    await page.waitForSelector(".ui-home-state, .mat-table, .ui-card", {
      timeout: 15000,
    });

    console.log(
      "✅ Busca realizada com sucesso! O robó pode prosseguir com a extração de dados.",
    );

    // Aqui você adiciona o código para extrair os dados (ex: page.evaluate(...) ou page.$$eval(...))
  } catch (error) {
    console.error(
      "❌ Ocorreu um erro durante a execução do robô:",
      error.message,
    );
    await page.screenshot({ path: "erro_tela.png", fullPage: true });
  } finally {
    // Opcional: Fechar o navegador no final
    // await browser.close();
  }
})();
