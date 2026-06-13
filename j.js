// src/lib/wfm.js - [WFM] Extração de dados de Work Orders (GVT/Vivo)
// ============================================================================
const { parse } = require('csv-parse/sync');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs');

const { extrairTexto } = require("../utils/helpers");

// [WFM] Extrai campos da página usando seletores configurados + fallbacks // Totalmente Blindado contra JSF/PrimeFaces
async function extrairDadosWFM(page, campos) {
  return await page.evaluate((cps) => {
    
    // 🔥 BLINDAGEM DE ESCOPO: Localiza o container central da página para evitar ler o cabeçalho do operador
    const escopoCentral = document.querySelector('#content') || document.querySelector('#main') || document.body;

    // Helper para buscar por múltiplos seletores ou label
    const get = (sels, labelTxt) => {
      if (!sels) return '';
      
      // 1. Tenta seletores CSS primeiro (Cada tentativa envelopada de forma independente)
      for (const s of (Array.isArray(sels) ? sels : [sels])) {
        try {
          let el = null;
          
          // 🔥 BLINDAGEM JSF: Se o seletor for um ID simples (#...) e contiver dois-pontos (common no PrimeFaces),
          // usamos getElementById diretamente para evitar o SyntaxError do querySelector.
          if (s.startsWith('#') && s.includes(':')) {
            el = document.getElementById(s.substring(1));
          } else {
            el = escopoCentral.querySelector(s);
          }

          if (el) {
            const val = ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) 
              ? el.value 
              : el.innerText;
            if (val && val.replace(/\s+/g, ' ').trim()) return val.replace(/\s+/g, ' ').trim();
          }
        } catch (e) {
          // Captura falhas de seletores inválidos sem quebrar a execução dos próximos passos
        }
      }
      
      // 2. Fallback: busca pelo texto do label (Restrito estritamente ao escopo central)
      if (labelTxt) {
        const labels = Array.from(escopoCentral.querySelectorAll('label'));
        const lbl = labels.find(l => 
          l.innerText && l.innerText.trim().toLowerCase().includes(labelTxt.toLowerCase())
        );
        
        if (lbl) {
          // Cenário A: O input/valor está aninhado DENTRO da própria tag label
          const innerEl = lbl.querySelector('input, select, textarea');
          if (innerEl && innerEl.value && innerEl.value.trim()) return innerEl.value.trim();

          // Cenário B: Vinculado estritamente por ID (Nativamente seguro contra dois-pontos do JSF)
          const idRef = lbl.htmlFor || lbl.getAttribute('for');
          if (idRef) {
            const ref = document.getElementById(idRef);
            if (ref) {
              const valRef = ['INPUT', 'SELECT', 'TEXTAREA'].includes(ref.tagName) ? ref.value : ref.innerText;
              if (valRef && valRef.trim()) return valRef.trim();
            }
          }

          // Cenário C: O elemento com o valor é o próximo irmão do label no DOM
          if (lbl.nextElementSibling) {
            const nEl = lbl.nextElementSibling;
            const valIrmao = ['INPUT', 'SELECT', 'TEXTAREA'].includes(nEl.tagName) ? nEl.value : nEl.innerText;
            if (valIrmao && valIrmao.trim()) return valIrmao.trim();
          }
        }
      }
      return '';
    };
    
    // Helpers internos para validação e limpeza
    const limparCPF = (txt) => String(txt || '').replace(/\D/g, '');
    
    // Algoritmo matemático oficial de validação de CPF (Módulo 11) - Meta de Segurança de Dados
    const ehCpfValido = (num) => {
      if (num.length !== 11 || /^(\d)\1{10}$/.test(num)) return false;
      let soma = 0, resto;
      for (let i = 1; i <= 9; i++) soma += parseInt(num.substring(i - 1, i)) * (11 - i);
      resto = (soma * 10) % 11;
      if (resto === 10 || resto === 11) resto = 0;
      if (resto !== parseInt(num.substring(9, 10))) return false;
      soma = 0;
      for (let i = 1; i <= 10; i++) soma += parseInt(num.substring(i - 1, i)) * (12 - i);
      resto = (soma * 10) % 11;
      if (resto === 10 || resto === 11) resto = 0;
      return resto === parseInt(num.substring(10, 11));
    };

    // Extrai CPF com fallback inteligente por regex estruturada
    let cpf = get(cps.cpf, 'cpf');
    let cpfNumeros = limparCPF(cpf);
    
    // Se não encontrou ou o que veio falhou no Módulo 11 (Evita confundir com Telefone de 11 dígitos)
    if (!ehCpfValido(cpfNumeros)) {
      const regexCPF = /(?:\d{3}\.\d{3}\.\d{3}-\d{2})|(?:\b\d{11}\b)/;
      
      // 🔥 REFACTOR: A busca por Regex agora varre apenas o texto do escopo central (#content/#main)
      // Bloqueia completamente a captura do CPF do operador logado exibido no topo do portal
      const match = escopoCentral.innerText.match(regexCPF);
      
      if (match && match[0] && ehCpfValido(limparCPF(match[0]))) {
        cpf = match[0].replace(/\s+/g, ' ').trim();
      } else {
        cpf = 'FALHA_VALIDACAO_WFM';
      }
    } else {
      cpf = cpf.replace(/\s+/g, ' ').trim();
    }

    // 🔥 NOVO HELPER PARA CAPTURA DAS GRIDS EM LOTE (Evita SyntaxError de dois-pontos)
    const extrairTabelaFilhos = (seletorClasse, indices) => {
      const lista = [];
      const tabela = escopoCentral.querySelector(seletorClasse);
      if (!tabela) return lista;
      
      tabela.querySelectorAll('tbody tr, .ui-datatable-data tr').forEach(tr => {
        const tds = Array.from(tr.children);
        if (tds.length >= Object.keys(indices).length && !tr.innerText.toLowerCase().includes('nenhum registro')) {
          const obj = {};
          Object.entries(indices).forEach(([key, index]) => {
            obj[key] = tds[index]?.innerText?.replace(/\s+/g, ' ').trim() || '';
          });
          lista.push(obj);
        }
      });
      return lista;
    };

    // 1. Captura a tabela de pendências diretamente pelo ID exato do PrimeFaces
    const listaPendencias = extrairTabelaFilhos('[id$="issuesTable"]', { data: 2, motivo: 3 });

    // 2. Pega a primeira linha ou joga vazio se não achar pendências
    const pendenciaMaisRecente = listaPendencias[0] || { data: '', motivo: '' };

    // 📊 CONSTRUÇÃO DO DICTIONARY EXPANDIDO (Mantendo suas 7 chaves intactas no escopo base)
    return {
      // Seus dados fundamentais originais (Funcionamento normal confirmado)
      cpf: cpf,
      nome: get(cps.nome, 'nome'),
      status: get(cps.status, 'status'),
      data: get(cps.data, 'data'),
      tipo: get(cps.tipo, 'tipo'),
      escritorio: get(cps.escritorio, 'escritorio'),
      area_telefonica: get(cps.area_telefonica, 'area'),

      // 🔥 EXPANSÃO DA FICHA TÉCNICA (Padronizado seguindo a primeira ocorrência do cps)
      protocolo: get(cps.protocolo, 'protocolo'),
      segmento: get(cps.segmento, 'segmento'),
      produto: get(cps.produto, 'produto'),
      rede_acesso: get(cps.rede_acesso, 'rede de acesso'),
      tecnologia_acesso: get(cps.tecnologia_acesso, 'tecnologia acesso'),
      cidade: get(cps.cidade, 'cidade'),
      estado: get(cps.estado, 'estado'),
      bairro: get(cps.bairro, 'bairro'),
      endereco: get(cps.endereco, 'endereco'),
      olt: get(cps.olt, 'olt'),
      
      // Dados da pendência capturados com precisão cirúrgica
      data_pendencia: pendenciaMaisRecente.data,
      motivo_pendencia: pendenciaMaisRecente.motivo,

      // 🔥 EXTRAÇÃO EM LOTE DAS GRIDS DE PRODUTOS E ATIVIDADES
      produtos: extrairTabelaFilhos('.ui-datatable:not([id$="issuesTable"])', { id: 0, nome: 1, acao: 2 }),
      atividades: extrairTabelaFilhos('.tabela-atividades', { id: 0, dataCriacao: 1, dataAgendamento: 2, periodo: 3, tecnico: 4, origem: 5, dataEncerramento: 6, status: 7 }),
      historico: extrairTabelaFilhos('.tabela-historico', { status: 0, dataCriacao: 1 })
    };
  }, campos);


}
module.exports = { extrairDadosWFM };


