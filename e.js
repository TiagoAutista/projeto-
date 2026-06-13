//tests/wfm/workorder-extraction.spec.ts
import { test, expect } from '../../fixtures/wfm.fixtures';
import { CSVHandler } from '../../utils/wfm/csv-handler';

test.describe('WFM Work Order Extraction', () => {
  test('deve processar todas as Work Orders do CSV de entrada', async ({ wfmPage, wfmConfig }) => {
    // Validação de configuração
    test.skip(!wfmConfig.urlBase.startsWith('http'), 'URL base inválida');
    
    console.log(`\n📡 [WFM] Iniciando processamento`);
    console.log(`   📥 Entrada: ${wfmConfig.arquivoEntrada}`);
    console.log(`   📤 Saída: ${wfmConfig.arquivoSaida}`);

    // Lê CSV de entrada
    const registros = CSVHandler.ler(wfmConfig.arquivoEntrada);
    
    if (registros.length === 0) {
      console.log('⚠️ CSV de entrada vazio');
      return;
    }

    console.log(`\n📋 Processando ${registros.length} Work Order(s)...`);
    const resultados: Record<string, any>[] = [];

    // Processa cada Work Order
    for (let i = 0; i < registros.length; i++) {
      const reg = registros[i];
      const idWo = reg.ID_URL || reg.id_wo || reg.ordem || reg.ID || reg.WO;
      
      if (!idWo || String(idWo).trim() === '') {
        console.log(`⚠️ [${i + 1}] Linha sem ID, pulando...`);
        continue;
      }

      const idWoStr = String(idWo).trim();
      console.log(`\n[${i + 1}/${registros.length}] 🔍 WO: ${idWoStr}`);

      const dados: Record<string, any> = {
        id_ordem: idWoStr,
        cpf: 'N/A',
        nome: '',
        status: '',
        data: '',
        tipo: '',
        escritorio: '',
        area_telefonica: '',
        protocolo: '',
        segmento: '',
        produto: '',
        rede_acesso: '',
        tecnologia_acesso: '',
        cidade: '',
        estado: '',
        bairro: '',
        endereco: '',
        olt: '',
        data_pendencia: '',
        motivo_pendencia: '',
        erro: '',
      };

      try {
        // Monta URL
        const url = `${wfmConfig.urlBase}${wfmConfig.urlCheck || ''}?wo=${idWoStr}`;
        console.log(`   🌐 Navegando: ${url}`);

        // Navega para Work Order
        await wfmPage.navegarParaWO(url);

        // Verifica sessão
        const sessaoExpirada = await wfmPage.verificarSessaoExpirada();
        if (sessaoExpirada) {
          throw new Error('Sessão expirada. Faça login novamente.');
        }

        // Extrai dados
        const extraido = await wfmPage.extrairDados(wfmConfig.campos);
        Object.assign(dados, extraido);

        console.log(`   ✅ CPF: ${dados.cpf}`);
        if (dados.nome) console.log(`   ✅ Nome: ${dados.nome}`);

      } catch (err: any) {
        console.error(`   ❌ ${err.message}`);
        dados.erro = err.message;
      }

      resultados.push(dados);
    }

    // Gera CSV de saída
    const cabecalhos = [
      { id: 'id_ordem', titulo: 'ID_ORDEM' },
      { id: 'cpf', titulo: 'CPF_CLIENTE' },
      { id: 'nome', titulo: 'NOME' },
      { id: 'status', titulo: 'STATUS' },
      { id: 'data', titulo: 'DATA_ABERTURA' },
      { id: 'tipo', titulo: 'TIPO' },
      { id: 'escritorio', titulo: 'ESCRITORIO' },
      { id: 'area_telefonica', titulo: 'AREA_TELEFONICA' },
      { id: 'protocolo', titulo: 'PROTOCOLO' },
      { id: 'segmento', titulo: 'SEGMENTO' },
      { id: 'produto', titulo: 'PRODUTO' },
      { id: 'rede_acesso', titulo: 'REDE_ACESSO' },
      { id: 'tecnologia_acesso', titulo: 'TECNOLOGIA_ACESSO' },
      { id: 'cidade', titulo: 'CIDADE' },
      { id: 'estado', titulo: 'ESTADO' },
      { id: 'bairro', titulo: 'BAIRRO' },
      { id: 'endereco', titulo: 'ENDERECO' },
      { id: 'olt', titulo: 'OLT' },
      { id: 'data_pendencia', titulo: 'DATA_PENDENCIA' },
      { id: 'motivo_pendencia', titulo: 'MOTIVO_PENDENCIA' },
      { id: 'erro', titulo: 'ERRO' },
    ];

    CSVHandler.escrever(wfmConfig.arquivoSaida, resultados, cabecalhos);

    const sucesso = resultados.filter(r => 
      !r.erro && r.cpf !== 'NAO_VISIVEL' && r.cpf !== 'N/A'
    ).length;

    console.log(`\n💾 CSV gerado com sucesso!`);
    console.log(`   ✅ ${sucesso} registro(s) extraído(s)`);
    console.log(`   ❌ ${resultados.length - sucesso} com erro ou não encontrado(s)`);
  });

  test('deve abrir WFM para inspeção manual', async ({ page, wfmConfig }) => {
    const url = `${wfmConfig.urlBase}${wfmConfig.urlCheck || ''}`;
    console.log(`\n🔍 Abrindo WFM para inspeção: ${url}`);

    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });

    console.log('✅ Página carregada.');
    console.log('💡 Use F12 para inspecionar elementos.');
    
    // Mantém navegador aberto para inspeção
    await page.waitForTimeout(60000); // 1 minuto para inspeção
  });
});
