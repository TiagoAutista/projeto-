//pages/wfm/wfm-workorder.page.ts


import { Page, Locator } from '@playwright/test';
import { CPFValidator } from '../../utils/wfm/cpf-validator';

/**
 * Page Object Model para Work Orders do WFM
 * Blindado contra JSF/PrimeFaces com IDs dinâmicos
 */
export class WFMWorkOrderPage {
  readonly page: Page;
  
  // Selectores base (adaptáveis)
  readonly contentContainer: Locator;
  readonly issuesTable: Locator;
  
  constructor(page: Page) {
    this.page = page;
    this.contentContainer = page.locator('#content, #main, body').first();
    this.issuesTable = page.locator('[id$="issuesTable"]');
  }

  /**
   * Navega para URL da Work Order
   */
  async navegarParaWO(url: string): Promise<void> {
    await this.page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Aguarda conteúdo carregar (sem setTimeout)
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Verifica se sessão expirou
   */
  async verificarSessaoExpirada(): Promise<boolean> {
    const url = this.page.url().toLowerCase();
    return url.includes('login') || url.includes('autenticacao');
  }

  /**
   * Extrai todos os dados da Work Order
   */
  async extrairDados(campos: Record<string, string | string[]>): Promise<Record<string, any>> {
    return await this.page.evaluate((cps) => {
      // 🔥 BLINDAGEM DE ESCOPO
      const escopoCentral = document.querySelector('#content') || 
                           document.querySelector('#main') || 
                           document.body;

      // Helper para buscar por múltiplos seletores ou label
      const get = (sels: string | string[] | undefined, labelTxt?: string): string => {
        if (!sels) return '';
        
        const seletores = Array.isArray(sels) ? sels : [sels];
        
        // 1. Tenta seletores CSS primeiro
        for (const s of seletores) {
          try {
            let el: Element | null = null;
            
            // BLINDAGEM JSF: IDs com dois-pontos
            if (s.startsWith('#') && s.includes(':')) {
              el = document.getElementById(s.substring(1));
            } else {
              el = escopoCentral.querySelector(s);
            }

            if (el) {
              const val = ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) 
                ? (el as HTMLInputElement).value 
                : el.textContent || '';
              
              const limpo = val.replace(/\s+/g, ' ').trim();
              if (limpo) return limpo;
            }
          } catch (e) {
            // Continua para próximo seletor
          }
        }
        
        // 2. Fallback: busca pelo texto do label
        if (labelTxt) {
          const labels = Array.from(escopoCentral.querySelectorAll('label'));
          const lbl = labels.find(l => 
            l.textContent && l.textContent.trim().toLowerCase().includes(labelTxt.toLowerCase())
          );
          
          if (lbl) {
            // Cenário A: Input aninhado
            const innerEl = lbl.querySelector('input, select, textarea') as HTMLInputElement;
            if (innerEl?.value?.trim()) return innerEl.value.trim();

            // Cenário B: Vinculado por ID
            const idRef = lbl.htmlFor || lbl.getAttribute('for');
            if (idRef) {
              const ref = document.getElementById(idRef) as HTMLInputElement;
              if (ref) {
                const valRef = ['INPUT', 'SELECT', 'TEXTAREA'].includes(ref.tagName) 
                  ? ref.value 
                  : ref.textContent || '';
                if (valRef?.trim()) return valRef.trim();
              }
            }

            // Cenário C: Próximo irmão
            if (lbl.nextElementSibling) {
              const nEl = lbl.nextElementSibling as HTMLInputElement;
              const valIrmao = ['INPUT', 'SELECT', 'TEXTAREA'].includes(nEl.tagName) 
                ? nEl.value 
                : nEl.textContent || '';
              if (valIrmao?.trim()) return valIrmao.trim();
            }
          }
        }
        
        return '';
      };

      // Helper para extrair tabelas
      const extrairTabelaFilhos = (
        seletorClasse: string, 
        indices: Record<string, number>
      ): Record<string, string>[] => {
        const lista: Record<string, string>[] = [];
        const tabela = escopoCentral.querySelector(seletorClasse);
        if (!tabela) return lista;
        
        tabela.querySelectorAll('tbody tr, .ui-datatable-data tr').forEach(tr => {
          const tds = Array.from(tr.children);
          if (tds.length >= Object.keys(indices).length && 
              !tr.textContent?.toLowerCase().includes('nenhum registro')) {
            const obj: Record<string, string> = {};
            Object.entries(indices).forEach(([key, index]) => {
              obj[key] = tds[index]?.textContent?.replace(/\s+/g, ' ').trim() || '';
            });
            lista.push(obj);
          }
        });
        
        return lista;
      };

      // Extrai CPF com validação
      let cpf = get(cps.cpf, 'cpf');
      let cpfNumeros = cpf.replace(/\D/g, '');
      
      // Validação Módulo 11
      const ehCpfValido = (num: string): boolean => {
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

      if (!ehCpfValido(cpfNumeros)) {
        const regexCPF = /(?:\d{3}\.\d{3}\.\d{3}-\d{2})|(?:\b\d{11}\b)/;
        const match = escopoCentral.textContent?.match(regexCPF);
        
        if (match && match[0] && ehCpfValido(match[0].replace(/\D/g, ''))) {
          cpf = match[0].replace(/\s+/g, ' ').trim();
        } else {
          cpf = 'FALHA_VALIDACAO_WFM';
        }
      } else {
        cpf = cpf.replace(/\s+/g, ' ').trim();
      }

      // Extrai pendências
      const listaPendencias = extrairTabelaFilhos('[id$="issuesTable"]', { data: 2, motivo: 3 });
      const pendenciaMaisRecente = listaPendencias[0] || { data: '', motivo: '' };

      // Retorna dados completos
      return {
        cpf: cpf,
        nome: get(cps.nome, 'nome'),
        status: get(cps.status, 'status'),
        data: get(cps.data, 'data'),
        tipo: get(cps.tipo, 'tipo'),
        escritorio: get(cps.escritorio, 'escritorio'),
        area_telefonica: get(cps.area_telefonica, 'area'),
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
        data_pendencia: pendenciaMaisRecente.data,
        motivo_pendencia: pendenciaMaisRecente.motivo,
        produtos: extrairTabelaFilhos('.ui-datatable:not([id$="issuesTable"])', { id: 0, nome: 1, acao: 2 }),
        atividades: extrairTabelaFilhos('.tabela-atividades', { 
          id: 0, dataCriacao: 1, dataAgendamento: 2, periodo: 3, 
          tecnico: 4, origem: 5, dataEncerramento: 6, status: 7 
        }),
        historico: extrairTabelaFilhos('.tabela-historico', { status: 0, dataCriacao: 1 })
      };
    }, campos);
  }
}
