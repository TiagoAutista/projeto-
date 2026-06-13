# =====================================================
# 🌐 CONFIGURAÇÃO DE CONEXÃO DO NAVEGADOR
# =====================================================

# Modo de conexão: 'connect' (Chrome existente) ou 'launch' (novo Chrome)
# Recomendado: 'connect' para testes, 'launch' para produção agendada
BROWSER_MODE=connect

# Porta do Chrome com debug remoto (usada apenas se BROWSER_MODE=connect)
BROWSER_DEBUG_PORT=9222

# Caminho do Chrome (opcional, usado apenas se BROWSER_MODE=launch)
# CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe

# =====================================================
# 📡 WFM - Work Order Management (GVT/Vivo)
# =====================================================
WFM_URL_BASE=http://appwfm.gvt.net.br/wfm-search
WFM_URL_CHECK=/detalhesWorkOrder.xhtml
WFM_INPUT=./src/config/data/wfm/input/entrada.csv
WFM_OUTPUT=./src/config/data/wfm/output/saida.csv
COOKIES_WFM=./src/config/data/state/wfm-cookies.json

# =====================================================
# 🛰️ GPS - Sistema de Tipificação (Redecorp)
# =====================================================
GPS_URL_BASE=http://gps.redecorp.br/gps/atendimento
GPS_URL_CHECK=/perfil.jsf
GPS_SEARCH_PATH=/index.jsf
COOKIES_GPS=./src/config/data/state/gps-cookies.json
GPS_UNIDADE_INPUT=./src/config/data/gps/input/unidade_entrada.csv
GPS_UNIDADE_OUTPUT=./src/config/data/gps/output/unidade_saida.csv
GPS_GRUPO_INPUT=./src/config/data/gps/input/grupo_entrada.csv
GPS_GRUPO_OUTPUT=./src/config/data/gps/output/grupo_saida.csv
GPS_SELETOR_LISTA=.ui-selectlistbox-item
GPS_SELETOR_LABEL=#formPainelSelecaoTipificacao\\:outputPerguntaTipo

# =====================================================
# ⏱️ Timeouts e Delays
# =====================================================
TIMEOUT_NAVEGACAO=15000
TIMEOUT_ELEMENTO=5000
TIMEOUT_CLIQUE=5000
DELAY_ENTRE_ACOES=500
DELAY_ENTRE_DOCUMENTOS=200

# =============================================================================
# 🗄️ Siebel CRM - Configurações
# =============================================================================

SIEBEL_URL_BASE=http://gpscrm.gvt.com.br/gps/crm/atendimento/index.jsf
SIEBEL_URL_CHECK=?documento=

SIEBEL_UNIDADE_INPUT=./src/config/data/siebel/input/unidade_entrada.csv
SIEBEL_UNIDADE_OUTPUT=./src/config/data/siebel/output/unidade_saida.csv
SIEBEL_GRUPO_INPUT=./src/config/data/siebel/input/grupo_entrada.csv
SIEBEL_GRUPO_OUTPUT=./src/config/data/siebel/output/grupo_saida.csv

# Performance
SIEBEL_MODO_RAPIDO=true

# Debug/Pausas
SIEBEL_PAUSAR_ANTES_PROCESSAR=true
SIEBEL_PAUSAR_ANTES_TIPIFICAR=true
SIEBEL_PAUSAR_EM_ERRO=true
SIEBEL_LOG_PAUSAS=false

# 🚀 CONTROLE DE FLUXO DO ROBÔ GPS
GPS_PAUSAR_ANTES_PROCESSAR=false
GPS_PAUSAR_ANTES_TIPIFICAR=true
GPS_PAUSAR_EM_ERRO=true
GPS_LOG_PAUSAS=false
