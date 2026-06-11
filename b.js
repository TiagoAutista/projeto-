// cpqd.js - Robô CPQD/Telefônica com Menu Interativo (CORRIGIDO)
const { chromium } = require('playwright');
const readline = require('readline');

// ============================================================================
// 🔧 FUNÇÕES AUXILIARES
// ============================================================================

const criarInterface = () => readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true // Garante comportamento correto do terminal
});

const perguntar = (rl, mensagem) => new Promise(resolve => {
  rl.question(mensagem, resposta => resolve(resposta.trim()));
});

const perguntarSigla = async (rl) => {
  const resposta = await perguntar(rl, '\n📍 Digite a sigla para pesquisa (ex: SU): ');
  return resposta.toUpperCase();
};

const perguntarDadosBusca = async (rl) => {
  const localidade = await perguntar(rl, '\n🔢 Digite o Número da Localidade (ex: 11000): ');
  const site = await perguntar(rl, '🏢 Digite a Sigla do Site (ex: GU): ');
  return { localidade, site: site.toUpperCase() };
};

const aguardarEnter = (rl, mensagem) => new Promise(resolve => {
  rl.question(mensagem, () => resolve());
});

// Limpa a tela de forma segura
const limparTela = () => {
  process.stdout.write('\x1Bc'); // Reset do terminal (funciona melhor que console.clear)
};

// ============================================================================
// 📋 MENU PRINCIPAL
// ============================================================================

