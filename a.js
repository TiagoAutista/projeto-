// [MAIN] Orquestrador do Robô Unificado
const config = require("./config/config");
const {
  obterNavegador,
  obterPagina,
  configurarPagina,
  desconectarDoChrome,
} = require("./lib/browser");
const { garantirSessao } = require("./lib/session");
const { processarWFM, abrirParaInspecaoWFM } = require("./lib/wfm");
// ✅ Substitua a linha 11 por esta rota exata:
const { processarGPS } = require('./lib/gps-next/gps');

// Módulo Siebel
const { processarSiebel, abrirParaInspecaoSiebel } = require("./lib/GPS-siebel");

// ✅ NOVO: Módulo SDU (Diagnóstico de ID Fibra)
const { processarSDU, abrirParaInspecaoSDU } = require("./lib/sdu/sdu");

const { mostrarMenu, criarInterface } = require("./ui/menu");

(async () => {
  console.clear();
  console.log("🚀 Robô Unificado iniciado...\n");

  let browser;
  const rl = criarInterface();
  let ativo = true;

  // Helper seguro para pausar o terminal e aguardar o operador
  const aguardarVoltar = () => new Promise((res) => {
    rl.question("\n↩️ Pressione [ENTER] para voltar ao menu principal...", () => res());
  });

  try {
    // Conecta ao Chrome aberto via CDP apenas uma vez
    browser = await obterNavegador(config);
  } catch (err) {
    console.error("❌ Erro fatal ao conectar ao Google Chrome (CDP):", err.message);
    console.error("💡 Verifique se o Chrome foi iniciado com as flags de depuração remota.");
    rl.close();
    process.exit(1);
  }

  // Loop principal com try/catch interno para garantir resiliência
  while (ativo) {
    try {
      console.clear(); // Mantém o terminal do operador sempre limpo e organizado
      const op = await mostrarMenu(rl);
      let page;

      switch (op) {
        case "1":
          console.clear();
          console.log('▶️ [WFM] Iniciando extração de CPFs em lote...');
          page = await obterPagina(browser, "appwfm.gvt.net.br");
          await configurarPagina(page, config);
          await garantirSessao(page, "wfm", rl, config);
          await processarWFM(page, config, rl);
          await aguardarVoltar();
          break;

        case "2":
          console.clear();
          console.log('▶️ [GPS] Iniciando Tipificação por UNIDADE...');
          page = await obterPagina(browser, "gps");
          await configurarPagina(page, config);
          await garantirSessao(page, "gps", rl, config);
          await processarGPS(page, "unidade", config, rl);
          await aguardarVoltar();
          break;

        case "3":
          console.clear();
          console.log('▶️ [GPS] Iniciando Tipificação por GRUPO...');
          page = await obterPagina(browser, "gps");
          await configurarPagina(page, config);
          await garantirSessao(page, "gps", rl, config);
          await processarGPS(page, "grupo", config, rl);
          await aguardarVoltar();
          break;

        case "4":
          console.clear();
          console.log("🔍 [WFM] Abrindo para inspeção/ajustes manuais...");
          page = await obterPagina(browser, "appwfm.gvt.net.br");
          await configurarPagina(page, config);
          await garantirSessao(page, "wfm", rl, config);
          await abrirParaInspecaoWFM(page, config);
          await aguardarVoltar();
          break;

        case "5":
          console.clear();
          console.log("🔍 [GPS] Abrindo para inspeção/ajustes manuais...");
          page = await obterPagina(browser, "gps");
          await configurarPagina(page, config);
          await garantirSessao(page, "gps", rl, config);
          await abrirParaInspecaoGPS(page, config);
          await aguardarVoltar();
          break;

        case "6":
          console.clear();
          console.log("🗄️ [Siebel] Iniciando Tipificação por UNIDADE...");
          page = await obterPagina(browser, "siebel");
          await configurarPagina(page, config);
          await garantirSessao(page, "siebel", rl, config);
          await processarSiebel(page, "unidade", config, rl);
          await aguardarVoltar();
          break;

        case "7":
          console.clear();
          console.log("🗄️ [Siebel] Iniciando Tipificação por GRUPO...");
          page = await obterPagina(browser, "siebel");
          await configurarPagina(page, config);
          await garantirSessao(page, "siebel", rl, config);
          await processarSiebel(page, "grupo", config, rl);
          await aguardarVoltar();
          break;

        case "8":
          console.clear();
          console.log("🔍 [Siebel] Abrindo para inspeção/ajustes manuais...");
          page = await obterPagina(browser, "siebel");
          await configurarPagina(page, config);
          await garantirSessao(page, "siebel", rl, config);
          await abrirParaInspecaoSiebel(page, config);
          await aguardarVoltar();
          break;

        // ✅ NOVO: SDU - Busca de ID Fibra
        case "9":
          console.clear();
          console.log('🔍 [SDU] Iniciando busca de ID Fibra...');
          page = await obterPagina(browser, "sdu.redecorp.br");
          await configurarPagina(page, config);
          await garantirSessao(page, "sdu", rl, config);
          await processarSDU(page, config, rl);
          await aguardarVoltar();
          break;

        // ✅ NOVO: SDU - Modo Inspeção
        case "10":
          console.clear();
          console.log("🔍 [SDU] Abrindo para inspeção/ajustes manuais...");
          page = await obterPagina(browser, "sdu.redecorp.br");
          await configurarPagina(page, config);
          await garantirSessao(page, "sdu", rl, config);
          await abrirParaInspecaoSDU(page, config);
          await aguardarVoltar();
          break;

        // ✅ ENCERRAR (movido de 9 para 0)
        case "0":
          console.log("\n👋 Encerrando aplicação...");
          ativo = false;
          break;

        default:
          console.log("⚠️ Opção inválida! Escolha um número de 0 a 10.");
          await new Promise(r => setTimeout(r, 1500));
      }
    } catch (err) {
      console.error("\n❌ Erro na execução da opção escolhida:", err.message);
      console.log("💡 O estado do robô foi preservado para evitar quedas.");
      await aguardarVoltar();
    }
  }

  // Desconexão limpa e segura de recursos
  rl.close();
  if (browser) {
    await desconectarDoChrome(browser);
  }
  console.log("✅ Programa finalizado com sucesso!");
  process.exit(0);
})();

// Captura falhas críticas fora do escopo principal para evitar travamentos de terminal
process.on('unhandledRejection', (erro) => {
  console.error('\n❌ Um erro assíncrono inesperado ocorreu no ecossistema:', erro.message);
});
