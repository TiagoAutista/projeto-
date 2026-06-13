//utils/wfm/cpf-validator.ts

/**
 * Validação de CPF usando algoritmo oficial (Módulo 11)
 * Substitui a lógica inline do código original
 */
export class CPFValidator {
  /**
   * Remove todos os caracteres não numéricos
   */
  static limpar(txt: string): string {
    return String(txt || '').replace(/\D/g, '');
  }

  /**
   * Valida CPF usando algoritmo oficial de Módulo 11
   */
  static ehValido(num: string): boolean {
    const cpf = this.limpar(num);
    
    // Verifica se tem 11 dígitos
    if (cpf.length !== 11) return false;
    
    // Verifica se todos os dígitos são iguais (CPF inválido)
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    
    // Validação do primeiro dígito verificador
    let soma = 0;
    for (let i = 1; i <= 9; i++) {
      soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;
    
    // Validação do segundo dígito verificador
    soma = 0;
    for (let i = 1; i <= 10; i++) {
      soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    
    return resto === parseInt(cpf.substring(10, 11));
  }

  /**
   * Extrai CPF de um texto usando regex estruturada
   */
  static extrairDeTexto(texto: string): string | null {
    const regexCPF = /(?:\d{3}\.\d{3}\.\d{3}-\d{2})|(?:\b\d{11}\b)/;
    const match = texto.match(regexCPF);
    
    if (match && match[0]) {
      const cpfLimpo = this.limpar(match[0]);
      if (this.ehValido(cpfLimpo)) {
        return match[0].replace(/\s+/g, ' ').trim();
      }
    }
    
    return null;
  }
}
