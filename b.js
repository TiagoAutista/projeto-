{
  "browser": {
    "usarCDP": true,
    "portaCDP": 9222,
    "headless": false
  },
  "timeouts": {
    "navegacao": 60000,
    "elemento": 30000,
    "ajax": 10000
  },
  "delays": {
    "entreDocumentos": 1500,
    "posLogin": 2000
  },
  "wfm": {
    "urlBase": "http://appwfm.gvt.net.br/wfm-search/",
    "urlCheck": "detalhesWorkOrder.xhtml",
    "cookies": "./src/config/data/state/wfm-cookies.json",
    "seletorLista": ".ui-selectonemenu-item, .ui-selectonemenu-list-item",
    "campos": {
      "cpf": [
        "[id*='val_documento']", 
        "[id*='documento']", 
        "[id*='cpf']", 
        ".ui-panelgrid td [id*='val_']", 
        "#val_documento"
      ],
      "nome": ["[id*='val_nome']", "[id*='nome']", "[id$='val_nome']"],
      "status": ["[id*='val_status']", "[id*='situacao']", ".status-wo"],
      "data": ["[id*='val_dataCriacao']", "[id*='data']", "[id*='criacao']"],
      "tipo": ["[id*='val_woi_type']", "[id*='tipo']", "[id*='woi']"],
      "escritorio": ["[id*='val_service_officer']", "[id*='escritorio']", "[id*='officer']"],
      "area_telefonica": ["[id*='val_phone_area']", "[id*='area']", "[id*='phone']"],
      "protocolo": ["[id*='val_protocolo']", "[id*='val_protocolo']", "[id*='value']"],
      "segmento": ["[id*='val_segmento']", "[id*='segmento']", "[id*='value']"],
      "produto": ["[id*='val_produto']", "[id*='produto']", "[id*='value']"],
      "rede_acesso": ["[id*='val_rede_de_acesso']", "[id*='rede_acesso']", "[id*='value']"],
      "tecnologia_acesso": ["[id*='val_tecnologia_acesso']", "[id*='tecnologia_acesso']", "[id*='value']"],
      "cidade": ["[id*='val_city']", "[id*='city]", "[id*='value']"],
      "estado": ["[id*='val_estado']", "[id*='estado']", "[id*='value']"],
      "bairro": ["[id*='val_bairro']", "[id*='bairro']", "[id*='value']"],
      "endereco": ["[id*='val_street']", "[id*='street']", "[id*='value']"],
      "olt": ["[id*='val_olt']", "[id*='olt']", "[id*='value']"]
    }
  },

  "gps": {
    "urlBase": "http://redecorp.br",
    "urlCheck": "atendimento/perfil.jsf",
    "cookies": "./src/config/data/state/gps-cookies.json",
    "modoDiagnostico": "auto",
    "debug": {
      "pausarLoginManual": true,
      "pausarAntesProcessar": false,
      "pausarAntesTipificar": false,
      "pausarEmErro": true
    },
    "regrasDiagnostico": {
      "responderSimSeInclude": ["instalação", "instalacao", "ativar", "nova ordem", "criar", "proceder"],
      "responderNaoSeInclude": ["cancelar", "encerrar", "finalizar", "não", "nao", "recusar"]
    },
    "tipificacoes": {
      "unidade": {
        "arquivo": "input/unidade.csv",
        "saida": "output/resultado_unidade.csv",
        "itens": ["Área Regional", "Temas Específicos", "Teste Final Regionais"],
        "seletorLista": ".ui-selectonemenu-item, .ui-selectonemenu-list-item, li.ui-selectlistbox-item",
        "seletorLabel": "[id='formPainelSelecaoTipificacao:outputPerguntaTipo']"
      },
      "grupo": {
        "arquivo": "input/grupo.csv",
        "saida": "output/resultado_grupo.csv",
        "itens": ["Grupo A", "Subgrupo B", "Categoria C"],
        "seletorLista": ".ui-selectonemenu-item, li.ui-selectlistbox-item",
        "seletorLabel": "[id*='outputPerguntaTipo']"
      }
    }
  }

}
