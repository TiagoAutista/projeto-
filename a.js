// Importa a biblioteca Playwright para controlar o navegador Microsoft Edge
const { chromium } = require('playwright');
// Importa o módulo nativo Readline para permitir perguntas e respostas no terminal
const readline = require('readline');

/**
 * FUNÇÕES AUXILIARES DE TERMINAL (Readline)
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

// Solicita as informações na ordem correta da tela
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

// BLOCO PRINCIPAL ASSÍNCRONO
(async () => {
  
  // 1. INICIALIZAÇÃO DO NAVEGADOR
  const browser = await chromium.launch({
    channel: 'msedge', 
    headless: false 
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 2. ACESSO AO SISTEMA CORPORATIVO (TELA DE LOGIN)
    console.log('Acessando a página de login...');
    await page.goto('http://sagreosp.telefonica.br/cpqd/caweb/login.xhtml', {
      waitUntil: 'load'
    });

    // 3. PREENCHIMENTO DAS CREDENCIAIS DE ACESSO
    console.log('Preenchendo o usuário...');
    const campoUsuario = await page.locator('input[type="text"], input[id*="username"], input[id*="usuario"], input[id*="login"]').first();
    await campoUsuario.fill('A0161921');

    console.log('Preenchendo a senha...');
    const campoSenha = await page.locator('input[type="password"]').first();
    await campoSenha.fill('Wesley@161990');

    // 4. CLIQUE NO BOTÃO DE ENTRAR
    console.log('Clicando no botão de login...');
    const botaoEntrar = await page.locator('button[type="submit"], input[type="submit"], button:has-text("Entrar"), button:has-text("Login")').first();
    await botaoEntrar.click();
    console.log('Processo de login executado. Aguardando a página inicial...');

    // 5. ENTRADA NO MÓDULO FACILITIES
    console.log('Aguardando o módulo Facilities Management aparecer na tela...');
    const moduloFacilities = page.locator('#bxFacilitiesManagement a');
    await moduloFacilities.waitFor({ state: 'visible', timeout: 30000 });
    
    console.log('Clicando no módulo Facilities Management...');
    await moduloFacilities.click();
    console.log('Módulo Facilities Management acionado com sucesso!');

    // 6. SOLICITAÇÃO DA SIGLA NO TERMINAL
    const sigla = await perguntarSigla();
    
    if (!sigla) {
      console.log('Nenhuma sigla digitada. O filtro não será preenchido.');
    } else {
      // 7. PREENCHIMENTO DO FILTRO
      console.log('Aguardando o campo de pesquisa aparecer na tela...');
      const campoFiltro = page.locator('#searchInput');
      await campoFiltro.waitFor({ state: 'visible', timeout: 15000 });
      
      console.log(`Preenchendo o filtro com a sigla: ${sigla}`);
      await campoFiltro.fill(sigla);
      console.log('Filtro acionado e preenchido com sucesso!');

      // --- MONITOR DINÂMICO DE ABAS ---
      console.log('\n🔍 Monitor de novas abas do Edge ativado. Aguardando abertura de páginas...');
      
      context.on('page', async (novaAba) => {
        console.log('\n✨ [ALERTA]: Uma nova janela/aba do Edge foi aberta pelo sistema!');
        
        try {
          console.log('⏳ Aguardando o redirecionamento final para o link do Site Corrente...');
          await novaAba.waitForURL('**/CurrentSite.xhtml*', { waitUntil: 'load', timeout: 45000 });
          
          const urlNovaAba = novaAba.url();
          console.log(`🌐 URL final da nova aba: ${urlNovaAba}`);

          // Aguarda o formulário do Site Corrente estar visível
          console.log('Aguardando a renderização do formulário principal...');
          await novaAba.locator('#CurrentSiteInsertForm').waitFor({ state: 'visible', timeout: 20000 });
          
          // Pergunta os dados no terminal (Número em Localidade, Letras em Site)
          const dados = await perguntarDadosBusca();
          
          console.log('Preenchendo o Número no campo Localidade...');
          const campoLocalidade = novaAba.locator('tr:has-text("Localidade") input[type="text"]').first();
          await campoLocalidade.fill(dados.localidade);

          console.log('Preenchendo a Sigla no campo Site...');
          const campoSite = novaAba.locator('tr:has-text("Site") input[type="text"]').first();
          await campoSite.fill(dados.site);

          console.log('Acionando o botão de busca da Lupa (Site)...');
          const botaoLupaSite = novaAba.locator('tr:has-text("Site") button, tr:has-text("Site") a').first();
          await botaoLupaSite.click();
          
          console.log('Aguardando processamento interno da busca (2 segundos)...');
          await novaAba.waitForTimeout(2000);

          console.log('Localizando o botão "Definir"...');
          const botaoDefinir = novaAba.locator('button:has-text("Definir"), input[type="submit"][value="Definir"], .ui-button:has-text("Definir")').first();
          await botaoDefinir.waitFor({ state: 'visible', timeout: 10000 });
          
          console.log('Focando no botão e pressing [ENTER]...');
          await botaoDefinir.focus();
          await novaAba.keyboard.press('Enter');
          console.log('Botão Definir acionado.');

          // --- IDENTIFICAÇÃO DA PÁGINA LAYOUT E REDIRECIONAMENTO CORRIGIDO ---
          console.log('\n⏳ Aguardando a resposta do sistema após a definição...');
          
          await novaAba.waitForFunction(() => {
            const endereco = window.location.href;
            return endereco.includes('layout.xhtml') || endereco.includes('ManeuverFttxResource.xhtml');
          }, { timeout: 45000 });

          const urlAtual = novaAba.url();

          if (urlAtual.includes('layout.xhtml')) {
            console.log('📌 [CONFIRMADO]: O navegador caiu na página de LAYOUT BASE.');
            
            const encontrarCid = urlAtual.match(/cid=(\d+)/);
            if (encontrarCid && encontrarCid[1]) {
              // Limpa aspas ou espaços que possam vir do sistema
              const cidDetectado = encontrarCid[1].replace(/['"]/g, '').trim();
              console.log(`🆔 [NÚMERO DO CID DETECTADO COM SUCESSO]: ${cidDetectado}`);
              
              // Correção da interpolação: Monta a URL injetando o número limpo de forma real
              const URLManobrasCorreta = `http://sagreosp.telefonica.br/cpqd/oper/ManeuverFttxResource/ManeuverFttxResource.xhtml?faces-redirect=true&cid=${cidDetectado}`;
              
              console.log(`🚀 Forçando navegação física na barra de endereços para: ${URLManobrasCorreta}`);
              await novaAba.goto(URLManobrasCorreta, { waitUntil: 'load' });
            } else {
              console.log('⚠️ Página de layout detectada, mas falhou ao isolar os dígitos do "cid=".');
            }
          }

          // Confirmação absoluta de chegada na tela final de Manobras
          console.log('\n⏳ Aguardando estabilização da tela de Manobras (ManeuverFttxResource)...');
          await novaAba.waitForURL('**/ManeuverFttxResource/ManeuverFttxResource.xhtml*', {
            waitUntil: 'load',
            timeout: 45000
          });

          console.log(`🌐 URL de Manobras confirmada no navegador: ${novaAba.url()}`);
          await novaAba.waitForTimeout(3000);
          console.log('🚀 Sucesso total! A tela de Manobras está aberta com o CID numérico correto.');

        } catch (erroAba) {
          console.error('❌ Erro no monitoramento ou preenchimento da nova aba:', erroAba.message);
        }
      });

      // 8. SELEÇÃO DINÂMICA DO BANCO DE DADOS
      console.log(`Aguardando o banco terminado em _${sigla} aparecer na tela...`);
      const opcaoBanco = page.locator(`[id$="_${sigla}"] a`);
      await opcaoBanco.waitFor({ state: 'visible', timeout: 15000 });
      
      console.log(`Clicando para selecionar o banco de dados correspondente a (${sigla})...`);
      await opcaoBanco.click();
      console.log('Banco de dados selecionado com sucesso!');

      // Mantém ativo para processar as ações assíncronas no monitor da nova aba
      await page.waitForTimeout(300000);
    }

  } catch (error) {
    console.error('Ocorreu um erro durante a execução:', error);
  }
})();
