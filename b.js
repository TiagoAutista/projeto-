// utils/visual.js - Funções de formatação visual
const { limparTela } = require('./terminal');

const desenharBox = (titulo, linhas) => {
  const largura = 60;
  console.log('╔' + '═'.repeat(largura) + '╗');
  console.log('║' + titulo.padStart(Math.floor((largura + titulo.length) / 2)).padEnd(largura) + '║');
  console.log('╠' + '═'.repeat(largura) + '╣');
  linhas.forEach(linha => {
    console.log('║ ' + linha.padEnd(largura - 1) + '║');
  });
  console.log('╚' + '═'.repeat(largura) + '╝');
};

const exibirCabecalho = (titulo) => {
  limparTela();
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   ' + titulo.padEnd(59) + '║');
  console.log('║   📅 ' + new Date().toLocaleString('pt-BR').padEnd(48) + '   ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
};

const exibirStatus = (label, ativo) => {
  const icone = ativo ? '🟢 ATIVO' : '🔴 INATIVO';
  console.log(`   ${label}: ${icone}`);
};

module.exports = {
  desenharBox,
  exibirCabecalho,
  exibirStatus
};
