// index.js - Menu Principal Unificado
const { criarInterface, perguntar } = require('./utils/terminal');
const { exibirCabecalho, getStatusFormatado } = require('./utils/visual');
const { menuCPQD, getStatus: statusCPQD } = require('./cpqd');
const { menuGOI, getStatus: statusGOI } = require('./goi');
const chalk = require('chalk');

(async () => {
  const rl = criarInterface();
  let ativo = true;
  
  while (ativo) {
    exibirCabecalho('🤖 CENTRAL DE ROBÔS - TELEFÔNICA');
    
    const cpqd = statusCPQD();
    const goi = statusGOI();
    
    console.log(chalk.cyan.bold('╔══════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan.bold('║') + chalk.white.bold('  STATUS DOS SISTEMAS').padEnd(58) + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('╠══════════════════════════════════════════════════════════╣'));
    console.log(chalk.cyan.bold('║') + '  ' + getStatusFormatado('🤖 CPQD', cpqd.navegadorAberto, cpqd.logado).padEnd(56) + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('║') + '  ' + getStatusFormatado('🤖 GOI ', goi.navegadorAberto, goi.logado).padEnd(56) + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('╠══════════════════════════════════════════════════════════╣'));
    console.log(chalk.cyan.bold('║') + chalk.yellow.bold('  [1] 🤖 Robô CPQD (Facilities / Manobras)').padEnd(58) + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('║') + chalk.yellow.bold('  [2] 🤖 Robô GOI Vivo (Centro de Controle)').padEnd(58) + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('║') + '  ' + chalk.gray('─────────────────────────────────────────────────────').padEnd(58) + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('║') + chalk.red.bold('  [0] 🚪 Sair e Fechar Tudo').padEnd(58) + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('╚══════════════════════════════════════════════════════════╝'));
    
    const opcao = await perguntar(rl, chalk.cyan.bold('\n👉 Escolha uma opção: '));
    
    switch (opcao) {
      case '1': 
        await menuCPQD(rl); 
        break;
      case '2': 
        await menuGOI(rl); 
        break;
      case '0':
        console.log(chalk.yellow('\n👋 Encerrando e limpando recursos...'));
        ativo = false;
        break;
      default:
        console.log(chalk.red.bold('\n⚠️ Opção inválida! Tente novamente.'));
        await new Promise(r => setTimeout(r, 1500));
    }
  }
  
  rl.close();
  console.log(chalk.green.bold('✅ Programa finalizado com sucesso!\n'));
  process.exit(0);
})();

process.on('unhandledRejection', (erro) => {
  console.error(chalk.red.bold('\n❌ Erro assíncrono:'), erro.message);
});
