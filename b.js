// login.js - Versão definitiva com tratamento robusto de redirect JSF
const { chromium } = require('playwright');
const readline = require('readline');

/**
 * FUNÇÕES AUXILIARES DE TERMINAL
 */
const perguntarSigla = () => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question('\nDigite a sigla para pesquisa (ex: SU): ', (resposta) => {
      rl.close();
      resolve(resposta.trim().toUpperCase());
    });
  });
};

const perguntarDadosBusca = () => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question('\nDigite o Número da Localidade (ex: 11000): ', (localidadeNumero) => {
      rl.question('Digite a Sigla do Site (ex: GU): ', (siteTexto) => {
        rl.close();
        resolve({ localidade: localidadeNumero.trim(), site: siteTexto.trim().toUpperCase() });
      });
    });
  });
};

/**
 * HELPER: Aguardar nova página com URL específica aparecer no contexto
 */
const aguardarPaginaComURL = async (context, urlPattern, timeout = 30000) => {
  const inicio = Date.now();
  
  while (Date.now() - inicio < timeout) {
    const pagina = context.pages().find(p => {
      try {
        return p.url().includes(urlPattern);
      } catch {
        return false;
      }
    });
    
    if (pagina) return pagina;
    await new Promise(r => setTimeout(r, 500));
  }
  
  return null;
};

