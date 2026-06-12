// utils/terminal.js - Funções de interação com o terminal
const readline = require('readline');

const criarInterface = () => readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true
});

const limparTela = () => {
  process.stdout.write('\x1Bc');
};

const perguntar = (rl, mensagem) => new Promise(resolve => {
  rl.question(mensagem, resposta => resolve(resposta.trim()));
});

const aguardarEnter = (rl, mensagem = '\n↩️ Pressione [ENTER] para continuar...') => 
  new Promise(resolve => {
    rl.question(mensagem, () => resolve());
  });

module.exports = {
  criarInterface,
  limparTela,
  perguntar,
  aguardarEnter
};
