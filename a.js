// edge/goi.js - Robô CPQD/Telefônica com Menu Interativo
const { chromium } = require('playwright');
const readline = require('readline');
const { execSync } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let context = null;
let page = null;

// Função auxiliar para pausar o terminal esperando o ENTER do usuário
function aguardarEnter(mensagem) {
  return new Promise((resolve) => {
    rl.question(mensagem, () => {
      resolve();
    });
  });
}

async function iniciarNavegador() {
  if (context) {
    console.log("⚠️ O navegador já está aberto.");
    return true;
  }

  try {
    execSync('taskkill /f /im msedge.exe', { stdio: 'ignore' });
  } catch (e) {}

  const pathToEdgeProfile = 'C:\\Users\\A0161921\\AppData\\Local\\Microsoft\\Edge\\User Data';
  console.log("\n🚀 Iniciando o Microsoft Edge com seu perfil e sessões...");

  try {
    context = await chromium.launchPersistentContext(pathToEdgeProfile, {
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      headless: false,
      ignoreDefaultArgs: ['--disable-extensions'], 
      args: [
        '--profile-directory=Default',
        '--disable-extensions'
      ]
    });

    page = await context.newPage();
    console.log("🌐 Acessando o portal GOI Vivo...");
    await page.goto('https://goi.vivo.com.br/usuario/login.php');

    // CHECAGEM E PREENCHIMENTO DO LOGIN AUTOMÁTICO
    const urlAtual = page.url();
    if (urlAtual.includes('usuario/login.php')) {
      console.log("\n🔒 [TELA DE LOGIN DETECTADA]");
      console.log("✍️ Preenchendo Usuário e Senha automaticamente...");

      // Preenche o campo de Login usando o id do seu HTML
      await page.locator('#logarLogin').waitFor({ state: 'visible', timeout: 5000 });
      await page.locator('#logarLogin').fill('A0161921');

      // Preenche o campo de Senha usando o id do seu HTML
      await page.locator('#logarSenha').fill('Wesley@161990');

      console.log("\n🤖 Credenciais inseridas!");
      console.log("👉 Por favor, vá até a janela do Edge, digite o CAPTCHA e clique em 'Acessar'.");
      
      // PAUSA NO TERMINAL: O código só continua após o usuário pressionar ENTER no CMD
      await aguardarEnter("\n⌨️ Após clicar em 'Acessar' no navegador, pressione [ENTER] aqui no CMD para continuar...");
      
      console.log("\n🔓 Retomando execução do robô...");
    }

    console.log("✅ Página carregada com sucesso com a sua sessão!");
    return true;
  } catch (error) {
    console.error("\n❌ ERRO AO ABRIR O EDGE:", error.message);
    context = null;
    page = null;
    return false;
  }
}

async function navegarAteMenu(textoMenu) {
  console.log(`\n🖱️ Iniciando navigation para: [${textoMenu}]...`);
  try {
    const menuPai = page.locator('.pcoded-hasmenu:has-text("Centro de Controle Técnico") > a');
    const jaEstaAberto = await page.locator('.pcoded-hasmenu:has-text("Centro de Controle Técnico")').evaluate(el => el.classList.contains('pcoded-trigger'));
    
    if (!jaEstaAberto) {
      console.log("📂 Expandindo o menu 'Centro de Controle Técnico'...");
      await menuPai.waitFor({ state: 'visible', timeout: 5000 });
      await menuPai.click();
      await page.waitForTimeout(500); 
    } else {
      console.log("📂 O menu 'Centro de Controle Técnico' já está expandido.");
    }

    const linkSubmenu = page.locator('.pcoded-submenu a').filter({ 
      has: page.locator('span.pcoded-mtext'), 
      hasText: new RegExp(`^${textoMenu}$`)
    });
    
    console.log(`🎯 Clicando em: ${textoMenu}...`);
    await linkSubmenu.waitFor({ state: 'visible', timeout: 5000 });
    await linkSubmenu.click();
    
    console.log(`✅ Sucesso! O robô entrou na tela de ${textoMenu}.`);
  } catch (error) {
    console.error(`❌ Erro durante a navegação para "${textoMenu}":`, error.message);
  }
}

function exibirMenu() {
  console.log("\n=================================");
  console.log("    ROBÔ CPQD / VIVO - MENU      ");
  console.log("=================================");
  console.log(" 1 - Conectar ao GOI Vivo (Abrir Edge)");
  console.log(" 2 - Acessar Submenu (Manobra, Certificação, etc.)");
  console.log(" 3 - Extrair Dados para CSV");
  console.log(" 0 - Sair do Robô");
  console.log("=================================");
  
  rl.question("Escolha uma opção: ", async (opcao) => {
    switch (opcao.trim()) {
      case '1':
        await iniciarNavegador();
        break;
        
      case '2':
        if (!page) {
          console.log("❌ Erro: Você precisa iniciar o navegador (Opção 1) primeiro!");
          exibirMenu();
          return;
        }
        
        console.log("\n--- Qual submenu deseja acessar? ---");
        console.log("[A] Certificação");
        console.log("[B] Desempenho Operacional");
        console.log("[C] Gestão de Recursos");
        console.log("[D] Improdutiva");
        console.log("[E] Manobra");
        console.log("[F] Teste Final");
        
        rl.question("Escolha a letra: ", async (letra) => {
          const escolhas = {
            'A': 'Certificação', 'a': 'Certificação',
            'B': 'Desempenho Operacional', 'b': 'Desempenho Operacional',
            'C': 'Gestão de Recursos', 'c': 'Gestão de Recursos',
            'D': 'Improdutiva', 'd': 'Improdutiva',
            'E': 'Manobra', 'e': 'Manobra',
            'F': 'Teste Final', 'f': 'Teste Final'
          };
          
          const alvo = escolhas[letra.trim()];
          if (alvo) {
            await navegarAteMenu(alvo);
          } else {
            console.log("❌ Letra inválida!");
          }
          exibirMenu();
        });
        return; 
        
      case '3':
        if (!page) {
          console.log("❌ Erro: O navegador não está ativo.");
        } else {
          console.log("💾 Executando rotina de extração para CSV...");
        }
        break;
        
      case '0':
        console.log("👋 Encerrando o robô e fechando conexões...");
        if (context) await context.close();
        rl.close();
        process.exit(0);
        
      default:
        console.log("❌ Opção inválida! Tente novamente.");
    }
    
    if (opcao.trim() !== '0') {
      exibirMenu();
    }
  });
}

exibirMenu();
