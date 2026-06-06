// src/lib/gps-next/subroutine/process/exportarResultados.js
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const path = require("path");

/**
 * Gera o arquivo CSV final e imprime o resumo estatístico no console
 */
async function exportarResultados(resultados, arquivoSaida, inicioTotal) {
  console.log("\n\n💾 Compilando e salvando relatório consolidado...");
  
  try {
    const csvWriter = createCsvWriter({
      path: arquivoSaida,
      header: [
        { id: "documento", title: "DOCUMENTO" },
        { id: "tipificacao", title: "TIPIFICACAO" },
        { id: "status", title: "STATUS" },
        { id: "erro", title: "ERRO" },
      ],
    });

    await csvWriter.writeRecords(resultados);

    const sucesso = resultados.filter((r) => r.status === "SUCESSO").length;
    const pendentes = resultados.filter((r) => r.status === "PENDENTE").length;
    const erros = resultados.filter((r) => r.status === "ERRO" || r.status === "ERRO_SESSAO").length;
    const tempoTotal = ((Date.now() - inicioTotal) / 1000).toFixed(1);

    console.log(`\n=============================================================`);
    console.log(`✅ Lote processado e finalizado em ${tempoTotal}s`);
    console.log(`📊 Relatório gerado: "${path.basename(arquivoSaida)}"`);
    console.log(`   👉 Sucessos:  ${sucesso}`);
    console.log(`   👉 Pendentes: ${pendentes}`);
    console.log(`   👉 Falhas:    ${erros}`);
    console.log(`=============================================================\n`);

  } catch (err) {
    console.error(`\n❌ ERRO CRÍTICO AO GRAVAR CSV: ${err.message}`);
    if (err.code === "EBUSY" || err.code === "EPERM") {
      console.error(`💡 DICA: Verifique se o arquivo "${path.basename(arquivoSaida)}" está aberto no Excel.`);
    }
  }
}

module.exports = { exportarResultados };
