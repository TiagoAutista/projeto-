const menuGOI = async (rl) => {
  let ativo = true;
  while (ativo) {
    exibirCabecalho('🤖 ROBÔ GOI VIVO - TELEFÔNICA');
    
    const statusTexto = logado ? chalk.green.bold('🟢 LOGADO') : chalk.red.bold('🔴 NÃO LOGADO');
    
    console.log(chalk.cyan.bold('╔══════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan.bold('║') + `  Status: ${statusTexto}`.padEnd(58) + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('╠══════════════════════════════════════════════════════════╣'));
    console.log(chalk.cyan.bold('║') + chalk.yellow.bold('  [1] 🌐 Conectar ao GOI Vivo').padEnd(58) + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('║') + chalk.yellow.bold('  [2] 📂 Acessar Submenu').padEnd(58) + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('║') + chalk.yellow.bold('  [3] 💾 Extrair Dados para CSV').padEnd(58) + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('║') + chalk.gray('  ─────────────────────────────────────────────────────').padEnd(58) + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('║') + chalk.red.bold('  [4] ❌ Fechar Navegador GOI').padEnd(58) + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('║') + chalk.red.bold('  [0] 🔙 Voltar ao Menu Principal').padEnd(58) + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('╚══════════════════════════════════════════════════════════╝'));
    
    const opcao = await perguntar(rl, chalk.cyan.bold('\n👉 Escolha uma opção: '));
    
    try {
      switch (opcao) {
        case '0': ativo = false; break;
        case '1': limparTela(); await iniciarNavegador(rl); break;
        case '2':
          if (!page) { console.log(chalk.red("❌ Inicie o navegador primeiro! (Opção 1)")); await aguardarEnter(rl); break; }
          
          console.log(chalk.yellow.bold("\n--- Qual submenu deseja acessar? ---"));
          console.log(chalk.white("  [A] Certificação"));
          console.log(chalk.white("  [B] Desempenho Operacional"));
          console.log(chalk.white("  [C] Gestão de Recursos"));
          console.log(chalk.white("  [D] Improdutiva"));
          console.log(chalk.white("  [E] Manobra"));
          console.log(chalk.white("  [F] Teste Final"));
          console.log(chalk.gray("  [V] Voltar ao menu"));
          
          const letra = await perguntar(rl, chalk.cyan.bold("\nEscolha a letra: "));
          const escolhas = { 'a': 'Certificação', 'b': 'Desempenho Operacional', 'c': 'Gestão de Recursos', 'd': 'Improdutiva', 'e': 'Manobra', 'f': 'Teste Final' };
          
          if (letra.toLowerCase() === 'v') break;
          const alvo = escolhas[letra.toLowerCase()];
          
          if (alvo) await navegarAteMenu(alvo, rl);
          else { console.log(chalk.red("❌ Letra inválida!")); await aguardarEnter(rl); }
          break;
        case '3':
          if (!page) { console.log(chalk.red("❌ Navegador não está ativo.")); await aguardarEnter(rl); break; }
          console.log(chalk.yellow("💾 Rotina CSV em desenvolvimento..."));
          await aguardarEnter(rl);
          break;
        case '4': await fecharNavegador(); await aguardarEnter(rl); break;
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
