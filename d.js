//fixtures/wfm.fixtures.ts

import { test as base } from '@playwright/test';
import { WFMWorkOrderPage } from '../pages/wfm/wfm-workorder.page';

type WFMFixtures = {
  wfmPage: WFMWorkOrderPage;
  wfmConfig: {
    urlBase: string;
    urlCheck?: string;
    campos: Record<string, string | string[]>;
    arquivoEntrada: string;
    arquivoSaida: string;
  };
};

export const test = base.extend<WFMFixtures>({
  wfmPage: async ({ page }, use) => {
    const wfmPage = new WFMWorkOrderPage(page);
    await use(wfmPage);
  },

  wfmConfig: async ({}, use) => {
    const config = {
      urlBase: process.env.WFM_URL_BASE || 'http://appwfm.gvt.net.br',
      urlCheck: process.env.WFM_URL_CHECK || '/wfm-search/check.xhtml',
      campos: {
        cpf: ['#form:cpfInput', '[id*="cpf"]'],
        nome: ['#form:nomeInput', '[id*="nome"]'],
        status: ['#form:statusInput', '[id*="status"]'],
        data: ['#form:dataInput', '[id*="data"]'],
        tipo: ['#form:tipoInput', '[id*="tipo"]'],
        escritorio: ['#form:escritorioInput', '[id*="escritorio"]'],
        area_telefonica: ['#form:areaInput', '[id*="area"]'],
        protocolo: ['#form:protocoloInput', '[id*="protocolo"]'],
        segmento: ['#form:segmentoInput', '[id*="segmento"]'],
        produto: ['#form:produtoInput', '[id*="produto"]'],
        rede_acesso: ['#form:redeInput', '[id*="rede"]'],
        tecnologia_acesso: ['#form:tecnologiaInput', '[id*="tecnologia"]'],
        cidade: ['#form:cidadeInput', '[id*="cidade"]'],
        estado: ['#form:estadoInput', '[id*="estado"]'],
        bairro: ['#form:bairroInput', '[id*="bairro"]'],
        endereco: ['#form:enderecoInput', '[id*="endereco"]'],
        olt: ['#form:oltInput', '[id*="olt"]'],
      },
      arquivoEntrada: process.env.WFM_INPUT || './data/wfm/input.csv',
      arquivoSaida: process.env.WFM_OUTPUT || './data/wfm/output.csv',
    };

    await use(config);
  },
});

export { expect } from '@playwright/test';
