// src/lib/gps-next/subroutine/process/injetarDocumento.js
const { delay, aguardarPrimeFaces } = require("../../../../utils/helpers");

/**
 * Garante a URL estável, injeta o CPF no campo e dispara a busca
 * @returns {Object} - { sessaoExpirada: boolean }
 */
async function injetarDocumento(page, docLimpo, config) {
  const urlEstavel = config.gps?.urlBase 
    ? `${config.gps.urlBase.replace(/\/$/, '')}/gps/atendimento/index.jsf`
    : "http://redecorp.br";
  
  if (page.url() !== urlEstavel && !page.url().includes("index.jsf")) {
    await page.goto(urlEstavel, { waitUntil: "domcontentloaded", timeout: 45000 });
    await aguardarPrimeFaces(page, 15000);
  }

  const seletorCampo = "input[id*='documento'], input[id*='doc'], .ui-inputfield[placeholder*='Documento']";
  const seletorLupa = '[id="formFiltroPesquisa:buttonPesquisa"]';

  await page.waitForSelector(seletorCampo, { timeout: 15000 });
  await page.click(seletorCampo, { clickCount: 3 });
  await page.keyboard.press('Backspace');
  await delay(200);
  
  await page.type(seletorCampo, docLimpo, { delay: 100 });
  await delay(300);

  await page.waitForSelector(seletorLupa, { timeout: 5000 });
  await page.click(seletorLupa);
  
  await aguardarPrimeFaces(page, 30000);
  await delay(2000);

  const urlAtual = page.url().toLowerCase();
  if (urlAtual.includes("login") || urlAtual.includes("autenticacao")) {
    return { sessaoExpirada: true };
  }

  return { sessaoExpirada: false };
}

module.exports = { injetarDocumento };