const mostrarMenu = async (rl) => {
  limparTela();
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     🤖 ROBÔ CPQD - TELEFÔNICA / FACILITIES             ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  [1] 🚀 Fluxo Completo (Facilities → Manobras)         ║');
  console.log('║  [2] 🏢 Abrir apenas Facilities Management             ║');
  console.log('║  [3] 📍 Abrir Site Corrente (CurrentSite)              ║');
  console.log('║  [4] 🔍 Abrir Manobras por CID (manual)                ║');
  console.log('║  [5] 👁️  Modo Inspeção (abre e pausa)                  ║');
  console.log('║  ───────────────────────────────────────────────────── ║');
  console.log('║  [0] 🚪 Sair                                           ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  
  return await perguntar(rl, '\n👉 Escolha uma opção: ');
};

// ============================================================================
// 🌐 INICIALIZAÇÃO DO NAVEGADOR
// ============================================================================

const iniciarNavegador = async () => {
  console.log('\n⚙️ Iniciando navegador Edge...');
  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  console.log('✅ Navegador iniciado!\n');
  return { browser, context, page };
};

// ============================================================================
// 🔐 LOGIN
// ============================================================================

const fazerLogin = async (page) => {
  console.log('🔐 Acessando página de login...');
  await page.goto('http://sagreosp.telefonica.br/cpqd/caweb/login.xhtml', { waitUntil: 'load' });
  
  console.log('⚙️ Preenchendo credenciais...');
  await page.locator('input[type="text"], input[id*="username"], input[id*="usuario"], input[id*="login"]').first().fill('A0161921');
  await page.locator('input[type="password"]').first().fill('Wesley@161990');
  await page.locator('button[type="submit"], input[type="submit"], button:has-text("Entrar"), button:has-text("Login")').first().click();
  
  console.log('✅ Login executado!');
};

// ============================================================================
// 🏢 OPÇÃO 2: Abrir apenas Facilities
// ============================================================================

const abrirFacilities = async (page, rl) => {
  console.log('\n🏢 Abrindo Facilities Management...');
  const moduloFacilities = page.locator('#bxFacilitiesManagement a');
  await moduloFacilities.waitFor({ state: 'visible', timeout: 30000 });
  await moduloFacilities.click();
  console.log('✅ Facilities Management aberto com sucesso!');
  
  await aguardarEnter(rl, '\n↩️ Pressione [ENTER] para voltar ao menu...');
};

// ============================================================================
// 📍 OPÇÃO 3: Abrir Site Corrente
// ============================================================================

const abrirSiteCorrente = async (context, page, rl) => {
  console.log('\n🏢 Abrindo Facilities...');
  const moduloFacilities = page.locator('#bxFacilitiesManagement a');
  await moduloFacilities.waitFor({ state: 'visible', timeout: 30000 });
  await moduloFacilities.click();
  
  const sigla = await perguntarSigla(rl);
  if (!sigla) {
    console.log('⚠️ Nenhuma sigla digitada.');
    return;
  }
  
  console.log('🔍 Preenchendo filtro...');
  const campoFiltro = page.locator('#searchInput');
  await campoFiltro.waitFor({ state: 'visible', timeout: 15000 });
  await campoFiltro.fill(sigla);
  console.log(`✅ Filtro: ${sigla}`);
  
  const promessaNovaAba = context.waitForEvent('page', { timeout: 60000 });
  
  console.log(`📂 Selecionando banco _${sigla}...`);
  const opcaoBanco = page.locator(`[id$="_${sigla}"] a`);
  await opcaoBanco.waitFor({ state: 'visible', timeout: 15000 });
  await opcaoBanco.click();
  
  console.log('⏳ Aguardando abertura do Site Corrente...');
  const novaAba = await promessaNovaAba;
  await novaAba.waitForURL('**/CurrentSite.xhtml*', { waitUntil: 'load', timeout: 45000 });
  
  console.log(`🌐 Site Corrente aberto: ${novaAba.url()}`);
  await aguardarEnter(rl, '\n↩️ Pressione [ENTER] para voltar ao menu...');
};

// ============================================================================
// 🔍 OPÇÃO 4: Abrir Manobras por CID (manual)
// ============================================================================

const abrirManobrasPorCID = async (context, rl) => {
  const cid = await perguntar(rl, '\n🆔 Digite o número do CID: ');
  
  if (!cid || !/^\d+$/.test(cid)) {
    console.log('⚠️ CID inválido. Deve conter apenas números.');
    return;
  }
  
  const URLManobras = `http://sagreosp.telefonica.br/cpqd/oper/ManeuverFttxResource/ManeuverFttxResource.xhtml?faces-redirect=true&cid=${cid}`;
  console.log(`\n🚀 Abrindo Manobras com CID: ${cid}`);
  
  const paginaManobras = await context.newPage();
  
  try {
    await paginaManobras.goto(URLManobras, { waitUntil: 'load', timeout: 30000 });
  } catch (e) {
    const URLDireta = URLManobras.replace('faces-redirect=true&', '');
    console.log('🔄 Tentando sem faces-redirect...');
    await paginaManobras.goto(URLDireta, { waitUntil: 'load', timeout: 30000 });
  }
  
  await paginaManobras.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await paginaManobras.waitForTimeout(2000);
  
  console.log(`✅ Manobras aberta: ${paginaManobras.url()}`);
  await aguardarEnter(rl, '\n↩️ Pressione [ENTER] para voltar ao menu...');
};

// ============================================================================
// 👁️ OPÇÃO 5: Modo Inspeção
// ============================================================================

const modoInspecao = async (page, rl) => {
  console.log('\n👁️ Abrindo sistema em modo inspeção...');
  await page.goto('http://sagreosp.telefonica.br/cpqd/caweb/login.xhtml', { waitUntil: 'load' });
  
  console.log('\n📋 INSTRUÇÕES:');
  console.log('   • O navegador está aberto na tela de login');
  console.log('   • Faça o login manualmente se necessário');
  console.log('   • Navegue livremente pelo sistema');
  console.log('   • Quando terminar, volte ao terminal');
  
  await aguardarEnter(rl, '\n↩️ Pressione [ENTER] para voltar ao menu...');
};

// ============================================================================
// 🚀 OPÇÃO 1: Fluxo Completo (CORRIGIDO)
// ============================================================================

const fluxoCompleto = async (context, page, rl) => {
  console.log('\n🚀 Iniciando FLUXO COMPLETO...\n');
  
  // LOGIN
  await fazerLogin(page);
  
  // FACILITIES
  console.log('🏢 Aguardando Facilities Management...');
  const moduloFacilities = page.locator('#bxFacilitiesManagement a');
  await moduloFacilities.waitFor({ state: 'visible', timeout: 30000 });
  await moduloFacilities.click();
  console.log('✅ Facilities acionado!');
  
  // SIGLA
  const sigla = await perguntarSigla(rl);
  if (!sigla) {
    console.log('⚠️ Nenhuma sigla digitada.');
    return;
  }
  
  // FILTRO
  console.log('🔍 Preenchendo filtro...');
  const campoFiltro = page.locator('#searchInput');
  await campoFiltro.waitFor({ state: 'visible', timeout: 15000 });
  await campoFiltro.fill(sigla);
  console.log(`✅ Filtro: ${sigla}`);
  
  // ✅ CORREÇÃO: Usar Promise para aguardar a nova aba de forma controlada
  const promessaNovaAba = context.waitForEvent('page', { timeout: 60000 });
  
  // BANCO
  console.log(`\n📂 Selecionando banco _${sigla}...`);
  const opcaoBanco = page.locator(`[id$="_${sigla}"] a`);
  await opcaoBanco.waitFor({ state: 'visible', timeout: 15000 });
  await opcaoBanco.click();
  console.log('✅ Banco selecionado!');
  
  console.log('⏳ Aguardando abertura do Site Corrente...');
  
  try {
    const novaAba = await promessaNovaAba;
    await novaAba.waitForURL('**/CurrentSite.xhtml*', { waitUntil: 'load', timeout: 45000 });
    console.log(`🌐 Site Corrente: ${novaAba.url()}`);
    
    await novaAba.locator('#CurrentSiteInsertForm').waitFor({ state: 'visible', timeout: 20000 });
    
    const dados = await perguntarDadosBusca(rl);
    
    console.log('⚙️ Preenchendo Localidade...');
    await novaAba.locator('tr:has-text("Localidade") input[type="text"]').first().fill(dados.localidade);
    
    console.log('⚙️ Preenchendo Site...');
    await novaAba.locator('tr:has-text("Site") input[type="text"]').first().fill(dados.site);
    
    console.log('🔍 Acionando Lupa...');
    await novaAba.locator('tr:has-text("Site") button, tr:has-text("Site") a').first().click();
    await novaAba.waitForTimeout(2000);
    
    console.log('🎯 Localizando botão "Definir"...');
    const botaoDefinir = novaAba.locator('button:has-text("Definir"), input[type="submit"][value="Definir"], .ui-button:has-text("Definir")').first();
    await botaoDefinir.waitFor({ state: 'visible', timeout: 10000 });
    await botaoDefinir.focus();
    await novaAba.keyboard.press('Enter');
    console.log('✅ Botão Definir acionado.');
    
    // AGUARDAR LAYOUT
    console.log('⏳ Aguardando resposta do sistema...');
    await novaAba.waitForFunction(() => {
      return window.location.href.includes('layout.xhtml') || 
             window.location.href.includes('ManeuverFttxResource.xhtml');
    }, { timeout: 45000 });
    
    const urlAtual = novaAba.url();
    
    if (urlAtual.includes('layout.xhtml')) {
      console.log('📌 LAYOUT BASE detectado.');
      console.log('🔒 Mantendo aba do layout aberta (sessão do CID).');
      
      const match = urlAtual.match(/cid=(\d+)/);
      if (!match || !match[1]) {
        console.log('⚠️ CID não encontrado na URL.');
        return;
      }
      
      const cid = match[1].trim();
      console.log(`🆔 CID: ${cid}`);
      
      const URLManobras = `http://sagreosp.telefonica.br/cpqd/oper/ManeuverFttxResource/ManeuverFttxResource.xhtml?faces-redirect=true&cid=${cid}`;
      console.log('🚀 Abrindo Manobras em NOVA ABA...');
      
      const paginaManobrasFinal = await context.newPage();
      
      try {
        await paginaManobrasFinal.goto(URLManobras, { waitUntil: 'load', timeout: 30000 });
      } catch (e) {
        const URLDireta = URLManobras.replace('faces-redirect=true&', '');
        console.log('🔄 Tentando sem faces-redirect...');
        await paginaManobrasFinal.goto(URLDireta, { waitUntil: 'load', timeout: 30000 });
      }
      
      await paginaManobrasFinal.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
      await paginaManobrasFinal.waitForTimeout(3000);
      
      console.log('\n📊 ABAS ATIVAS:');
      context.pages().forEach((aba, i) => {
        try {
          const url = aba.url();
          const tipo = url.includes('layout.xhtml') ? '🔒 LAYOUT' : 
                      url.includes('ManeuverFttxResource') ? '🚀 MANOBRAS' : 
                      url.includes('CurrentSite') ? '📍 SITE CORRENTE' : '📄 OUTRA';
          console.log(`   [${i}] ${tipo}: ${url.substring(0, 70)}...`);
        } catch {}
      });
      
      console.log('\n🎉 FLUXO COMPLETO EXECUTADO COM SUCESSO!');
      
    } else if (urlAtual.includes('ManeuverFttxResource')) {
      console.log('🚀 Sistema redirecionou direto para Manobras!');
      console.log('\n🎉 FLUXO COMPLETO EXECUTADO COM SUCESSO!');
    }
    
  } catch (erro) {
    console.error('❌ Erro no fluxo:', erro.message);
  }
  
  await aguardarEnter(rl, '\n↩️ Pressione [ENTER] para voltar ao menu...');
};

// ============================================================================
// 🎯 LOOP PRINCIPAL (CORRIGIDO)
// ============================================================================

(async () => {
  limparTela();
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   🤖 ROBÔ CPQD - TELEFÔNICA / FACILITIES MANAGEMENT    ║');
  console.log('║   📅 ' + new Date().toLocaleString('pt-BR').padEnd(48) + '║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  
  const rl = criarInterface();
  let ativo = true;
  let browser = null;
  let context = null;
  let page = null;
  
  try {
    const nav = await iniciarNavegador();
    browser = nav.browser;
    context = nav.context;
    page = nav.page;
    
    await fazerLogin(page);
    
    while (ativo) {
      try {
        const opcao = await mostrarMenu(rl);
        
        switch (opcao) {
          case '1':
            limparTela();
            console.log('▶️ [1] Fluxo Completo');
            await fluxoCompleto(context, page, rl);
            break;
            
          case '2':
            limparTela();
            console.log('▶️ [2] Abrir Facilities');
            await abrirFacilities(page, rl);
            break;
            
          case '3':
            limparTela();
            console.log('▶️ [3] Abrir Site Corrente');
            await abrirSiteCorrente(context, page, rl);
            break;
            
          case '4':
            limparTela();
            console.log('▶️ [4] Abrir Manobras por CID');
            await abrirManobrasPorCID(context, rl);
            break;
            
          case '5':
            limparTela();
            console.log('▶️ [5] Modo Inspeção');
            await modoInspecao(page, rl);
            break;
            
          case '0':
            console.log('\n👋 Encerrando aplicação...');
            ativo = false;
            break;
            
          default:
            console.log('\n⚠️ Opção inválida! Escolha de 0 a 5.');
            await new Promise(r => setTimeout(r, 1500));
        }
      } catch (err) {
        console.error('\n❌ Erro na execução:', err.message);
        await aguardarEnter(rl, '\n↩️ Pressione [ENTER] para voltar ao menu...');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Erro fatal:', error.message);
  } finally {
    rl.close();
    if (browser) {
      console.log('\n🔒 Fechando navegador...');
      await browser.close();
    }
    console.log('✅ Programa finalizado!');
    process.exit(0);
  }
})();

process.on('unhandledRejection', (erro) => {
  console.error('\n❌ Erro assíncrono:', erro.message);
});
