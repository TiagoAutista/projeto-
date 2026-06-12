// utils/validacao.js - Funções de validação de dados
const { perguntar } = require('./terminal');

const validarNumero = (valor, nome = 'valor') => {
  if (!valor || !/^\d+$/.test(valor)) {
    console.log(`⚠️ ${nome} inválido. Deve conter apenas números.`);
    return false;
  }
  return true;
};

const confirmarAcao = async (rl, mensagem = '⚠️ Tem certeza? (s/n): ') => {
  const resposta = await perguntar(rl, mensagem);
  return resposta.toLowerCase() === 's';
};

module.exports = {
  validarNumero,
  confirmarAcao
};
