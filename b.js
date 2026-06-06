// src/lib/gps-next/subroutine/process/verificarSessao.js
const { delay, aguardarPrimeFaces, pausaInterativa } = require("../../../../utils/helpers");

/**
 * Navega para a URL base e garante que a sessão está ativa
 */
async function verificarSessao(page, config, rl) {
  console.log("\n🔐 Verificando integridade da sessão...");

  const timeoutNav = config.timeouts?.navegacao || 60000;
  const timeoutElem = config.timeouts?.elemento || 30000;

  await page.goto(config.gps.urlBase, {
    waitUntil: "domcontentloaded",
    timeout: timeoutNav,
  });

  await aguardarPrimeFaces(page, timeoutElem);
  await delay(config.delays?.posLogin || 2000);

  const urlAtual = page.url().toLowerCase();
  if (urlAtual.includes("login") || urlAtual.includes("autenticacao")) {
    console.log("⚠️ Sessão deslogada. Requisitando autenticação humana.");
    
    await pausaInterativa(rl, config, "gps", "pausarLoginManual", "🔐 LOGIN NECESSÁRIO", [
      "1. Realize o login manualmente no sistema GPS",
      "2. Aguarde a home do portal carregar completamente",
      "3. Pressione ENTER aqui neste console para liberar o robô",
    ]);

    await page.reload({ waitUntil: "domcontentloaded", timeout: timeoutNav });
    await aguardarPrimeFaces(page, timeoutElem);
    await delay(1500);
  } else {
    console.log("✅ Sessão ativa confirmada!");
  }

  await pausaInterativa(rl, config, "gps", "pausarAntesProcessar", "🛑 CONFIRMAÇÃO DE LOGIN", [
    "✅ Conexão estabelecida com o barramento do GPS",
    "📋 Base de documentos pronta para injeção",
    "Próximo passo: Iniciar varredura do lote.",
  ]);
}

module.exports = { verificarSessao };
