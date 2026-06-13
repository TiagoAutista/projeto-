// src/lib/wfm.js - [WFM] Login no sistema GVT/Vivo - Versão Simplificada
// ============================================================================
const { chromium } = require('playwright');

/**
 * 🔐 FUNÇÃO: Realiza login no sistema WFM
 * @param {object} page - Página do Playwright
 * @param {object} config - Configurações do sistema
 * @returns {boolean} true se login bem-sucedido, false caso contrário
 */
async function loginWFM(page, config) {
  const cfg = config?.wfm;
  
  if (!cfg) {
    console.error('❌ Configuração WFM não fornecida.');
    return false;
  }
  
  if (!cfg.urlBase || !cfg.urlBase.startsWith('http')) {
    console.error('❌ WFM_URL_BASE inválida.');
    return false;
  }
  
  const usuario = cfg.usuario || process.env.WFM_USUARIO;
  const senha = cfg.senha || process.env.WFM_SENHA;
  
  if (!usuario || !senha) {
    console.error('❌ Credenciais WFM não configuradas.');
    console.error('💡 Adicione no .env: WFM_USUARIO e WFM_SENHA');
    return false;
  }
  
  console.log(`\n🔐 [WFM] Iniciando login...`);
  console.log(`   👤 Usuário: ${usuario}`);
  
  try {
    // 1. Navegar para o WFM
    const timeoutNavegacao = config?.timeouts?.navegacao || 30000;
    console.log(`   🌐 Navegando: ${cfg.urlBase}`);
    
    await page.goto(cfg.urlBase, { 
      waitUntil: 'domcontentloaded', 
      timeout: timeoutNavegacao
    });
    
    // 2. Verificar se já está logado
    const currentUrl = page.url().toLowerCase();
    if (!currentUrl.includes('login') && !currentUrl.includes('autenticacao')) {
      console.log('✅ Sessão já ativa. Login não necessário.');
      return true;
    }
    
    // 3. Aguardar formulário de login
    const timeoutElemento = config?.timeouts?.elemento || 15000;
    console.log('   ⏳ Aguardando formulário de login...');
    
    // Seletores flexíveis para campos de login
    const seletorUsuario = [
      'input[id*="usuario"]',
      'input[id*="login"]',
      'input[name*="usuario"]',
      '#usuario',
      'input[type="text"]:first-of-type'
    ];
    
    const seletorSenha = [
      'input[id*="senha"]',
      'input[id*="password"]',
      'input[name*="senha"]',
      '#senha',
      'input[type="password"]'
    ];
    
    const seletorBotao = [
      'button[id*="entrar"]',
      'button[id*="login"]',
      'button[type="submit"]',
      'button:has-text("Entrar")',
      'button:has-text("Login")'
    ];
    
    // Encontrar campo de usuário
    let campoUsuario = null;
    for (const seletor of seletorUsuario) {
      try {
        campoUsuario = await page.waitForSelector(seletor, { 
          timeout: 5000,
          state: 'visible'
        });
        console.log(`   ✓ Campo usuário: ${seletor}`);
        break;
      } catch (e) {
        continue;
      }
    }
    
    if (!campoUsuario) {
      throw new Error('Campo de usuário não encontrado.');
    }
    
    // Encontrar campo de senha
    let campoSenha = null;
    for (const seletor of seletorSenha) {
      try {
        campoSenha = await page.waitForSelector(seletor, { 
          timeout: 5000,
          state: 'visible'
        });
        console.log(`   ✓ Campo senha: ${seletor}`);
        break;
      } catch (e) {
        continue;
      }
    }
    
    if (!campoSenha) {
      throw new Error('Campo de senha não encontrado.');
    }
    
    // 4. Preencher credenciais
    console.log('   ✍️  Preenchendo credenciais...');
    await campoUsuario.fill(usuario);
    await campoSenha.fill(senha);
    await page.waitForTimeout(500);
    
    // 5. Clicar no botão de login
    let botaoLogin = null;
    for (const seletor of seletorBotao) {
      try {
        botaoLogin = await page.waitForSelector(seletor, { 
          timeout: 3000,
          state: 'visible'
        });
        console.log(`   ✓ Botão login: ${seletor}`);
        break;
      } catch (e) {
        continue;
      }
    }
    
    if (botaoLogin) {
      console.log('   🖱️  Clicando em entrar...');
      await botaoLogin.click();
    } else {
      console.log('   ⚠️  Botão não encontrado, pressionando Enter...');
      await campoSenha.press('Enter');
    }
    
    // 6. Aguardar conclusão do login
    console.log('   ⏳ Aguardando login...');
    await page.waitForTimeout(3000);
    
    // Verificar se login foi bem-sucedido
    const urlAposLogin = page.url().toLowerCase();
    if (urlAposLogin.includes('login') || urlAposLogin.includes('autenticacao')) {
      throw new Error('Login falhou. Verifique suas credenciais.');
    }
    
    console.log('✅ Login realizado com sucesso!');
    console.log(`   📍 URL: ${page.url()}`);
    return true;
    
  } catch (err) {
    console.error(`❌ Erro no login: ${err.message}`);
    return false;
  }
}

/**
 * 🔍 FUNÇÃO: Abre WFM para inspeção manual
 */
async function abrirWFM(page, config) {
  const cfg = config?.wfm;
  
  if (!cfg || !cfg.urlBase) {
    console.error('❌ URL do WFM não configurada.');
    return;
  }
  
  console.log(`\n🔍 Abrindo WFM: ${cfg.urlBase}`);
  
  try {
    const timeoutNavegacao = config?.timeouts?.navegacao || 30000;
    
    await page.goto(cfg.urlBase, { 
      waitUntil: 'domcontentloaded', 
      timeout: timeoutNavegacao 
    });
    
    console.log('✅ Página carregada.');
    
  } catch (err) {
    console.error(`❌ Falha ao abrir: ${err.message}`);
  }
}

// 📦 EXPORTAÇÕES
module.exports = { 
  loginWFM,
  abrirWFM
};

// 💡 TESTE AUTÔNOMO
if (require.main === module) {
  (async () => {
    console.log('🚀 Teste de Login WFM\n');
    
    require('dotenv').config();
    const config = require('../config/config.js');
    
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
      const sucesso = await loginWFM(page, config);
      
      if (sucesso) {
        console.log('\n🎉 Login bem-sucedido! Aguardando 30s...');
        await page.waitForTimeout(30000);
      }
    } catch (err) {
      console.error('❌ Erro:', err);
    } finally {
      await browser.close();
    }
  })();
}
