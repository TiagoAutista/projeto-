// ============================================================================
// IMPORTS CORRETOS
// ============================================================================
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { parse } = require('csv-parse/sync');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs');

// Ativa o modo "stealth" ANTES de lançar o navegador
puppeteer.use(StealthPlugin());

(async () => {
  console.log("🚀 Iniciando o robô...");

  // Inicialização unificada dentro da função assíncrona
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ["--start-maximized"],
  });

  const page = await browser.newPage();

  try {
    // 1. Acessar URL
    const url = "https://sdu.redecorp.br/DiagnoseServiceProblem/home";
    console.log(`🌐 Acessando: ${url}`);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    // 2. Aguardar interface carregar
    console.log("⏳ Aguardando a interface carregar...");
    await page.waitForSelector(".ui-home-state", {
      visible: true,
      timeout: 15000,
    });

    // 3. Abrir dropdown de seleção (usando seletor mais confiável)
    console.log("🖱️ Abrindo o menu de seleção...");
    const seletorDropdown = '.ui-home-mat-form-field-selecionar .mat-select-trigger';
    await page.waitForSelector(seletorDropdown, { visible: true, timeout: 10000 });
    await page.click(seletorDropdown);

    // 4. Aguardar e selecionar "ID Fibra"
    console.log('🖱️ Selecionando "ID Fibra"...');
    await page.waitForSelector('.cdk-overlay-pane .mat-option', { 
      visible: true, 
      timeout: 10000 
    });
    
    const selecionado = await page.evaluate(() => {
      const opcoes = Array.from(document.querySelectorAll('.cdk-overlay-pane .mat-option'));
      const opcaoAlvo = opcoes.find((opt) => 
        opt.innerText.trim().includes('ID Fibra')
      );
      if (opcaoAlvo) {
        opcaoAlvo.click();
        return true;
      }
      return false;
    });

    if (!selecionado) {
      throw new Error('Opção "ID Fibra" não encontrada no dropdown');
    }

    // Pausa para Angular processar
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 5. Digitar ID no campo de pesquisa
    const idFibra = "SPO-76438046-069";
    console.log(`⌨️ Digitando o ID: ${idFibra}`);

    const seletorInput = '.ui-home-mat-form-field-pesquisar input[formcontrolname="search"]';
    await page.waitForSelector(seletorInput, { visible: true, timeout: 5000 });
    await page.click(seletorInput);
    await page.$eval(seletorInput, (el) => (el.value = ""));
    await page.type(seletorInput, idFibra, { delay: 150 });

    // 6. Clicar no botão "Buscar"
    console.log('🖱️ Clicando em "Buscar"...');
    const seletorBotao = '.ui-button-home';
    await page.waitForSelector(seletorBotao, { visible: true, timeout: 5000 });
    await page.click(seletorBotao);

    // 7. Aguardar resultado da busca
    console.log("⏳ Aguardando o sistema processar a busca...");
    
    // Aguardar por qualquer indicador de resultado (tabela, card ou mensagem de erro)
    await page.waitForFunction(
      () => {
        const temTabela = document.querySelector('.mat-table');
        const temCard = document.querySelector('.ui-card');
        const temErro = document.querySelector('.mat-error, .mat-snack-bar-container');
        return temTabela || temCard || temErro;
      },
      { timeout: 15000 }
    );

    // Verificar se há erro na busca
    const temErro = await page.$('.mat-error, .mat-snack-bar-container');
    if (temErro) {
      const erroTexto = await page.evaluate(() => {
        const erro = document.querySelector('.mat-error, .mat-snack-bar-container');
        return erro ? erro.innerText : 'Erro desconhecido';
      });
      throw new Error(`Busca falhou: ${erroTexto}`);
    }

    console.log("✅ Busca realizada com sucesso!");

    // 8. Extrair dados da busca
    console.log("📊 Extraindo dados...");
    const dadosExtraidos = await page.evaluate(() => {
      const dados = [];
      
      // Tentar extrair de tabela
      const linhas = document.querySelectorAll('.mat-table tbody tr');
      linhas.forEach(linha => {
        const colunas = linha.querySelectorAll('td');
        const linhaDados = {};
        colunas.forEach((col, idx) => {
          linhaDados[`coluna_${idx}`] = col.innerText.trim();
        });
        if (Object.keys(linhaDados).length > 0) {
          dados.push(linhaDados);
        }
      });

      // Tentar extrair de cards
      if (dados.length === 0) {
        const cards = document.querySelectorAll('.ui-card');
        cards.forEach(card => {
          dados.push({
            conteudo: card.innerText.trim()
          });
        });
      }

      return dados;
    });

    console.log(`📦 Dados extraídos: ${dadosExtraidos.length} registros`);
    console.log(dadosExtraidos);

    // 9. Screenshot de sucesso
    await page.screenshot({ 
      path: "sucesso_busca.png", 
      fullPage: true 
    });
    console.log("📸 Screenshot salvo: sucesso_busca.png");

    // 10. Salvar em CSV (opcional)
    if (dadosExtraidos.length > 0) {
      const csvWriter = createCsvWriter({
        path: 'resultado_busca.csv',
        header: Object.keys(dadosExtraidos[0]).map(key => ({ id: key, title: key }))
      });
      await csvWriter.writeRecords(dadosExtraidos);
      console.log("📄 CSV salvo: resultado_busca.csv");
    }

  } catch (error) {
    console.error("❌ Erro durante a execução:", error.message);
    await page.screenshot({ path: "erro_tela.png", fullPage: true });
    console.log("📸 Screenshot de erro salvo: erro_tela.png");
  } finally {
    // Fechar navegador
    console.log("🔒 Fechando navegador...");
    await browser.close();
    console.log("✅ Robô finalizado.");
  }
})();

