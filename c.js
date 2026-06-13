//tests/wfm/functional/wfm-csv-processing.spec.ts

import { test, expect } from '../../../fixtures/wfm/wfm-csv.fixtures';

test.describe('WFM - Processamento em Lote de Work Orders', () => {
  test('deve processar todas as WOs do CSV e gerar output', async ({ 
    wfmPage, 
    wfmInputRecords, 
    wfmCsvWriter,
    wfmConfig 
  }) => {
    const resultados: any[] = [];

    await test.step('Processar cada Work Order', async () => {
      for (let i = 0; i < wfmInputRecords.length; i++) {
        await test.step(`WO ${i + 1}/${wfmInputRecords.length}`, async () => {
          const reg = wfmInputRecords[i];
          const idWo = reg.ID_URL || reg.id_wo || reg.ordem || reg.ID || reg.WO;
          
          if (!idWo || String(idWo).trim() === '') {
            test.info().annotations.push({
              type: 'warning',
              description: `Linha ${i + 1} sem ID, pulando...`
            });
            return;
          }

          const idWoStr = String(idWo).trim();
          console.log(`\n[${i + 1}/${wfmInputRecords.length}] 🔍 WO: ${idWoStr}`);

          const dados: any = {
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
            erro: ''
          };

          try {
            await test.step('Navegar para Work Order', async () => {
              const url = `${wfmConfig.urlBase}${wfmConfig.urlCheck}?wo=${idWoStr}`;
              console.log(`   🌐 Navegando: ${url}`);
              await wfmPage.goto(url);
            });

            await test.step('Aguardar carregamento da página', async () => {
              await wfmPage.waitForPageLoad();
            });

            await test.step('Verificar sessão', async () => {
              const sessionExpired = await wfmPage.isSessionExpired();
              if (sessionExpired) {
                throw new Error('Sessão expirada. Faça login novamente.');
              }
            });

            await test.step('Extrair dados da página', async () => {
              const extraido = await wfmPage.extrairDados(wfmConfig.campos);
              Object.assign(dados, extraido);
              console.log(`   ✅ CPF: ${dados.cpf}`);
              if (dados.nome) console.log(`   ✅ Nome: ${dados.nome}`);
            });

          } catch (err: any) {
            console.error(`   ❌ ${err.message}`);
            dados.erro = err.message;
          }

          resultados.push(dados);

          // ✅ Delay usando waitForLoadState ao invés de waitForTimeout
          if (i < wfmInputRecords.length - 1) {
            await wfmPage.page.waitForLoadState('networkidle');
          }
        });
      }
    });

    await test.step('Gerar CSV de saída', async () => {
      await wfmCsvWriter.writeRecords(resultados);
    });

    await test.step('Validar resultados', async () => {
      const sucesso = resultados.filter(r => 
        !r.erro && 
        r.cpf !== 'FALHA_VALIDACAO_WFM' && 
        r.cpf !== 'N/A'
      ).length;

      console.log(`\n💾 CSV gerado com sucesso!`);
      console.log(`   ✅ ${sucesso} registro(s) extraído(s)`);
      console.log(`   ❌ ${resultados.length - sucesso} com erro`);

      // ✅ Assertions com auto-retry do Playwright
      expect(sucesso).toBeGreaterThan(0);
      expect(resultados.length).toBe(wfmInputRecords.length);
    });
  });

  test('deve validar CPF extraído com algoritmo Módulo 11', async ({ wfmPage, wfmConfig }) => {
    await test.step('Navegar para WO de teste', async () => {
      const url = `${wfmConfig.urlBase}${wfmConfig.urlCheck}?wo=TEST123`;
      await wfmPage.goto(url);
      await wfmPage.waitForPageLoad();
    });

    await test.step('Extrair e validar CPF', async () => {
      const dados = await wfmPage.extrairDados(wfmConfig.campos);
      
      // ✅ Assertions nativas do Playwright
      await expect(dados.cpf).not.toBe('FALHA_VALIDACAO_WFM');
      await expect(dados.cpf).toMatch(/^\d{11}$|^\d{3}\.\d{3}\.\d{3}-\d{2}$/);
    });
  });
});