// BLOCO PRINCIPAL
(async () => {
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: false
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. LOGIN
    console.log('Acessando a página de login...');
    await page.goto('http://sagreosp.telefonica.br/cpqd/caweb/login.xhtml', { waitUntil: 'load' });

    console.log('Preenchendo o usuário...');
    const campoUsuario = await page.locator('input[type="text"], input[id*="username"], input[id*="usuario"], input[id*="login"]').first();
    await campoUsuario.fill('A0161921');

    console.log('Preenchendo a senha...');
    const campoSenha = await page.locator('input[type="password"]').first();
    await campoSenha.fill('Wesley@161990');

    console.log('Clicando no botão de login...');
    const botaoEntrar = await page.locator('button[type="submit"], input[type="submit"], button:has-text("Entrar"), button:has-text("Login")').first();
    await botaoEntrar.click();
    console.log('Processo de login executado.');

    // 2. MÓDULO FACILITIES
    console.log('Aguardando o módulo Facilities Management...');
    const moduloFacilities = page.locator('#bxFacilitiesManagement a');
    await moduloFacilities.waitFor({ state: 'visible', timeout: 30000 });
    await moduloFacilities.click();
    console.log('✅ Módulo Facilities Management acionado!');

    // 3. SIGLA
    const sigla = await perguntarSigla();
    if (!sigla) {
      console.log('Nenhuma sigla digitada.');
      return;
    }

    // 4. FILTRO
    console.log('Aguardando o campo de pesquisa...');
    const campoFiltro = page.locator('#searchInput');
    await campoFiltro.waitFor({ state: 'visible', timeout: 15000 });
    await campoFiltro.fill(sigla);
    console.log(`✅ Filtro preenchido com: ${sigla}`);

    // 5. MONITOR DE ABAS
    console.log('\n🔍 Monitor de novas abas ativado.');
    
    context.on('page', async (novaAba) => {
      console.log('\n✨ [ALERTA]: Nova aba aberta pelo sistema!');
      
      try {
        console.log('⏳ Aguardando redirecionamento para Site Corrente...');
        await novaAba.waitForURL('**/CurrentSite.xhtml*', { waitUntil: 'load', timeout: 45000 });
        console.log(`🌐 URL: ${novaAba.url()}`);

        await novaAba.locator('#CurrentSiteInsertForm').waitFor({ state: 'visible', timeout: 20000 });
        
        const dados = await perguntarDadosBusca();
        
        console.log('Preenchendo Localidade...');
        await novaAba.locator('tr:has-text("Localidade") input[type="text"]').first().fill(dados.localidade);

        console.log('Preenchendo Site...');
        await novaAba.locator('tr:has-text("Site") input[type="text"]').first().fill(dados.site);

        console.log('Acionando a Lupa...');
        await novaAba.locator('tr:has-text("Site") button, tr:has-text("Site") a').first().click();
        await novaAba.waitForTimeout(2000);

        console.log('Localizando botão "Definir"...');
        const botaoDefinir = novaAba.locator('button:has-text("Definir"), input[type="submit"][value="Definir"], .ui-button:has-text("Definir")').first();
        await botaoDefinir.waitFor({ state: 'visible', timeout: 10000 });
        await botaoDefinir.focus();
        await novaAba.keyboard.press('Enter');
        console.log('✅ Botão Definir acionado.');

        // 6. AGUARDAR LAYOUT BASE
        console.log('\n⏳ Aguardando resposta do sistema...');
        await novaAba.waitForFunction(() => {
          return window.location.href.includes('layout.xhtml') || 
                 window.location.href.includes('ManeuverFttxResource.xhtml');
        }, { timeout: 45000 });

        const urlAtual = novaAba.url();

        if (urlAtual.includes('layout.xhtml')) {
          console.log('📌 [CONFIRMADO]: Página de LAYOUT BASE detectada.');
          
          const match = urlAtual.match(/cid=(\d+)/);
          if (!match || !match[1]) {
            console.log('⚠️ Falha ao extrair CID da URL.');
            return;
          }
          
          const cid = match[1].trim();
          console.log(`🆔 CID detectado: ${cid}`);
          
          const URLManobras = `http://sagreosp.telefonica.br/cpqd/oper/ManeuverFttxResource/ManeuverFttxResource.xhtml?faces-redirect=true&cid=${cid}`;
          console.log(`🚀 Navegando para: ${URLManobras}`);

          // ====================================================================
          // 🔑 SOLUÇÃO DEFINITIVA: Capturar nova página APÓS o goto
          // ====================================================================
          
          // Lista de abas ANTES do goto (para comparar depois)
          const abasAntes = new Set(context.pages().map(p => {
            try { return p.url(); } catch { return null; }
          }).filter(Boolean));
          
          console.log(`📊 Abas antes do goto: ${abasAntes.size}`);
          
          // Executa o goto em try/catch (pode falhar porque a página é destruída)
          try {
            await novaAba.goto(URLManobras, { waitUntil: 'load', timeout: 30000 });
          } catch (e) {
            console.log(`⚠️ goto lançou exceção (esperado no JSF): ${e.message.substring(0, 80)}...`);
          }
          
          // Aguarda um pouco para o navegador processar
          await new Promise(r => setTimeout(r, 2000));
          
          // Procura a página de Manobras entre as abas atuais
          console.log('🔍 Procurando a página de Manobras entre as abas...');
          const paginaManobras = await aguardarPaginaComURL(context, 'ManeuverFttxResource', 30000);
          
          if (!paginaManobras) {
            // Se não encontrou, lista todas as abas para debug
            console.log('❌ Página de Manobras não encontrada. Abas atuais:');
            context.pages().forEach((p, i) => {
              try { console.log(`   [${i}] ${p.url()}`); } catch { console.log(`   [${i}] (fechada)`); }
            });
            throw new Error('Não foi possível localizar a página de Manobras após o redirect.');
          }
          
          console.log(`✅ Página de Manobras encontrada: ${paginaManobras.url()}`);
          
          // Aguarda estabilização
          console.log('⏳ Aguardando estabilização da página...');
          try {
            await paginaManobras.waitForLoadState('networkidle', { timeout: 20000 });
          } catch {
            console.log('⚠️ networkidle não atingido, prosseguindo...');
          }
          
          await paginaManobras.waitForTimeout(2000);
          console.log(`🌐 URL final: ${paginaManobras.url()}`);
          console.log('🚀 SUCESSO! Tela de Manobras aberta e estável.');
          
        } else if (urlAtual.includes('ManeuverFttxResource')) {
          console.log('🚀 O sistema já redirecionou direto para Manobras!');
          console.log(`🌐 URL: ${urlAtual}`);
        }

      } catch (erroAba) {
        console.error('❌ Erro no monitoramento da nova aba:', erroAba.message);
      }
    });

    // 7. SELEÇÃO DO BANCO
    console.log(`Aguardando banco terminado em _${sigla}...`);
    const opcaoBanco = page.locator(`[id$="_${sigla}"] a`);
    await opcaoBanco.waitFor({ state: 'visible', timeout: 15000 });
    await opcaoBanco.click();
    console.log('✅ Banco de dados selecionado!');

    // Mantém o script ativo
    await page.waitForTimeout(300000);

  } catch (error) {
    console.error('❌ Erro durante a execução:', error.message);
  }
})();
