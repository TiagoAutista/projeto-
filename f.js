// src/lib/gps-next/subroutine/process/aplicarTipificacao.js
const { delay, aguardarPrimeFaces, clicarItemPorTexto } = require("../../../../utils/helpers");

/**
 * Percorre a lista de itens de tipificação do config e clica na árvore
 */
async function aplicarTipificacao(page, cfg) {
  if (!cfg.itens || cfg.itens.length === 0) return;

  const seletoresLista = cfg.seletorLista ? [cfg.seletorLista] : [];
  
  for (const item of cfg.itens) {
    const clicou = await clicarItemPorTexto(page, item, seletoresLista);
    if (!clicou) {
      console.warn(`\n      ⚠️  Elemento não localizado na árvore: "${item}"`);
    }
    await aguardarPrimeFaces(page, 3000);
    await delay(500); 
  }
}

module.exports = { aplicarTipificacao };
