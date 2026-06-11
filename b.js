// login.js - Versão com fallback de nova aba manual
const { chromium } = require('playwright');
const readline = require('readline');

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

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // LOGIN
    console.log('Acessando login...');
    await page.goto('http://sagreosp.telefonica.br/cpqd/caweb/login.xhtml', { waitUntil: 'load' });
    await page.locator('input[type="text"], input[id*="username"], input[id*="usuario"], input[id*="login"]').first().fill('A0161921');
    await page.locator('input[type="password"]').first().fill('Wesley@161990');
    await page.locator('button[type="submit"], input[type="submit"], button:has-text("Entrar"), button:has-text("Login")').first().click();
    console.log('✅ Login executado.');

    // FACILITIES
    console.log('Aguardando Facilities Management...');
    const moduloFacilities = page.locator('#bxFacilitiesManagement a');
    await moduloFacilities.waitFor({ state: 'visible', timeout: 30000 });
    await moduloFacilities.click();
    console.log('✅ Facilities acionado!');

    // SIGLA
    const sigla = await perguntarSigla();
    if (!sigla) return;

    // FILTRO
    console.log('Preenchendo filtro...');
    const campoFiltro = page.locator('#searchInput');
    await campoFiltro.waitFor({ state: 'visible', timeout: 15000 });
    await campoFiltro.fill(sigla);
    console.log(`✅ Filtro: ${sigla}`);

    // MONITOR DE ABAS
    context.on('page', async (novaAba) => {
      console.log('\n✨ Nova aba aberta!');
      
      try {
        await novaAba.waitForURL('**/CurrentSite.xhtml*', { waitUntil: 'load', timeout: 45000 });
        console.log(`🌐 URL: ${novaAba.url()}`);

        await novaAba.locator('#CurrentSiteInsertForm').waitFor({ state: 'visible', timeout: 20000 });
        
        const dados = await perguntarDadosBusca();
        
        await novaAba.locator('tr:has-text("Localidade") input[type="text"]').first().fill(dados.localidade);
        await novaAba.locator('tr:has-text("Site") input[type="text"]').first().fill(dados.site);
        await novaAba.locator('tr:has-text("Site") button, tr:has-text("Site") a').first().click();
        await novaAba.waitForTimeout(2000);

        const botaoDefinir = novaAba.locator('button:has-text("Definir"), input[type="submit"][value="Definir"], .ui-button:has-text("Definir")').first();
        await botaoDefinir.waitFor({ state: 'visible', timeout: 10000 });
        await botaoDefinir.focus();
        await novaAba.keyboard.press('Enter');
        console.log('✅ Botão Definir acionado.');

        // AGUARDAR LAYOUT
        console.log('⏳ Aguardando resposta...');
        await novaAba.waitForFunction(() => {
          return window.location.href.includes('layout.xhtml') || 
                 window.location.href.includes('ManeuverFttxResource.xhtml');
        }, { timeout: 45000 });

        const urlAtual = novaAba.url();

        if (urlAtual.includes('layout.xhtml')) {
          console.log('📌 LAYOUT BASE detectado.');
          
          const match = urlAtual.match(/cid=(\d+)/);
          if (!match || !match[1]) {
            console.log('⚠️ CID não encontrado.');
            return;
          }
          
          const cid = match[1].trim();
          console.log(`🆔 CID: ${cid}`);
          
          const URLManobras = `http://sagreosp.telefonica.br/cpqd/oper/ManeuverFttxResource/ManeuverFttxResource.xhtml?faces-redirect=true&cid=${cid}`;
          console.log(`🚀 Navegando para Manobras...`);

          // ====================================================================
          // 🔑 SOLUÇÃO: Tentar goto, se falhar, abrir nova aba manualmente
          // ====================================================================
          
          let paginaManobras = null;
          
          // Tentativa 1: goto normal
          try {
            console.log('🔄 Tentativa 1: goto na mesma aba...');
            await novaAba.goto(URLManobras, { waitUntil: 'load', timeout: 15000 });
            await novaAba.waitForTimeout(2000);
            
            if (novaAba.url().includes('ManeuverFttxResource')) {
              paginaManobras = novaAba;
              console.log('✅ Tentativa 1 funcionou!');
            }
          } catch (e) {
            console.log(`⚠️ Tentativa 1 falhou: ${e.message.substring(0, 60)}...`);
          }
          
          // Tentativa 2: procurar em todas as abas
          if (!paginaManobras) {
            console.log('🔄 Tentativa 2: procurando em todas as abas...');
            await new Promise(r => setTimeout(r, 2000));
            
            const todasAbas = context.pages();
            paginaManobras = todasAbas.find(p => {
              try { return p.url().includes('ManeuverFttxResource'); } 
              catch { return false; }
            });
            
            if (paginaManobras) {
              console.log('✅ Encontrado em outra aba!');
            }
          }
          
          // Tentativa 3: abrir nova aba manualmente
          if (!paginaManobras) {
            console.log('🔄 Tentativa 3: abrindo nova aba manualmente...');
            
            // Remove o faces-redirect=true para evitar o redirect agressivo
            const URLManobrasDireta = URLManobras.replace('faces-redirect=true&', '');
            
            paginaManobras = await context.newPage();
            try {
              await paginaManobras.goto(URLManobrasDireta, { waitUntil: 'load', timeout: 30000 });
              console.log('✅ Nova aba aberta com sucesso!');
            } catch (e) {
              console.log(`⚠️ Nova aba também falhou: ${e.message.substring(0, 60)}...`);
              
              // Tentativa 4: tentar com a URL original
              console.log('🔄 Tentativa 4: tentando com URL original...');
              try {
                await paginaManobras.goto(URLManobras, { waitUntil: 'load', timeout: 30000 });
                console.log('✅ Tentativa 4 funcionou!');
              } catch (e2) {
                console.log(`❌ Todas as tentativas falharam.`);
                throw new Error('Não foi possível acessar a página de Manobras.');
              }
            }
          }
          
          // Aguarda estabilização
          console.log('⏳ Aguardando estabilização...');
          try {
            await paginaManobras.waitForLoadState('networkidle', { timeout: 20000 });
          } catch {
            console.log('⚠️ networkidle não atingido.');
          }
          
          await paginaManobras.waitForTimeout(3000);
          console.log(`🌐 URL final: ${paginaManobras.url()}`);
          console.log('🚀 SUCESSO! Tela de Manobras aberta.');
          
        } else if (urlAtual.includes('ManeuverFttxResource')) {
          console.log('🚀 Já está em Manobras!');
          console.log(`🌐 URL: ${urlAtual}`);
        }

      } catch (erroAba) {
        console.error('❌ Erro:', erroAba.message);
      }
    });

    // BANCO
    console.log(`Aguardando banco _${sigla}...`);
    const opcaoBanco = page.locator(`[id$="_${sigla}"] a`);
    await opcaoBanco.waitFor({ state: 'visible', timeout: 15000 });
    await opcaoBanco.click();
    console.log('✅ Banco selecionado!');

    await page.waitForTimeout(300000);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
})();
