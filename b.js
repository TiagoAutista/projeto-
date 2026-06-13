//utils/wfm/csv-handler.ts

import * as fs from 'fs';
import * as path from 'path';

/**
 * Handler nativo de CSV (substitui csv-parse e csv-writer)
 * Zero dependências externas
 */
export class CSVHandler {
  /**
   * Lê e parseia um arquivo CSV
   */
  static ler(arquivo: string): Record<string, string>[] {
    if (!fs.existsSync(arquivo)) {
      throw new Error(`Arquivo não encontrado: ${arquivo}`);
    }

    const conteudo = fs.readFileSync(arquivo, 'utf8');
    const linhas = conteudo.split('\n').filter(l => l.trim());
    
    if (linhas.length === 0) {
      return [];
    }

    // Parseia cabeçalho
    const cabecalhos = this.parsearLinha(linhas[0]);
    
    // Parseia dados
    const registros: Record<string, string>[] = [];
    for (let i = 1; i < linhas.length; i++) {
      const valores = this.parsearLinha(linhas[i]);
      const registro: Record<string, string> = {};
      
      cabecalhos.forEach((cab, idx) => {
        registro[cab] = valores[idx] || '';
      });
      
      registros.push(registro);
    }
    
    return registros;
  }

  /**
   * Parseia uma linha CSV respeitando aspas
   */
  private static parsearLinha(linha: string): string[] {
    const valores: string[] = [];
    let atual = '';
    let emAspas = false;
    
    for (let i = 0; i < linha.length; i++) {
      const char = linha[i];
      
      if (char === '"') {
        emAspas = !emAspas;
      } else if (char === ',' && !emAspas) {
        valores.push(atual.trim());
        atual = '';
      } else {
        atual += char;
      }
    }
    
    valores.push(atual.trim());
    return valores;
  }

  /**
   * Escreve dados em um arquivo CSV
   */
  static escrever(
    arquivo: string,
    dados: Record<string, any>[],
    cabecalhos: { id: string; titulo: string }[]
  ): void {
    // Cria diretório se não existir
    const dir = path.dirname(arquivo);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Monta cabeçalho
    const linhaCabecalho = cabecalhos.map(c => `"${c.titulo}"`).join(',');
    const linhas = [linhaCabecalho];

    // Monta linhas de dados
    dados.forEach(registro => {
      const valores = cabecalhos.map(c => {
        const valor = registro[c.id] || '';
        // Escapa aspas duplas e envolve em aspas
        const escapado = String(valor).replace(/"/g, '""');
        return `"${escapado}"`;
      });
      linhas.push(valores.join(','));
    });

    // Escreve arquivo
    fs.writeFileSync(arquivo, linhas.join('\n'), 'utf8');
  }
}
