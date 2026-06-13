//fixtures/wfm/wfm-csv.fixtures.ts

import { test as base, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { parseCsv } from '../../utils/csv/csv-parser';
import { CsvWriter } from '../../utils/csv/csv-writer';
import { WfmWorkOrderPage } from '../../pages/wfm/wfm-work-order.page';

type WfmRecord = {
  id_ordem: string;
  cpf: string;
  nome: string;
  status: string;
  data: string;
  tipo: string;
  escritorio: string;
  area_telefonica: string;
  protocolo: string;
  segmento: string;
  produto: string;
  rede_acesso: string;
  tecnologia_acesso: string;
  cidade: string;
  estado: string;
  bairro: string;
  endereco: string;
  olt: string;
  data_pendencia: string;
  motivo_pendencia: string;
  erro: string;
};

type WfmFixtures = {
  wfmInputRecords: any[];
  wfmOutputPath: string;
  wfmCsvWriter: CsvWriter;
  wfmPage: WfmWorkOrderPage;
  wfmConfig: {
    urlBase: string;
    urlCheck: string;
    campos: any;
  };
};

export const test = base.extend<WfmFixtures>({
  wfmInputRecords: async ({}, use) => {
    await test.step('Carregar CSV de entrada', async () => {
      const inputFile = process.env.WFM_INPUT || './test-data/wfm/input.csv';
      
      if (!fs.existsSync(inputFile)) {
        throw new Error(`Arquivo de entrada não encontrado: ${inputFile}`);
      }
      
      const content = fs.readFileSync(inputFile, 'utf8');
      const records = parseCsv(content, {
        columns: true,
        skipEmptyLines: true,
        trim: true
      });
      
      await use(records);
    });
  },

  wfmOutputPath: async ({}, use) => {
    const outputPath = process.env.WFM_OUTPUT || './test-results/wfm/output.csv';
    const dir = path.dirname(outputPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    await use(outputPath);
  },

  wfmCsvWriter: async ({ wfmOutputPath }, use) => {
    const writer = new CsvWriter({
      path: wfmOutputPath,
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
        { id: 'data_pendencia', title: 'DATA_PENDENCIA' },
        { id: 'motivo_pendencia', title: 'MOTIVO_PENDENCIA' },
        { id: 'erro', title: 'ERRO' }
      ]
    });
    
    await use(writer);
  },

  wfmPage: async ({ page }, use) => {
    await use(new WfmWorkOrderPage(page));
  },

  wfmConfig: async ({}, use) => {
    await use({
      urlBase: process.env.WFM_URL_BASE || 'http://appwfm.gvt.net.br',
      urlCheck: process.env.WFM_URL_CHECK || '/wfm-search/consultar.xhtml',
      campos: {
        cpf: ['#form:cpf', '[id*="cpf"]'],
        nome: ['#form:nome', '[id*="nome"]'],
        status: ['#form:status', '[id*="status"]'],
        data: ['#form:data', '[id*="data"]'],
        tipo: ['#form:tipo', '[id*="tipo"]'],
        escritorio: ['#form:escritorio', '[id*="escritorio"]'],
        area_telefonica: ['#form:area', '[id*="area"]'],
        protocolo: ['#form:protocolo', '[id*="protocolo"]'],
        segmento: ['#form:segmento', '[id*="segmento"]'],
        produto: ['#form:produto', '[id*="produto"]'],
        rede_acesso: ['#form:rede', '[id*="rede"]'],
        tecnologia_acesso: ['#form:tecnologia', '[id*="tecnologia"]'],
        cidade: ['#form:cidade', '[id*="cidade"]'],
        estado: ['#form:estado', '[id*="estado"]'],
        bairro: ['#form:bairro', '[id*="bairro"]'],
        endereco: ['#form:endereco', '[id*="endereco"]'],
        olt: ['#form:olt', '[id*="olt"]']
      }
    });
  },
});

export { expect } from '@playwright/test';
