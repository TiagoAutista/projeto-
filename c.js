// src/lib/bot/bot.js
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const CONFIG = require('./config');
const {
  aguardar,
  aguardarEnter,
  lerCsvEntrada,
  fazerLoginAutomatico,
  processarUmId,
  configurarAntiDetecao
} = require('./helpers');

puppeteer.use(StealthPlugin());

(async () => {
  console.log("🚀 BOT SDU - Processamento em Lote com Extração de Bloqueios");
  console.log(`📅 ${new Date().toLocaleString('pt-BR')}\n`);

  if (!fs.existsSync(CONFIG.executablePath)) {
    console.error(`❌ Chrome não encontrado em: ${CONFIG.executablePath}`);
    return;
  }

  let ids;
  try {
    ids = lerCsvEntrada();
    console.log(`📥 CSV carregado: ${ids.length} ID(s) para processar\n`);
  } catch (err) {
    console.error('❌', err.message);
    return;
  }

  if (!fs.existsSync(CONFIG.files.outputFolder)) {
    fs.mkdirSync(CONFIG.files.outputFolder, { recursive: true });
  }

  const launchOptions = {
    headless: false,
    defaultViewport: null,
    executablePath: CONFIG.executablePath,
    ignoreHTTPSErrors: CONFIG.network.ignoreHTTPSErrors,
    args: ["--start-maximized", "--disable-blink-features=AutomationControlled", "--lang=pt-BR"]
  };

  if (CONFIG.userDataDir) launchOptions.userDataDir = CONFIG.userDataDir;

  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const resultados = [];
  let sucessos = 0, falhas = 0;

  try {
    console.log("⚙️ Configurando navegação...");
    await configurarAntiDetecao(page);

    console.log(`🌐 Acessando: ${CONFIG.url}`);
    await page.goto(CONFIG.url, { waitUntil: "networkidle2", timeout: CONFIG.timeouts.navigation });

    await aguardar(2000);
    const ehTelaLogin = await page.$(CONFIG.selectors.login.username);

    if (ehTelaLogin) {
      console.log('🔒 Tela de login detectada!\n');
      await fazerLoginAutomatico(page, rl);
    } else {
      console.log('✅ Sessão ativa!\n');
      try {
        await page.waitForSelector(CONFIG.selectors.homeState, { visible: true, timeout: 10000 });
      } catch (e) {
        await aguardarEnter('👉 Se estiver na HOME, pressione ENTER...');
      }
    }

    console.log('\n' + '═'.repeat(70));
    console.log('🔄 INICIANDO PROCESSAMENTO EM LOTE');
    console.log('═'.repeat(70) + '\n');

    for (let i = 0; i < ids.length; i++) {
      const idFibra = ids[i];
      console.log(`\n[${i + 1}/${ids.length}] 🔍 Processando: ${idFibra}`);
      console.log('─'.repeat(50));

      const resultado = await processarUmId(page, idFibra);
      resultados.push(resultado);

      if (resultado.status === 'sucesso') {
        sucessos++;
        console.log(`   ✅ ${resultado.mensagem}`);
        // Mostra as informações extraídas no terminal
        if (Object.keys(resultado.bloqueios).length > 0) {
          console.log('   📋 Informações de bloqueio:');
          for (const [chave, valor] of Object.entries(resultado.bloqueios)) {
            console.log(`      • ${chave}: ${valor}`);
          }
        }
      } else {
        falhas++;
        console.log(`   ❌ ${resultado.mensagem}`);
      }

      if (i < ids.length - 1) await aguardar(CONFIG.timeouts.entreIds);
    }

    // ========================================================================
    // 📊 GERAR RELATÓRIOS (ATUALIZADO COM COLUNAS DINÂMICAS)
    // ========================================================================
    console.log('\n' + '═'.repeat(70));
    console.log('📊 GERANDO RELATÓRIO FINAL');
    console.log('═'.repeat(70) + '\n');

    // 1. CSV de status (resumo)
    const csvStatus = createCsvWriter({
      path: CONFIG.files.outputCsv,
      header: [
        { id: 'id_fibra', title: 'id_fibra' },
        { id: 'status', title: 'status' },
        { id: 'timestamp', title: 'timestamp' },
        { id: 'mensagem', title: 'mensagem' }
      ]
    });
    await csvStatus.writeRecords(resultados);
    console.log(`📄 Relatório de status: ${CONFIG.files.outputCsv}`);

    // 2. ✅ CSV CONSOLIDADO COM COLUNAS DINÂMICAS DE BLOQUEIO
    // Coleta todas as chaves únicas de bloqueio que apareceram em qualquer ID
    const todasChavesBloqueio = new Set();
    resultados.forEach(r => {
      if (r.bloqueios) {
        Object.keys(r.bloqueios).forEach(chave => todasChavesBloqueio.add(chave));
      }
    });

    const colunasBloqueio = Array.from(todasChavesBloqueio).sort();
    
    // Monta o header dinâmico
    const headerCsv = [
      { id: 'id_fibra', title: 'id_fibra' },
      { id: 'status', title: 'status' },
      ...colunasBloqueio.map(chave => ({ id: `bloqueio__${chave}`, title: chave }))
    ];

    // Monta as linhas achatando o objeto de bloqueios
    const linhasCsv = resultados.map(r => {
      const linha = {
        id_fibra: r.id_fibra,
        status: r.status
      };
      colunasBloqueio.forEach(chave => {
        linha[`bloqueio__${chave}`] = r.bloqueios?.[chave] || '';
      });
      return linha;
    });

    const csvConsolidadoPath = path.join(CONFIG.files.outputFolder, 'bloqueios_consolidados.csv');
    const csvConsolidado = createCsvWriter({ path: csvConsolidadoPath, header: headerCsv });
    await csvConsolidado.writeRecords(linhasCsv);
    console.log(`📄 Bloqueios consolidados: ${csvConsolidadoPath}`);
    console.log(`   📋 Colunas de bloqueio geradas: ${colunasBloqueio.length}`);
    colunasBloqueio.forEach(c => console.log(`      • ${c}`));

    // ========================================================================
    // 📈 ESTATÍSTICAS
    // ========================================================================
    console.log('\n' + '═'.repeat(70));
    console.log('📈 ESTATÍSTICAS');
    console.log('═'.repeat(70));
    console.log(`   Total processado: ${ids.length}`);
    console.log(`   ✅ Sucessos:      ${sucessos}`);
    console.log(`   ❌ Falhas:        ${falhas}`);
    console.log(`   📊 Taxa sucesso:  ${ids.length > 0 ? ((sucessos/ids.length)*100).toFixed(1) : 0}%`);
    console.log('═'.repeat(70));

    console.log("\n🎉 Processamento concluído!");
    rl.close();
    await aguardarEnter('\n✅ Pressione ENTER para fechar o navegador...');

  } catch (error) {
    console.error("\n❌ Erro crítico:", error.message);
    try {
      await page.screenshot({ path: CONFIG.files.errorScreenshot, fullPage: true });
      console.log(`📸 Screenshot: ${CONFIG.files.errorScreenshot}`);
    } catch (e) { /* ignora */ }
  } finally {
    rl.close();
    console.log("\n🔒 Fechando navegador...");
    await browser.close();
    console.log("✅ Bot finalizado.");
  }
})();
