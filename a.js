// src/lib/gps-next/subroutine/process/processarGPS.js
const { pausaInterativa, delay, aguardarPrimeFaces } = require("../../../../utils/helpers");
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

      // C. Tipificação e Diagnóstico (Leitura)
      await aplicarTipificacao(page, cfg);
      await executarDiagnosticoOrdem(page, config, rl);      

      // D. FINALIZAÇÃO E REGISTRO (Código Blindado contra "No element found")
      console.log("\n      💾 Finalizando e registrando o atendimento...");
      
      // Seletor por atributo é mais seguro que #id com escape (\:) no Puppeteer/JSF
      const seletorBotaoRegistrar = 'button[id="formSelecaoResultadoAtendimento:j_idt1853"]';
      
      try {
        // 1. Aguarda o botão existir no DOM
        await page.waitForSelector(seletorBotaoRegistrar, { timeout: 10000 });
        
        // 2. Captura o elemento
        const btnRegistrar = await page.$(seletorBotaoRegistrar);
        
        if (btnRegistrar) {
          // 3. Rola a tela até o botão ficar visível no centro (CRUCIAL)
          await btnRegistrar.scrollIntoView({ block: 'center', behavior: 'smooth' });
          await delay(800); // Pausa para a animação de rolagem terminar
          
          // 4. Clica no botão
          await btnRegistrar.click();
          console.log("      ✅ Clique em 'Registrar Atendimento' realizado com sucesso.");
        } else {
          throw new Error("Elemento do botão encontrado no DOM, mas não foi possível interagir.");
        }
      } catch (err) {
        console.error(`      ❌ Falha ao encontrar ou clicar no botão de registro: ${err.message}`);
        throw err; // Repassa o erro para o bloco catch principal do loop
      }

      // 5. Aguarda o processamento do servidor (AJAX)
      await aguardarPrimeFaces(page, 5000);
      await delay(1500);

      // 6. Blindagem: Fecha modais de "Aviso" ou "Confirmação" se aparecerem
      try {
        // Tenta fechar o modal de Aviso (OK)
        const modalAvisoOk = await page.$('#formExecucaoGrupoDiagnostico\\:j_idt605');
        if (modalAvisoOk && await modalAvisoOk.isVisible()) {
          await modalAvisoOk.click();
          await aguardarPrimeFaces(page, 3000);
          console.log("      ✅ Modal de 'Aviso' fechado automaticamente.");
        }
        
        // (Opcional) Se houver um botão de confirmação genérico, pode ser adicionado aqui
      } catch {
        // Se os modais não existirem, ignora e segue o fluxo
      }

      // Atualiza status para sucesso se chegou até aqui sem erros
      dados.status = "SUCESSO";
      dados.tipificacao = cfg.itens ? cfg.itens.join(" > ") : "N/A";

      // E. Pausa manual de sucesso (se configurada)
      if (dados.status === "SUCESSO") {
        console.log("\n===============================================================================");
        console.log(`🛑 PAUSA OBRIGATÓRIA - CPF Validado e Registrado: ${docLimpo}`);
        console.log("===============================================================================");
        await new Promise(resolve => rl.question('\n   👉 Trate a ordem na tela e pressione [ENTER] para o próximo... ', resolve));
      }
      
    } catch (err) {
      console.error(`\n      ❌ Falha operacional: ${err.message}`);
      dados.erro = err.message;
      dados.status = "ERRO";
      
      await pausaInterativa(rl, config, "gps", "pausarEmErro", "⚠️  ERRO NO PROCESSAMENTO", [
        `❌ ${err.message}`
      ], `Documento: ${docLimpo}`);
    }

    resultados.push(dados);
  }

  // 4. Exportação
  await exportarResultados(resultados, arquivoSaida, inicioTotal);
}

module.exports = { processarGPS };