// [WFM] Aguarda elemento com timeout e busca paralela (Race) // // Foi atualizado
async function aguardarElemento(page, seletores, timeout, descricao = 'elemento') {
  const sels = Array.isArray(seletores) ? seletores : [seletores];

  // Cria uma promessa de espera para cada seletor rodar em paralelo
  const promessas = sels.map(sel => 
    page.waitForSelector(sel, { 
      timeout, 
      visible: true // Garante que o elemento está visível (evita pegar elementos ocultos)
    })
    .then(() => sel) // Se encontrar, retorna qual seletor deu certo
  );

  try {
    // Promise.race faz com que o primeiro seletor que aparecer vença a corrida
    const seletorEncontrado = await Promise.race(promessas);
    // Opcional: console.log(`✓ ${descricao} encontrado via seletor: ${seletorEncontrado}`);
    return true;
  } catch (error) {
    // Se o tempo acabar e nenhum seletor disparar sucesso, cai aqui
    console.warn(`⚠️  Timeout (${timeout}ms) aguardando ${descricao}. Tentando prosseguir...`);
    return false;
  }
}

// 🚀 FUNÇÃO PRINCIPAL: Processa lista de Work Orders // Foi atualizado
async function processarWFM(page, config, rl) {
  const cfg = config?.wfm;
  
  // Garantia inicial de objeto de configuração existente
  if (!cfg) {
    console.error('❌ Configuração WFM (config.wfm) não foi fornecida.');
    return;
  }
  
  console.log(`\n📡 [${cfg.nome || 'WFM Sem Nome'}]`);
  
  // ============================================================================
  // ✅ VALIDAÇÃO DE CONFIGURAÇÃO (FAIL-FAST)
  // ============================================================================
  if (!cfg.urlBase || !cfg.urlBase.startsWith('http')) {
    console.error('❌ WFM_URL_BASE inválida ou não configurada.');
    console.error('💡 Verifique o .env: WFM_URL_BASE=http://gvt.net.br');
    return;
  }
  
  const arquivoEntrada = cfg.arquivoEntrada;
  const arquivoSaida = cfg.arquivoSaida;
  
  if (!arquivoEntrada || typeof arquivoEntrada !== 'string') {
    console.error('❌ WFM_INPUT não configurado corretamente.');
    return;
  }
  if (!arquivoSaida || typeof arquivoSaida !== 'string') {
    console.error('❌ WFM_OUTPUT não configurado corretamente.');
    return;
  }
  
  console.log(`   📥 Entrada: ${arquivoEntrada}`);
  console.log(`   📤 Saída: ${arquivoSaida}`);
  
  // ============================================================================
  // ✅ VERIFICA ARQUIVO DE ENTRADA
  // ============================================================================
  if (!fs.existsSync(arquivoEntrada)) {
    console.error(`\n❌ Arquivo de entrada não encontrado: ${arquivoEntrada}`);
    console.log(`\n💡 Crie o arquivo CSV com uma coluna "ID_URL" ou "id_wo".`);
    return;
  }
  
  // ============================================================================
  // ✅ CRIA PASTA DE SAÍDA
  // ============================================================================
  const outputDir = path.dirname(arquivoSaida);
  console.log(`   📂 Output dir: ${outputDir}`);
  
  if (!fs.existsSync(outputDir)) {
    try {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`   ✅ Pasta criada: ${outputDir}`);
    } catch (err) {
      console.error(`\n❌ Não foi possível criar a pasta de saída: ${outputDir}`);
      console.error(`💡 Erro: ${err.message}`);
      return;
    }
  }
  
  // ============================================================================
  // ✅ LEITURA DO CSV DE ENTRADA
  // ============================================================================
  let registros;
  try {
    const conteudoMaturado = fs.readFileSync(arquivoEntrada, 'utf8');
    registros = parse(conteudoMaturado, { 
      columns: true, 
      skip_empty_lines: true,
      trim: true
    });
  } catch (err) {
    console.error(`❌ Erro ao ler/parsear CSV de entrada: ${err.message}`);
    return;
  }
  
  if (!registros || !registros.length) { 
    console.log('⚠️  CSV de entrada vazio.'); 
    return; 
  }
  
  console.log(`\n📋 Processando ${registros.length} Work Order(s)...`);
  const resultados = [];
  
  // ============================================================================
  // 🔄 LOOP PRINCIPAL: Processa cada Work Order
  // ============================================================================
  for (let i = 0; i < registros.length; i++) {
    const reg = registros[i];
    
    // Extrai ID mapeando os nomes prováveis (removido fallback cego de Object.values)
    const idWo = reg.ID_URL || reg.id_wo || reg.ordem || reg.ID || reg.WO;
    
    if (!idWo || String(idWo).trim() === '') {
      console.log(`⚠️  [${i+1}] Linha sem ID de Ordem mapeado nos cabeçalhos padrão, pulando...`);
      continue;
    }
    
    const idWoStr = String(idWo).trim();
    console.log(`\n[${i+1}/${registros.length}] 🔍 WO: ${idWoStr}`);
    
    const dados = { 
      id_ordem: idWoStr, cpf: 'N/A', nome: '', status: '', data: '', 
      tipo: '', escritorio: '', area_telefonica: '', protocolo: '',
      segmento: '', produto: '', rede_acesso: '', tecnologia_acesso: '',
      cidade: '', estado: '', bairro: '', endereco: '', olt: '', 
      data_pendencia: '', motivo_pendencia: '', erro: '' // ← Inserido aqui
    };
    
    try {
      // Configuração dinâmica de URL
      const url = cfg.getWoUrl 
        ? cfg.getWoUrl(idWoStr) 
        : `${cfg.urlBase}${cfg.urlCheck || ''}?wo=${idWoStr}`;
      
      console.log(`   🌐 Navegando: ${url}`);
      
      if (!url || !url.startsWith('http')) {
        throw new Error(`URL inválida gerada: "${url}"`);
      }
      
      // Navegação com tratamento de timeout configurado com fallback seguro (30s)
      const timeoutNavegacao = config?.timeouts?.navegacao || 30000;
      await page.goto(url, { 
        waitUntil: 'domcontentloaded', 
        timeout: timeoutNavegacao
      });
      
      // Checagem de expiração de sessão
      const currentUrl = page.url().toLowerCase();
      if (currentUrl.includes('login') || currentUrl.includes('autenticacao')) {
        throw new Error('Sessão expirada. Faça login novamente via opção 4 do menu.');
      }
      
      // Fallback para os tempos de delay e elementos (evita quebra por falta de config)
      const timeoutElemento = config?.timeouts?.elemento || 15000;
      const delayDocumentos = config?.delays?.entreDocumentos || 1000;
      const delayAcoes = config?.delays?.entreAcoes || 2000;
      
      // Valida se as funções auxiliares globais existem antes de chamar
      if (typeof aguardarElemento === 'function') {
        await aguardarElemento(page, ['body', '#content', '.main'], timeoutElemento, 'página');
      }
      
      await new Promise(r => setTimeout(r, delayDocumentos));
      
      if (typeof extrairDadosWFM === 'function') {
        const extraido = await extrairDadosWFM(page, cfg.campos);
        Object.assign(dados, extraido);
      } else {
        throw new Error("Função 'extrairDadosWFM' não está definida no escopo global.");
      }
      
      // Logs de sucesso parciais
      console.log(`   ✅ CPF: ${dados.cpf}`);
      if (dados.nome) console.log(`   ✅ Nome: ${dados.nome}`);
      
    } catch (err) {
      console.error(`   ❌ ${err.message}`);
      dados.erro = err.message;
    }
    
    resultados.push(dados);
    
    // Delay controlado entre requisições contra Rate Limiting
    if (i < registros.length - 1) {
      const delayAcoes = config?.delays?.entreAcoes || 2000;
      await new Promise(r => setTimeout(r, delayAcoes));
    }
  }
  
  // ============================================================================
  // 💾 GERAÇÃO DO CSV DE SAÍDA
  // ============================================================================
  try {
    // ✅ REFACTOR: Cabeçalho completo do CSV Writer para suportar a carga máxima da extração
    const csvWriter = createCsvWriter({
      path: arquivoSaida,
      header: [
        { id: 'id_ordem', title: 'ID_ORDEM' },
        { id: 'cpf', title: 'CPF_CLIENTE' },
        { id: 'nome', title: 'NOME' },
        { id: 'status', title: 'STATUS' },
        { id: 'data', title: 'DATA_ABERTURA' },
        { id: 'tipo', title: 'TIPO' },
        { id: 'escritorio', title: 'ESCRITORIO' },
        { id: 'area_telefonica', title: 'AREA_TELEFONICA' },
        { id: 'protocolo', title: 'PROTOCOLO' },
        { id: 'segmento', title: 'SEGMENTO' },
        { id: 'produto', title: 'PRODUTO' },
        { id: 'rede_acesso', title: 'REDE_ACESSO' },
        { id: 'tecnologia_acesso', title: 'TECNOLOGIA_ACESSO' },
        { id: 'cidade', title: 'CIDADE' },
        { id: 'estado', title: 'ESTADO' },
        { id: 'bairro', title: 'BAIRRO' },
        { id: 'endereco', title: 'ENDERECO' },
        { id: 'olt', title: 'OLT' },
        
        // 🔥 AS DUAS NOVAS COLUNAS NO CSV:
        { id: 'data_pendencia', title: 'DATA_PENDENCIA' },
        { id: 'motivo_pendencia', title: 'MOTIVO_PENDENCIA' },
        
        { id: 'erro', title: 'ERRO' }
      ]
    });
    
    await csvWriter.writeRecords(resultados);
    
    const sucesso = resultados.filter(r => !r.erro && r.cpf !== 'NAO_VISIVEL' && r.cpf !== 'N/A').length;
    console.log(`\n💾 "${path.basename(arquivoSaida)}" gerado com sucesso!`);
    console.log(`   ✅ ${sucesso} registro(s) extraído(s)`);
    console.log(`   ❌ ${resultados.length - sucesso} com erro ou não encontrado(s)`);
    
  } catch (err) {
    console.error(`\n❌ Erro ao gerar CSV de saída: ${err.message}`);
  }
}

