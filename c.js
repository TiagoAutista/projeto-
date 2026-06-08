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
  console.log("🚀 BOT SDU - Processamento em Lote com Login Automático");
  console.log(`📅 ${new Date().toLocaleString('pt-BR')}\n`);

  // ==========================================================================
  // 1. VALIDAÇÕES INICIAIS
  // ==========================================================================
  if (!fs.existsSync(CONFIG.executablePath)) {
    console.error(`❌ Chrome não encontrado em: ${CONFIG.executablePath}`);
    return;
  }

  let ids;
  try {
    ids = lerCsvEntrada();
    console.log(`📥 CSV carregado: ${ids.length} ID(s) para processar`);
    console.log(`📁 Arquivo: ${CONFIG.files.inputCsv}\n`);
  } catch (err) {
    console.error('❌', err.message);
    return;
  }

  // Criar pasta de resultados se não existir
  if (!fs.existsSync(CONFIG.files.outputFolder)) {
    fs.mkdirSync(CONFIG.files.outputFolder, { recursive: true });
    console.log(`📂 Pasta criada: ${CONFIG.files.outputFolder}\n`);
  }

  // ==========================================================================
  // 2. INICIAR NAVEGADOR
  // ==========================================================================
  const launchOptions = {
    headless: false,
    defaultViewport: null,
    executablePath: CONFIG.executablePath,
    ignoreHTTPSErrors: CONFIG.network.ignoreHTTPSErrors,
    args: [
      "--start-maximized",
      "--disable-blink-features=AutomationControlled",
      "--lang=pt-BR"
    ]
  };

  if (CONFIG.userDataDir) {
    console.log(`📂 Usando perfil do Chrome: ${CONFIG.userDataDir}`);
    launchOptions.userDataDir = CONFIG.userDataDir;
  }

  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();

  // Interface readline para coletar dados do operador
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const resultados = [];
  let sucessos = 0;
  let falhas = 0;

  try {
    // ========================================================================
    // 3. CONFIGURAR NAVEGAÇÃO E ACESSAR SDU
    // ========================================================================
    console.log("⚙️ Configurando navegação corporativa...");
    await configurarAntiDetecao(page);
    console.log("✅ Navegação configurada!\n");

    console.log(`🌐 Acessando: ${CONFIG.url}`);
    await page.goto(CONFIG.url, {
      waitUntil: "networkidle2",
      timeout: CONFIG.timeouts.navigation
    });

    // ========================================================================
    // 4. LOGIN AUTOMÁTICO COM COLETA DE CREDENCIAIS
    // ========================================================================
    await aguardar(2000);

    // Verifica se está na tela de login (procura campo de matrícula)
    const ehTelaLogin = await page.$(CONFIG.selectors.login.username);

    if (ehTelaLogin) {
      console.log('🔒 Tela de login detectada!\n');
      await fazerLoginAutomatico(page, rl);
    } else {
      console.log('✅ Sessão ativa detectada (ou já está na home)!\n');
      try {
        await page.waitForSelector(CONFIG.selectors.homeState, {
          visible: true,
          timeout: 10000
        });
      } catch (e) {
        await aguardarEnter('👉 Se estiver na HOME, pressione ENTER para continuar...');
      }
    }

    // ========================================================================
    // 5. LOOP DE PROCESSAMENTO EM LOTE
    // ========================================================================
    console.log('\n' + '═'.repeat(70));
    console.log('🔄 INICIANDO PROCESSAMENTO EM LOTE');
    console.log('═'.repeat(70) + '\n');

    for (let i = 0; i < ids.length; i++) {
      const idFibra = ids[i];
      const numero = i + 1;

      console.log(`\n[${numero}/${ids.length}] 🔍 Processando: ${idFibra}`);
      console.log('─'.repeat(50));

      const resultado = await processarUmId(page, idFibra);
      resultados.push(resultado);

      if (resultado.status === 'sucesso') {
        sucessos++;
        console.log(`   ✅ ${resultado.mensagem}`);
      } else {
        falhas++;
        console.log(`   ❌ ${resultado.mensagem}`);
      }

      // Pausa entre IDs (evita sobrecarga)
      if (i < ids.length - 1) {
        await aguardar(CONFIG.timeouts.entreIds);
      }
    }

    // ========================================================================
    // 6. GERAR RELATÓRIO CONSOLIDADO
    // ========================================================================
    console.log('\n' + '═'.repeat(70));
    console.log('📊 GERANDO RELATÓRIO FINAL');
    console.log('═'.repeat(70) + '\n');

    // CSV de status (resumo)
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

    // CSV com todos os dados extraídos (apenas dos sucessos)
    const dadosCompletos = resultados
      .filter(r => r.status === 'sucesso' && r.dados_extraidos)
      .flatMap(r => r.dados_extraidos.map(d => ({ id_fibra: r.id_fibra, ...d })));

    if (dadosCompletos.length > 0) {
      const csvDadosPath = path.join(CONFIG.files.outputFolder, 'dados_consolidados.csv');
      const csvDados = createCsvWriter({
        path: csvDadosPath,
        header: Object.keys(dadosCompletos[0]).map(key => ({ id: key, title: key }))
      });
      await csvDados.writeRecords(dadosCompletos);
      console.log(`📄 Dados consolidados: ${csvDadosPath}`);
    }

    // ========================================================================
    // 7. ESTATÍSTICAS FINAIS
    // ========================================================================
    console.log('\n' + '═'.repeat(70));
    console.log('📈 ESTATÍSTICAS');
    console.log('═'.repeat(70));
    console.log(`   Total processado: ${ids.length}`);
    console.log(`   ✅ Sucessos:      ${sucessos}`);
    console.log(`   ❌ Falhas:        ${falhas}`);
    console.log(`   📊 Taxa sucesso:  ${((sucessos / ids.length) * 100).toFixed(1)}%`);
    console.log('═'.repeat(70));

    console.log("\n🎉 Processamento em lote concluído!");

    // Fechar readline antes da pausa final
    rl.close();
    await aguardarEnter('\n✅ Pressione ENTER para fechar o navegador...');

  } catch (error) {
    console.error("\n❌ Erro crítico:", error.message);
    try {
      await page.screenshot({ path: CONFIG.files.errorScreenshot, fullPage: true });
      console.log(`📸 Screenshot: ${CONFIG.files.errorScreenshot}`);
    } catch (e) {
      console.error("⚠️ Falha ao salvar screenshot:", e.message);
    }
  } finally {
    rl.close();
    console.log("\n🔒 Fechando navegador...");
    await browser.close();
    console.log("✅ Bot finalizado.");
  }
})();
