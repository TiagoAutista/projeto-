src/software/util
src/software/index.js

Quero igual a esse codigo porem com esse link http://appwfm.gvt.net.br/wfm-search/detalhesWorkOrder.xhtml?wo=7613204754

// cpqd.js - Módulo do Robô CPQD/Telefônica
const { chromium } = require('playwright');
const chalk = require('chalk'); // 👈 ADICIONE ESTA LINHA AQUI
const { perguntar, aguardarEnter, limparTela, validarNumero, exibirCabecalho } = require('./utils');

let browser = null;
let context = null;
let page = null;
let logado = false;

const CREDENCIAIS = { usuario: 'A0161921', senha: 'Wesley@161990' };

const getStatus = () => ({ logado, navegadorAberto: !!browser });

const iniciarNavegador = async () => {
  if (browser) return true;
  console.log('\n⚙️ Iniciando navegador Edge para CPQD...');
  browser = await chromium.launch({ channel: 'msedge', headless: false });
  context = await browser.newContext();
  page = await context.newPage();
  await page.goto('about:blank');
  console.log('✅ Navegador CPQD iniciado!\n');
  return true;
};

const fecharNavegador = async () => {
  if (browser) {
    await browser.close();
    browser = null; context = null; page = null; logado = false;
    console.log('✅ Navegador CPQD fechado!');
  }
};

const fazerLogin = async () => {
  console.log('🔐 Acessando página de login do CPQD...');
  await page.goto('http://sagreosp.telefonica.br/cpqd/caweb/login.xhtml', { waitUntil: 'load' });
  console.log('⚙️ Preenchendo credenciais...');
  await page.locator('input[type="text"], input[id*="username"], input[id*="usuario"]').first().fill(CREDENCIAIS.usuario);
  await page.locator('input[type="password"]').first().fill(CREDENCIAIS.senha);
  await page.locator('button[type="submit"], input[type="submit"], button:has-text("Entrar")').first().click();
  await page.waitForTimeout(3000);
  
  try {
    await page.waitForSelector('#bxFacilitiesManagement', { timeout: 10000 });
    console.log('✅ Login executado com sucesso!');
    logado = true;
    return true;
  } catch {
    console.log('❌ Falha no login. Verifique as credenciais.');
    return false;
  }
};

const abrirFacilities = async (rl) => {
  console.log('\n🏢 Abrindo Facilities Management...');
  const modulo = page.locator('#bxFacilitiesManagement a');
  await modulo.waitFor({ state: 'visible', timeout: 30000 });
  await modulo.click();
  console.log('✅ Facilities Management aberto!');
  await aguardarEnter(rl);
};

const abrirSiteCorrente = async (rl) => {
  console.log('\n📍 Abrindo Site Corrente...');
  const modulo = page.locator('#bxFacilitiesManagement a');
  await modulo.waitFor({ state: 'visible', timeout: 30000 });
  await modulo.click();
  
  const sigla = (await perguntar(rl, '\n📍 Digite a sigla (ex: SU): ')).toUpperCase();
  if (!sigla) return console.log('⚠️ Nenhuma sigla digitada.');
  
  const campoFiltro = page.locator('#searchInput');
  await campoFiltro.waitFor({ state: 'visible', timeout: 15000 });
  await campoFiltro.fill(sigla);
  
  const promessaNovaAba = context.waitForEvent('page', { timeout: 60000 });
  const opcaoBanco = page.locator(`[id$="_${sigla}"] a`);
  await opcaoBanco.waitFor({ state: 'visible', timeout: 15000 });
  await opcaoBanco.click();
  
  const novaAba = await promessaNovaAba;
  await novaAba.waitForURL('**/CurrentSite.xhtml*', { waitUntil: 'load', timeout: 45000 });
  console.log(`🌐 Site Corrente aberto: ${novaAba.url()}`);
  await aguardarEnter(rl);
};

