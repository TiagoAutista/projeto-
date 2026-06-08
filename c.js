// src/lib/bot/bot.js
// (Mantenha os imports e configurações iniciais iguais)

const {
  aguardar,
  aguardarEnter,
  lerCsvEntrada,
  fazerLoginAutomatico, // <-- Substitua fazerLoginManual por esta
  processarUmId,
  configurarAntiDetecao
} = require('./helpers');

// ... (código de inicialização do navegador igual) ...

  try {
    console.log("⚙️ Configurando navegador...");
    await configurarAntiDetecao(page);

    console.log(`🌐 Acessando: ${CONFIG.url}`);
    await page.goto(CONFIG.url, { waitUntil: "networkidle2", timeout: CONFIG.timeouts.navigation });

    // ========================================================================
    // 4. LOGIN AUTOMATIZADO COM PAUSA
    // ========================================================================
    await aguardar(2000);
    
    // Verifica se o campo de matrícula existe para saber se é tela de login
    const ehTelaLogin = await page.$(CONFIG.selectors.login.username);
    
    if (ehTelaLogin) {
      await fazerLoginAutomatico(page, readline.createInterface({ input: process.stdin, output: process.stdout }));
    } else {
      console.log('✅ Sessão ativa detectada (ou já está na home)!\n');
      try {
        await page.waitForSelector(CONFIG.selectors.homeState, { visible: true, timeout: 10000 });
      } catch (e) {
        await aguardarEnter('👉 Se estiver na HOME, pressione ENTER para continuar...');
      }
    }

    // ========================================================================
    // 5. LOOP DE PROCESSAMENTO (Mantém igual ao anterior)
    // ========================================================================
    console.log('\n' + '═'.repeat(70));
    console.log('🔄 INICIANDO PROCESSAMENTO EM LOTE');
// ... (resto do código do loop e geração de relatórios permanece exatamente igual)
