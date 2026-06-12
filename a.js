// utils/visual.js - Funções de formatação visual com Chalk
const chalk = require('chalk');
const { limparTela } = require('./terminal');

const exibirCabecalho = (titulo) => {
  limparTela();
  const borda = chalk.cyan.bold;
  const texto = chalk.white.bold;
  const data = chalk.gray;
  
  console.log(borda('╔══════════════════════════════════════════════════════════╗'));
  console.log(borda('║') + '   ' + texto(titulo.padEnd(54)) + borda('║'));
  console.log(borda('║') + '   📅 ' + data(new Date().toLocaleString('pt-BR').padEnd(48)) + borda('║'));
  console.log(borda('╚══════════════════════════════════════════════════════════╝\n'));
};

const desenharBox = (titulo, linhas) => {
  const largura = 60;
  const borda = chalk.cyan.bold;
  const destaque = chalk.yellow.bold;
  
  console.log(borda('╔' + '═'.repeat(largura) + '╗'));
  console.log(borda('║') + destaque(' ' + titulo.padEnd(largura - 1) + '║'));
  console.log(borda('╠' + '═'.repeat(largura) + '╣'));
  
  linhas.forEach(linha => {
    // Garante que o texto não ultrapasse a borda, mesmo com cores
    const textoLimpo = linha.replace(/\x1b\[[0-9;]*m/g, ''); // Remove códigos de cor para calcular tamanho
    const espacos = ' '.repeat(largura - 2 - textoLimpo.length);
    console.log(borda('║') + ' ' + linha + espacos + borda('║'));
  });
  
  console.log(borda('╚' + '═'.repeat(largura) + '╝'));
};

const getStatusFormatado = (label, statusNavegador, statusLogin) => {
  let indicador = chalk.red.bold('🔴 FECHADO');
  if (statusNavegador) {
    indicador = statusLogin ? chalk.green.bold('🟢 LOGADO') : chalk.yellow.bold('🟡 ABERTO (Sem Login)');
  }
  return `${chalk.white.bold(label.padEnd(8))}: ${indicador}`;
};

module.exports = {
  desenharBox,
  exibirCabecalho,
  getStatusFormatado
};
