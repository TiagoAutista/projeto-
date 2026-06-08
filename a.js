// src/lib/sdu/sdu.js
// Módulo SDU - Diagnose Service Problem (ID Fibra)

const fs = require('fs');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const { aguardar, aguardarEnter } = require('../helpers');

// ============================================================================
// 🔧 Função Principal de Processamento
// ============================================================================
async function processarSDU(page, config, rl) {
  console.log('🔍 [SDU] Iniciando busca de ID Fibra...\n');

  const idFibra = await perguntarID(rl);
  if (!idFibra) {
    console.log('⚠️ Operação cancelada pelo operador.');
    return;
  }

  console.log(`🎯 ID a buscar: ${idFibra}\n`);

  // 1. Navegar para a URL do SDU
  const url = config.sdu?.url || 'https://sdu.redecorp.br/DiagnoseServiceProblem/home';
  console.log(`🌐 Acessando: ${url}`);
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  } catch (err) {
    throw new Error(`Falha ao acessar SDU: ${err.message}`);
  }

  // 2. Aguardar home carregar
  console.log('⏳ Aguardando interface carregar...');
  const homeSelector = config.sdu?.selectors?.homeState || '.ui-home-state';
  
  try {
    await page.waitForSelector(homeSelector, { visible: true, timeout: 20000 });
    console.log('✅ Home do SDU detectada!\n');
  } catch (err) {
    throw new Error('Não foi possível detectar a home do SDU. Verifique se está logado.');
  }

  // 3. Digitar ID diretamente na barra de pesquisa (sem dropdown)
  console.log(`⌨️ Digitando ID: ${idFibra}`);
  const searchSelector = config.sdu?.selectors?.searchInput || 'input.mat-input-element[formcontrolname="search"]';
  
  await page.waitForSelector(searchSelector, { visible: true, timeout: 15000 });
  await page.click(searchSelector);
  await page.$eval(searchSelector, (el) => (el.value = ''));
  await page.type(searchSelector, idFibra, { delay: 80 });
  console.log('✅ ID digitado!\n');

  // 4. Clicar em Buscar
  console.log('🖱️ Clicando em "Buscar"...');
  const buttonSelector = config.sdu?.selectors?.searchButton || '.ui-button-home';
  await page.waitForSelector(buttonSelector, { visible: true, timeout: 10000 });
  await page.click(buttonSelector);
  console.log('✅ Busca iniciada!\n');

  // 5. Aguardar resultado
  console.log('⏳ Aguardando resultado...');
  const selectors = config.sdu?.selectors || {};
  await page.waitForFunction(
    (sel) => {
      return document.querySelector(sel.resultTable) || 
             document.querySelector(sel.resultCard) || 
             document.querySelector(sel.errorMessage);
    },
    { timeout: 20000 },
    {
      resultTable: selectors.resultTable || '.mat-table',
      resultCard: selectors.resultCard || '.ui-card',
      errorMessage: selectors.errorMessage || '.mat-error, .mat-snack-bar-container'
    }
  );

  // Verificar erro
  const errorSelector = selectors.errorMessage || '.mat-error, .mat-snack-bar-container';
  const temErro = await page.$(errorSelector);
  if (temErro) {
    const erroTexto = await page.evaluate((sel) => document.querySelector(sel)?.innerText || 'Erro desconhecido', errorSelector);
    throw new Error(`Busca falhou: ${erroTexto}`);
  }

  console.log('✅ Busca concluída!\n');

  // 6. Extrair dados
  console.log('📊 Extraindo dados...');
  const dados = await extrairDados(page);
  console.log(`📦 Registros encontrados: ${dados.length}\n`);

  if (dados.length === 0) {
    console.log('⚠️ Nenhum dado encontrado para este ID.');
    return;
  }

  console.log('📋 Prévia dos dados:');
  console.log(JSON.stringify(dados[0], null, 2));

  // 7. Salvar screenshot
  const screenshotPath = path.join(process.cwd(), `sdu_${idFibra}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`\n📸 Screenshot: ${screenshotPath}`);

  // 8. Salvar CSV
  const csvPath = path.join(process.cwd(), `sdu_${idFibra}.csv`);
  const csvWriter = createCsvWriter({
    path: csvPath,
    header: Object.keys(dados[0]).map(key => ({ id: key, title: key }))
  });
  await csvWriter.writeRecords(dados);
  console.log(`📄 CSV: ${csvPath}`);

  console.log('\n🎉 Processamento SDU concluído!');
}

// ============================================================================
// 🔍 Modo Inspeção (abre a página e pausa para ajustes manuais)
// ============================================================================
async function abrirParaInspecaoSDU(page, config) {
  console.log('🔍 [SDU] Abrindo para inspeção manual...\n');

  const url = config.sdu?.url || 'https://sdu.redecorp.br/DiagnoseServiceProblem/home';
  console.log(`🌐 Acessando: ${url}`);
  
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  
  console.log('\n📋 INSTRUÇÕES:');
  console.log('   - A página está aberta no navegador');
  console.log('   - Faça ajustes manuais se necessário');
  console.log('   - Pressione ENTER no terminal para continuar\n');
  
  await aguardarEnter('✅ Pressione ENTER quando terminar a inspeção...');
}

// ============================================================================
// ❓ Perguntar ID ao operador
// ============================================================================
async function perguntarID(rl) {
  return new Promise((resolve) => {
    rl.question('🔍 Digite o ID Fibra (ex: SPO-76438046-069): ', (answer) => {
      const id = answer.trim();
      if (!id) {
        resolve(null);
      } else {
        resolve(id);
      }
    });
  });
}

// ============================================================================
// 📊 Extrair dados da página (tabela ou cards)
// ============================================================================
async function extrairDados(page) {
  return await page.evaluate(() => {
    const dados = [];
    
    // Tentar extrair de tabela
    const headers = Array.from(document.querySelectorAll('.mat-header-cell')).map(h => 
      h.innerText.trim().replace(/\s+/g, '_').toLowerCase()
    );
    
    const linhas = document.querySelectorAll('.mat-table tbody tr, .mat-row');
    linhas.forEach(linha => {
      const colunas = linha.querySelectorAll('.mat-cell, td');
      const linhaDados = {};
      colunas.forEach((col, idx) => {
        linhaDados[headers[idx] || `coluna_${idx}`] = col.innerText.trim();
      });
      if (Object.keys(linhaDados).length > 0) dados.push(linhaDados);
    });
    
    // Fallback para cards
    if (dados.length === 0) {
      document.querySelectorAll('.ui-card, .mat-card').forEach((card, idx) => {
        const texto = card.innerText.trim();
        if (texto) dados.push({ card_indice: idx + 1, conteudo: texto });
      });
    }
    
    return dados;
  });
}

module.exports = { processarSDU, abrirParaInspecaoSDU };
