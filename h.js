// src/lib/gps-next/subroutine/process/processarGPS.js
const { pausaInterativa } = require("../../../../utils/helpers");
const { executarDiagnosticoOrdem } = require("../executarDiagnosticoOrdem");

const { lerRegistrosCSV } = require("./lerRegistrosCSV");
const { verificarSessao } = require("./verificarSessao");
const { injetarDocumento } = require("./injetarDocumento");
const { abrirPainelTipificacao } = require("./abrirPainelTipificacao");
const { selecionarEndereco } = require("./selecionarEndereco");
const { aplicarTipificacao } = require("./aplicarTipificacao");
const { exportarResultados } = require("./exportarResultados");

/**
 * Orquestrador principal do fluxo GPS
 */
async function processarGPS(page, tipo, config, rl) {
  console.log(`\n🛰️  [GPS - Tipificação por ${tipo.toUpperCase()}]`);
  const inicioTotal = Date.now();
  const tipoTratado = String(tipo).toLowerCase();

  // 1. Setup e Leitura
  const { registros, arquivoSaida, cfg } = await lerRegistrosCSV(config, tipoTratado);
  if (!registros) return;

  // 2. Sessão
  await verificarSessao(page, config, rl);

  const timeoutNav = config.timeouts?.navegacao || 60000;
  console.log(`⏱️  Timeouts Ativos: Navegação=${timeoutNav}ms`);

  const resultados = [];

  // 3. Loop Principal
  for (let i = 0; i < registros.length; i++) {
    const reg = registros[i];
    const cpfRaw = reg.CPF_CLIENTE || reg.CPF || reg.DOCUMENTO || reg.ID || Object.values(reg)[0];
    const enderecoAlvo = reg.ENDERECO || reg.CIDADE || reg.LOCALIDADE || "SUZANO SP";

    if (!cpfRaw) continue;
    const docLimpo = String(cpfRaw).replace(/\D/g, "");

    process.stdout.write(`\r📊 Andamento: [${i + 1}/${registros.length}] Processando CPF: ${docLimpo}...`);
    const dados = { documento: docLimpo, tipificacao: "N/A", status: "PENDENTE", erro: "" };

    try {
      // A. Injeção
      const { sessaoExpirada } = await injetarDocumento(page, docLimpo, config);
      if (sessaoExpirada) {
        console.log("\n❌ [CRÍTICO] A sessão expirou no meio do lote. Abortando.");
        dados.erro = "Sessão expirada";
        dados.status = "ERRO_SESSAO";
        resultados.push(dados);
        break;
      }

      await pausaInterativa(rl, config, "gps", "pausarAntesProcessar", "🛑 PAUSA 1 - DOCUMENTO CARREGADO", [
        `📋 CPF Injetado: ${docLimpo}`, `📍 Endereço Alvo: ${enderecoAlvo}`,
      ], `Documento: ${docLimpo}`);

      // B. Painel e Endereço
      await abrirPainelTipificacao(page);
      await selecionarEndereco(page, enderecoAlvo);

      await pausaInterativa(rl, config, "gps", "pausarAntesTipificar", "🛑 PAUSA 2 - PRONTO PARA TIPIFICAR", [
        `📋 CPF: ${docLimpo}`, "Próximo: Injeção das árvores de tipificação.",
      ], `Documento: ${docLimpo}`);

      // C. Tipificação e Diagnóstico
      await aplicarTipificacao(page, cfg);
      await executarDiagnosticoOrdem(page, config, rl);      

      // D. Pausa manual de sucesso
      if (dados.status === "SUCESSO") {
        console.log("\n===============================================================================");
        console.log(`🛑 PAUSA OBRIGATÓRIA - CPF Validado: ${docLimpo}`);
        console.log("===============================================================================");
        await new Promise(resolve => rl.question('\n   👉 Trate a ordem e pressione [ENTER]... ', resolve));
      }
      
    } catch (err) {
      console.error(`\n      ❌ Falha operacional: ${err.message}`);
      dados.erro = err.message;
      dados.status = "ERRO";
      await pausaInterativa(rl, config, "gps", "pausarEmErro", "⚠️  ERRO NO PROCESSAMENTO", [`❌ ${err.message}`], `Documento: ${docLimpo}`);
    }

    resultados.push(dados);
  }

  // 4. Exportação
  await exportarResultados(resultados, arquivoSaida, inicioTotal);
}

module.exports = { processarGPS };