const abrirManobrasPorCID = async (rl) => {
  const cid = await perguntar(rl, '\n🆔 Digite o número do CID: ');
  if (!validarNumero(cid, 'CID')) return;
  
  const URLManobras = `http://sagreosp.telefonica.br/cpqd/oper/ManeuverFttxResource/ManeuverFttxResource.xhtml?faces-redirect=true&cid=${cid}`;
  console.log(`\n🚀 Abrindo Manobras com CID: ${cid}`);
  
  const paginaManobras = await context.newPage();
  try {
    await paginaManobras.goto(URLManobras, { waitUntil: 'load', timeout: 30000 });
  } catch {
    await paginaManobras.goto(URLManobras.replace('faces-redirect=true&', ''), { waitUntil: 'load', timeout: 30000 });
  }
  await paginaManobras.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  console.log(`✅ Manobras aberta: ${paginaManobras.url()}`);
  await aguardarEnter(rl);
};

const modoInspecao = async (rl) => {
  console.log('\n👁️ Modo Inspeção...');
  await page.goto('http://sagreosp.telefonica.br/cpqd/caweb/login.xhtml', { waitUntil: 'load' });
  console.log('📋 Navegue livremente pelo sistema.');
  await aguardarEnter(rl);
};

const fluxoCompleto = async (rl) => {
  console.log('\n🚀 Iniciando FLUXO COMPLETO...\n');
  const modulo = page.locator('#bxFacilitiesManagement a');
  await modulo.waitFor({ state: 'visible', timeout: 30000 });
  await modulo.click();
  
  const sigla = (await perguntar(rl, '\n📍 Digite a sigla: ')).toUpperCase();
  if (!sigla) return;
  
  const campoFiltro = page.locator('#searchInput');
  await campoFiltro.waitFor({ state: 'visible', timeout: 15000 });
  await campoFiltro.fill(sigla);
  
  const promessaNovaAba = context.waitForEvent('page', { timeout: 60000 });
  const opcaoBanco = page.locator(`[id$="_${sigla}"] a`);
  await opcaoBanco.waitFor({ state: 'visible', timeout: 15000 });
  await opcaoBanco.click();
  
  try {
    const novaAba = await promessaNovaAba;
    await novaAba.waitForURL('**/CurrentSite.xhtml*', { waitUntil: 'load', timeout: 45000 });
    await novaAba.locator('#CurrentSiteInsertForm').waitFor({ state: 'visible', timeout: 20000 });
    
    const localidade = await perguntar(rl, '\n🔢 Número da Localidade: ');
    const site = (await perguntar(rl, '🏢 Sigla do Site: ')).toUpperCase();
    
    await novaAba.locator('tr:has-text("Localidade") input[type="text"]').first().fill(localidade);
    await novaAba.locator('tr:has-text("Site") input[type="text"]').first().fill(site);
    await novaAba.locator('tr:has-text("Site") button, tr:has-text("Site") a').first().click();
    await novaAba.waitForTimeout(2000);
    
    const botaoDefinir = novaAba.locator('button:has-text("Definir"), .ui-button:has-text("Definir")').first();
    await botaoDefinir.waitFor({ state: 'visible', timeout: 10000 });
    await novaAba.keyboard.press('Enter');
    
    await novaAba.waitForFunction(() => window.location.href.includes('layout.xhtml') || window.location.href.includes('ManeuverFttxResource.xhtml'), { timeout: 45000 });
    
    const urlAtual = novaAba.url();
    if (urlAtual.includes('layout.xhtml')) {
      const match = urlAtual.match(/cid=(\d+)/);
      if (!match) return console.log('⚠️ CID não encontrado.');
      
      const cid = match[1];
      const URLManobras = `http://sagreosp.telefonica.br/cpqd/oper/ManeuverFttxResource/ManeuverFttxResource.xhtml?faces-redirect=true&cid=${cid}`;
      const paginaManobras = await context.newPage();
      await paginaManobras.goto(URLManobras, { waitUntil: 'load', timeout: 30000 }).catch(() => {});
      await paginaManobras.waitForTimeout(3000);
      console.log('\n🎉 FLUXO COMPLETO EXECUTADO!');
    } else if (urlAtual.includes('ManeuverFttxResource')) {
      console.log('🚀 Redirecionou direto para Manobras!');
    }
  } catch (erro) {
    console.error('❌ Erro no fluxo:', erro.message);
  }
  await aguardarEnter(rl);
};

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

module.exports = { menuCPQD, getStatus };
