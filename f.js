// goi.js - Módulo do Robô GOI Vivo
const { chromium } = require('playwright');
const { perguntar, aguardarEnter, limparTela, exibirCabecalho } = require('./utils');

let browser = null;
let context = null;
let page = null;
let logado = false;

const CREDENCIAIS = { usuario: 'A0161921', senha: 'Wesley@161990' };

const getStatus = () => ({ logado, navegadorAberto: !!browser });

const iniciarNavegador = async (rl) => {
  if (browser) {
    console.log("\n⚠️ O navegador GOI já está aberto.");
    await aguardarEnter(rl);
    return true;
  }

  console.log("\n🚀 Iniciando Microsoft Edge para GOI Vivo...");
  try {
    browser = await chromium.launch({
      channel: 'msedge',
      headless: false,
      args: ['--start-maximized', '--disable-blink-features=AutomationControlled']
    });

    context = await browser.newContext({ viewport: null });
    page = await context.newPage();
    
    console.log("🌐 Acessando o portal GOI Vivo...");
    await page.goto('https://goi.vivo.com.br/usuario/login.php', { waitUntil: 'domcontentloaded', timeout: 30000 });

    if (page.url().includes('usuario/login.php')) {
      console.log("\n🔒 [TELA DE LOGIN DETECTADA]");
      console.log("✍️ Preenchendo credenciais...");

      await page.locator('#logarLogin').waitFor({ state: 'visible', timeout: 10000 });
      await page.locator('#logarLogin').fill(CREDENCIAIS.usuario);
      await page.locator('#logarSenha').fill(CREDENCIAIS.senha);

      console.log("\n🤖 Credenciais inseridas!");
      console.log("👉 Resolva o CAPTCHA e clique em 'Acessar'.");
      
      await aguardarEnter(rl, "\n⌨️ Após acessar, pressione [ENTER] aqui...");
      
      await page.waitForTimeout(2000);
      logado = !page.url().includes('login.php');
      
      if (logado) console.log("🔓 Login confirmado!");
      else console.log("⚠️ Não foi possível confirmar o login.");
    }

    console.log("✅ Navegador GOI pronto!");
    await aguardarEnter(rl);
    return true;
  } catch (error) {
    console.error("\n❌ ERRO:", error.message);
    browser = null; context = null; page = null;
    await aguardarEnter(rl);
    return false;
  }
};

const fecharNavegador = async () => {
  if (browser) {
    await browser.close();
    browser = null; context = null; page = null; logado = false;
    console.log('✅ Navegador GOI fechado!');
  }
};

const navegarAteMenu = async (textoMenu, rl) => {
  console.log(`\n🖱️ Navegando para: [${textoMenu}]...`);
  try {
    const menuPai = page.locator('.pcoded-hasmenu:has-text("Centro de Controle Técnico") > a');
    const menuPaiContainer = page.locator('.pcoded-hasmenu:has-text("Centro de Controle Técnico")');
    
    const jaAberto = await menuPaiContainer.evaluate(el => el.classList.contains('pcoded-trigger')).catch(() => false);
    
    if (!jaAberto) {
      console.log("📂 Expandindo menu...");
      await menuPai.waitFor({ state: 'visible', timeout: 10000 });
      await menuPai.click();
      await page.waitForTimeout(800); 
    }

    const linkSubmenu = page.locator('.pcoded-submenu a').filter({ 
      has: page.locator('span.pcoded-mtext'), 
      hasText: new RegExp(`^\\s*${textoMenu}\\s*$`)
    });
    
    await linkSubmenu.waitFor({ state: 'visible', timeout: 10000 });
    await linkSubmenu.click();
    await page.waitForLoadState('domcontentloaded');
    
    console.log(`✅ Sucesso! Tela de ${textoMenu}.`);
    await aguardarEnter(rl);
  } catch (error) {
    console.error(`❌ Erro:`, error.message);
    await aguardarEnter(rl);
  }
};

const menuGOI = async (rl) => {
  let ativo = true;
  while (ativo) {
    exibirCabecalho('🤖 ROBÔ GOI VIVO - TELEFÔNICA');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log(`║  Status: ${logado ? '🟢 LOGADO' : '🔴 NÃO LOGADO'}                              ║`);
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log('║  [1] 🌐 Conectar ao GOI Vivo                           ║');
    console.log('║  [2] 📂 Acessar Submenu                                ║');
    console.log('║  [3] 💾 Extrair Dados para CSV                         ║');
    console.log('║  [4] ❌ Fechar Navegador GOI                           ║');
    console.log('║  [0] 🔙 Voltar ao Menu Principal                       ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    
    const opcao = await perguntar(rl, '\n👉 Escolha uma opção: ');
    try {
      switch (opcao) {
        case '0': ativo = false; break;
        case '1': limparTela(); await iniciarNavegador(rl); break;
        case '2':
          if (!page) { console.log("❌ Inicie o navegador primeiro! (Opção 1)"); await aguardarEnter(rl); break; }
          console.log("\n--- Qual submenu deseja acessar? ---");
          console.log("[A] Certificação\n[B] Desempenho Operacional\n[C] Gestão de Recursos\n[D] Improdutiva\n[E] Manobra\n[F] Teste Final\n[V] Voltar");
          const letra = await perguntar(rl, "\nEscolha a letra: ");
          const escolhas = { 'a': 'Certificação', 'b': 'Desempenho Operacional', 'c': 'Gestão de Recursos', 'd': 'Improdutiva', 'e': 'Manobra', 'f': 'Teste Final' };
          if (letra.toLowerCase() === 'v') break;
          const alvo = escolhas[letra.toLowerCase()];
          if (alvo) await navegarAteMenu(alvo, rl);
          else { console.log("❌ Letra inválida!"); await aguardarEnter(rl); }
          break;
        case '3':
          if (!page) { console.log("❌ Navegador não está ativo."); await aguardarEnter(rl); break; }
          console.log("💾 Rotina CSV em desenvolvimento...");
          await aguardarEnter(rl);
          break;
        case '4': await fecharNavegador(); await aguardarEnter(rl); break;
        default: console.log('⚠️ Opção inválida!'); await new Promise(r => setTimeout(r, 1000));
      }
    } catch (err) {
      console.error('\n❌ Erro:', err.message);
      await aguardarEnter(rl);
    }
  }
};

module.exports = { menuGOI, getStatus };
