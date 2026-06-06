// src/lib/gps-next/subroutine/process/lerRegistrosCSV.js
const { parse } = require("csv-parse/sync");
const path = require("path");
const fs = require("fs");

/**
 * Lê e valida o arquivo CSV de entrada
 * @returns {Object} - { registros, arquivoSaida } ou { registros: null } em caso de erro
 */
async function lerRegistrosCSV(config, tipoTratado) {
  const escopoSistema = "gps";
  const cfg = config[escopoSistema]?.tipificacoes?.[tipoTratado];

  if (!cfg) {
    console.error(`\n❌ ERRO DE CONFIGURAÇÃO: O mapa de tipificação para "${tipoTratado}" não foi localizado.`);
    return { registros: null };
  }

  const raizProjeto = config.paths?.root || process.cwd();
  const arquivoEntrada = path.join(raizProjeto, cfg.arquivo);
  const arquivoSaida = path.join(raizProjeto, cfg.saida);

  if (!fs.existsSync(arquivoEntrada)) {
    console.error(`❌ Arquivo de entrada não encontrado: ${arquivoEntrada}`);
    return { registros: null };
  }

  const outputDir = path.dirname(arquivoSaida);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let registros;
  try {
    registros = parse(fs.readFileSync(arquivoEntrada, "utf8"), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch (err) {
    console.error(`❌ Erro ao ler CSV: ${err.message}`);
    return { registros: null };
  }

  if (!registros.length) {
    console.log("⚠️ CSV vazio. Nada a processar.");
    return { registros: null };
  }

  console.log(`\n📋 ${tipoTratado.toUpperCase()}: ${registros.length} documentos localizados.`);
  return { registros, arquivoSaida, cfg };
}

module.exports = { lerRegistrosCSV };