// 🔍 FUNÇÃO: Abre WFM para inspeção manual (sem processamento)
async function abrirParaInspecaoWFM(page, config) {
  const cfg = config?.wfm;
  
  // Validação inicial do objeto de configuração
  if (!cfg) {
    console.error('❌ Objeto de configuração do WFM não foi fornecido.');
    return;
  }
  
  if (!cfg.urlBase || !cfg.urlBase.startsWith('http')) {
    console.error('❌ WFM_URL_BASE não configurada ou inválida.');
    return;
  }
  
  // Montagem segura da URL tratando barras duplicadas ou ausentes
  let url = cfg.urlBase;
  if (cfg.urlCheck) {
    const sufixo = cfg.urlCheck.startsWith('/') ? cfg.urlCheck : `/${cfg.urlCheck}`;
    // Remove barra no final da urlBase se houver, para evitar duas barras (ex: http://site.com)
    const baseLimpa = cfg.urlBase.endsWith('/') ? cfg.urlBase.slice(0, -1) : cfg.urlBase;
    url = `${baseLimpa}${sufixo}`;
  }
  
  console.log(`\n🔍 Abrindo WFM para inspeção: ${url}`);
  
  try {
    // Fallback seguro caso o timeout não esteja definido na configuração externa
    const timeoutNavegacao = config?.timeouts?.navegacao || 30000;
    
    await page.goto(url, { 
      waitUntil: 'domcontentloaded', 
      timeout: timeoutNavegacao 
    });
    
    console.log('✅ Página carregada.');
    console.log('💡 Use F12 para inspecionar elementos e testar seletores.');
    console.log('💡 Console útil: document.querySelector(\'[id*="cpf"]\')?.value');
    
  } catch (err) {
    console.error(`\n❌ Falha ao carregar a página de inspeção: ${err.message}`);
    console.error('💡 Verifique se você está conectado à VPN da empresa ou se o sistema está online.');
  }
}

// 📦 EXPORTAÇÕES
module.exports = { 
  processarWFM, 
  abrirParaInspecaoWFM,
  // Exporta funções auxiliares para testes
  extrairDadosWFM,
  aguardarElemento
};


TRAsforme esse codigo em um const { chromium } = require('playwright'); sarvar como wfm.js
