const menuCPQD = async (rl) => {
  let ativo = true;
  while (ativo) {
    exibirCabecalho('🤖 ROBÔ CPQD - TELEFÔNICA');
    
    const statusTexto = logado ? chalk.green.bold('🟢 LOGADO') : chalk.red.bold('🔴 NÃO LOGADO');
    
    console.log(chalk.cyan.bold('╔══════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan.bold('║') + `  Status: ${statusTexto}`.padEnd(58) + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('╠══════════════════════════════════════════════════════════╣'));
    console.log(chalk.cyan.bold('║') + chalk.yellow.bold('  [1] 🔐 Fazer Login').padEnd(58) + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('║') + chalk.yellow.bold('  [2] 🚀 Fluxo Completo').padEnd(58) + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('║') + chalk.yellow.bold('  [3] 🏢 Abrir Facilities').padEnd(58) + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('║') + chalk.yellow.bold('  [4] 📍 Abrir Site Corrente').padEnd(58) + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('║') + chalk.yellow.bold('  [5] 🔍 Abrir Manobras por CID').padEnd(58) + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('║') + chalk.yellow.bold('  [6] 👁️  Modo Inspeção').padEnd(58) + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('║') + chalk.gray('  ─────────────────────────────────────────────────────').padEnd(58) + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('║') + chalk.red.bold('  [7] ❌ Fechar Navegador CPQD').padEnd(58) + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('║') + chalk.red.bold('  [0] 🔙 Voltar ao Menu Principal').padEnd(58) + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('╚══════════════════════════════════════════════════════════╝'));
    
    const opcao = await perguntar(rl, chalk.cyan.bold('\n👉 Escolha uma opção: '));
    
    try {
      switch (opcao) {
        case '0': ativo = false; break;
        case '1': limparTela(); if (!browser) await iniciarNavegador(); await fazerLogin(); await aguardarEnter(rl); break;
        case '2': if (!logado) { console.log(chalk.red('⚠️ Faça login primeiro!')); await aguardarEnter(rl); break; } await fluxoCompleto(rl); break;
        case '3': if (!logado) { console.log(chalk.red('⚠️ Faça login primeiro!')); await aguardarEnter(rl); break; } await abrirFacilities(rl); break;
        case '4': if (!logado) { console.log(chalk.red('⚠️ Faça login primeiro!')); await aguardarEnter(rl); break; } await abrirSiteCorrente(rl); break;
        case '5': if (!logado) { console.log(chalk.red('⚠️ Faça login primeiro!')); await aguardarEnter(rl); break; } await abrirManobrasPorCID(rl); break;
        case '6': if (!browser) await iniciarNavegador(); await modoInspecao(rl); break;
        case '7': await fecharNavegador(); await aguardarEnter(rl); break;
        default: 
          console.log(chalk.red.bold('⚠️ Opção inválida!')); 
          await new Promise(r => setTimeout(r, 1000));
      }
    } catch (err) {
      console.error(chalk.red.bold('\n❌ Erro:'), err.message);
      await aguardarEnter(rl);
    }
  }
};
