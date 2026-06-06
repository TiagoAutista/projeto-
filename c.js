// [CONFIG] Carrega variáveis de ambiente e configurações
require("dotenv").config();
const path = require("path");
const fs = require("fs"); // 🔥 Importado para garantir a criação de pastas estruturais

// ✅ Usa path absoluto para evitar erro de resolução
const configJsonPath = path.join(__dirname, "config.json");
let configJson = {};

// Previne a quebra do robô caso o config.json seja deletado ou esteja mal formatado
try {
  if (fs.existsSync(configJsonPath)) {
    configJson = require(configJsonPath);
  }
} catch {
  console.warn("⚠️ Não foi possível ler o arquivo config.json. Usando fallbacks nativos.");
}

// ============================================================================
// 🔧 HELPERS PARA PARSE DE VARIÁVEIS DE AMBIENTE
// ============================================================================
const parseBool = (envVar, defaultValue) => {
  if (envVar === undefined) return defaultValue;
  return envVar.toLowerCase() === "true";
};

const parseIntWithFallback = (envVar, defaultValue) => {
  const parsed = parseInt(envVar, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Definição prévia dos caminhos base absolutos para uso nos fallbacks dos módulos
const rootDir = path.resolve(__dirname, "../..");
const dataDir = path.resolve(__dirname, "../../data");

// ============================================================================
// ⚙️ CONFIGURAÇÕES PRINCIPAIS
// ============================================================================
module.exports = {
  // ----------------------------------------------------------------------------
  // 🔗 WFM - Workforce Management
  // ----------------------------------------------------------------------------
  wfm: {
    nome: "WFM - Extração de CPF",
    urlBase: process.env.WFM_URL_BASE || "http://gvt.net.br",
    urlCheck: process.env.WFM_URL_CHECK || "?wo=",
    // ✅ Protegido com fallback absoluto caso não configurado no .env
    arquivoEntrada: process.env.WFM_INPUT || path.join(dataDir, "input/wfm_entrada.csv"),
    arquivoSaida: process.env.WFM_OUTPUT || path.join(dataDir, "output/wfm_saida.csv"),
    cookies: process.env.COOKIES_WFM,
    campos: configJson.wfm?.campos || {},
  },

  // ----------------------------------------------------------------------------
  // 🛰️ GPS - Sistema de Tipificação (Atualizado e Blindado)
  // ----------------------------------------------------------------------------
  gps: {
    nome: "GPS - Tipificação",
    // ✅ Corrigido: Fallback padrão com o subdomínio correto para evitar ERR_CONNECTION_REFUSED
    urlBase: process.env.GPS_URL_BASE || "http://redecorp.br",
    // ✅ Corrigido: Alinhado com a rota index.jsf estável do framework JSF
    urlCheck: process.env.GPS_URL_CHECK || "gps/atendimento/index.jsf?documento=",
    cookies: process.env.COOKIES_GPS || path.join(dataDir, "state/gps-cookies.json"),
    
    tipificacoes: {
      unidade: {
        arquivo: process.env.GPS_UNIDADE_INPUT || path.join(dataDir, "input/gps_unidade.csv"),
        itens: configJson.gps?.tipificacoes?.unidade?.itens || [],
        // ✅ Corrigido: Cobertura de seletores triplos para garantir o clique em "Área Regional"
        seletorLista:
          process.env.GPS_SELETOR_LISTA ||
          configJson.gps?.tipificacoes?.unidade?.seletorLista || 
          ".ui-selectonemenu-item, .ui-selectonemenu-list-item, li.ui-selectlistbox-item",
        // ✅ Corrigido: ID exato extraído do HTML do painel de auditoria final
        seletorLabel:
          process.env.GPS_SELETOR_LABEL ||
          configJson.gps?.tipificacoes?.unidade?.seletorLabel || 
          "[id='formPainelSelecaoTipificacao:outputPerguntaTipo']",
        saida: process.env.GPS_UNIDADE_OUTPUT || path.join(dataDir, "output/gps_unidade_saida.csv"),
      },
      grupo: {
        arquivo: process.env.GPS_GRUPO_INPUT || path.join(dataDir, "input/gps_grupo.csv"),
        itens: configJson.gps?.tipificacoes?.grupo?.itens || [],
        seletorLista:
          process.env.GPS_SELETOR_LISTA ||
          configJson.gps?.tipificacoes?.grupo?.seletorLista || 
          ".ui-selectonemenu-item, li.ui-selectlistbox-item, .ui-autocomplete-item",
        seletorLabel:
          process.env.GPS_SELETOR_LABEL ||
          configJson.gps?.tipificacoes?.grupo?.seletorLabel || 
          '[id*="outputPerguntaTipo"]',
        saida: process.env.GPS_GRUPO_OUTPUT || path.join(dataDir, "output/gps_grupo_saida.csv"),
      },
    },
    
    debug: {
      // ✅ Controles lógicos convertidos via parseBool amarrados ao .env
      pausarAntesProcessar: parseBool(process.env.GPS_PAUSAR_ANTES_PROCESSAR, true),
      pausarAntesTipificar: parseBool(process.env.GPS_PAUSAR_ANTES_TIPIFICAR, true),
      pausarEmErro: parseBool(process.env.GPS_PAUSAR_EM_ERRO, true),
      logPausas: parseBool(process.env.GPS_LOG_PAUSAS, false),
    },
  },
  
  // ----------------------------------------------------------------------------
  // 🗄️ Siebel CRM - Sistema alternativo de tipificação
  // ----------------------------------------------------------------------------
  siebel: {
    nome: "Siebel - Tipificação",
    urlBase: process.env.SIEBEL_URL_BASE || 'http://gvt.com.br',
    urlCheck: process.env.SIEBEL_URL_CHECK || '?documento=',
    
    tipificacoes: {
      unidade: {
        arquivo: process.env.SIEBEL_UNIDADE_INPUT || path.join(dataDir, "siebel/input/unidade_entrada.csv"),
        saida: process.env.SIEBEL_UNIDADE_OUTPUT || path.join(dataDir, "siebel/output/unidade_saida.csv"),
        itens: configJson.siebel?.tipificacoes?.unidade?.itens || ['UNIDADE_A', 'UNIDADE_B'],
        seletorLista: configJson.siebel?.tipificacoes?.unidade?.seletorLista || '.ui-selectlistbox-item',
        seletorLabel: configJson.siebel?.tipificacoes?.unidade?.seletorLabel || '[id="formPainel:outputTipo"]'
      },
      grupo: {
        arquivo: process.env.SIEBEL_GRUPO_INPUT || path.join(dataDir, "siebel/input/grupo_entrada.csv"),
        saida: process.env.SIEBEL_GRUPO_OUTPUT || path.join(dataDir, "siebel/output/grupo_saida.csv"),
        itens: configJson.siebel?.tipificacoes?.grupo?.itens || ['GRUPO_X', 'GRUPO_Y'],
        seletorLista: configJson.siebel?.tipificacoes?.grupo?.seletorLista || '.ui-autocomplete-item',
        seletorLabel: configJson.siebel?.tipificacoes?.grupo?.seletorLabel || '[id*="outputTipo"]'
      }
    },
    
    modoRapido: parseBool(process.env.SIEBEL_MODO_RAPIDO, true),
    
    debug: {
      pausarAntesProcessar: parseBool(process.env.SIEBEL_PAUSAR_ANTES_PROCESSAR, true),
      pausarAntesTipificar: parseBool(process.env.SIEBEL_PAUSAR_ANTES_TIPIFICAR, true),
      pausarEmErro: parseBool(process.env.SIEBEL_PAUSAR_EM_ERRO, true),
      logPausas: parseBool(process.env.SIEBEL_LOG_PAUSAS, false)
    }
  },
  
  // ----------------------------------------------------------------------------
  // ⏱️ Timeouts (Otimizados para redes corporativas instáveis)
  // ----------------------------------------------------------------------------
  timeouts: {
    navegacao: parseIntWithFallback(process.env.TIMEOUT_NAVEGACAO, 60000), // Reduzido de 120s para 60s (evita travamento eterno)
    elemento: parseIntWithFallback(process.env.TIMEOUT_ELEMENTO, 20000),
    clique: parseIntWithFallback(process.env.TIMEOUT_CLIQUE, 10000),
    ajax: parseIntWithFallback(process.env.TIMEOUT_AJAX, 15000),
  },

  // ----------------------------------------------------------------------------
  // ⏳ Delays
  // ----------------------------------------------------------------------------
  delays: {
    entreAcoes: parseIntWithFallback(process.env.DELAY_ENTRE_ACOES, 1000),
    entreDocumentos: parseIntWithFallback(process.env.DELAY_ENTRE_DOCUMENTOS, 2000),
    entreTentativas: parseIntWithFallback(process.env.DELAY_ENTRE_TENTATIVAS, 2000),
    posLogin: parseIntWithFallback(process.env.DELAY_POS_LOGIN, 3000),
  },

  // ----------------------------------------------------------------------------
  // 🌐 Browser (Puppeteer CDP)
  // ----------------------------------------------------------------------------
  browser: {
    usarCDP: parseBool(process.env.USAR_CDP, true),
    portaCDP: parseIntWithFallback(process.env.CDP_PORT, 9222),
    headless: parseBool(process.env.HEADLESS, false),
    stealth: parseBool(process.env.STEALTH, true),
    userAgent: process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },

  // ----------------------------------------------------------------------------
  // 🐛 Debug Global
  // ----------------------------------------------------------------------------
  debug: {
    logNavegacao: parseBool(process.env.DEBUG_LOG_NAVEGACAO, false),
    logSeletores: parseBool(process.env.DEBUG_LOG_SELETORES, false),
    salvarScreenshotsErro: parseBool(process.env.DEBUG_SCREENSHOTS_ERRO, true),
    maxTentativas: parseIntWithFallback(process.env.DEBUG_MAX_TENTATIVAS, 3),
  },

  // ----------------------------------------------------------------------------
  // 📁 Paths e Diretórios com Criação Proativa e Automática
  // ----------------------------------------------------------------------------
  paths: (() => {
    const caminhos = {
      root: rootDir,
      src: __dirname,
      config: __dirname,
      data: dataDir,
      input: path.resolve(__dirname, "../../data/input"),
      output: path.resolve(__dirname, "../../data/output"),
      state: path.resolve(__dirname, "../../data/state"),
      logs: path.resolve(__dirname, "../../logs"),
      temp: path.resolve(__dirname, "../../temp"),
    };

    // ✅ GARANTIA ABSOLUTA: Cria fisicamente no HD as pastas estruturais de IO e logs se elas não existirem
    const pastasParaCriar = [caminhos.input, caminhos.output, caminhos.state, caminhos.logs, caminhos.temp];
    for (const pasta of pastasParaCriar) {
      if (!fs.existsSync(pasta)) {
        try {
          fs.mkdirSync(pasta, { recursive: true });
        } catch (err) {
          console.error(`⚠️ Falha preventiva ao gerar diretório estrutural [${pasta}]:`, err.message);
        }
      }
    }
    return caminhos;
  })(),
};
