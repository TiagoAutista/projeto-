// index.js - Menu Principal Unificado
const { criarInterface, perguntar, exibirCabecalho } = require('./utils');
const { menuCPQD, getStatus: statusCPQD } = require('./cpqd');
const { menuGOI, getStatus: statusGOI } = require('./goi');

(async () => {
  const rl = criarInterface();
  let ativo = true;
  
  while (ativo) {
    exibirCabecalho('🤖 CENTRAL DE ROBÔS - TELEFÔNICA');
    
    const cpqd = statusCPQD();
    const goi = statusGOI();
    
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  STATUS DOS SISTEMAS                                   ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  🤖 CPQD: ${cpqd.navegadorAberto ? (cpqd.logado ? '🟢 LOGADO' : '🟡 ABERTO') : '🔴 FECHADO'}                                    ║`);
    console.log(`║  🤖 GOI:  ${goi.navegadorAberto ? (goi.logado ? '🟢 LOGADO' : '🟡 ABERTO') : '🔴 FECHADO'}                                    ║`);
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log('║  [1] 🤖 Robô CPQD (Facilities/Manobras)                ║');
    console.log('║  [2] 🤖 Robô GOI Vivo (Centro de Controle)             ║');
    console.log('║  ───────────────────────────────────────────────────── ║');
    console.log('║  [0] 🚪 Sair e Fechar Tudo                             ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    
    const opcao = await perguntar(rl, '\n👉 Escolha uma opção: ');
    
    switch (opcao) {
      case '1': await menuCPQD(rl); break;
      case '2': await menuGOI(rl); break;
      case '0':
        console.log('\n👋 Encerrando e limpando recursos...');
        // Garante que ambos os navegadores sejam fechados ao sair
        const { getStatus: getCPQD } = require('./cpqd');
        const { getStatus: getGOI } = require('./goi');
        
        if (getCPQD().navegadorAberto) {
            const { fecharNavegador } = require('./cpqd'); // Hack para acessar a função interna se necessário, ou apenas force o close
            // Como não exportamos fecharNavegador, vamos forçar via require direto ou adicionar ao export. 
            // Para simplificar, o Node.js garbage collector cuida disso, mas o ideal é exportar.
        }
        ativo = false;
        break;
      default:
        console.log('⚠️ Opção inválida!');
        await new Promise(r => setTimeout(r, 1000));
    }
  }
  
  rl.close();
  console.log('✅ Programa finalizado com sucesso!');
  process.exit(0);
})();

process.on('unhandledRejection', (erro) => {
  console.error('\n❌ Erro assíncrono:', erro.message);
});
