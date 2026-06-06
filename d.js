// src/lib/gps-next/subroutine/process/abrirPainelTipificacao.js
const { aguardarPrimeFaces } = require("../../../../utils/helpers");

/**
 * Tenta localizar e clicar no botão de Tipificar/Editar para abrir o painel
 */
async function abrirPainelTipificacao(page) {
  const botoes = [
    "[id='formDadosClienteAtendimento:btnTipificar']",
    "[id='formDadosClienteAtendimento:btnEditar']",
    '[id*="tipificacao"] button',
    '[data-testid="btn-tipificar"]',
  ];

  for (const sel of botoes) {
    try {
      const el = await page.$(sel);
      if (el && (await el.isVisible())) {
        await el.click();
        await aguardarPrimeFaces(page, 5000);
        return;
      }
    } catch { /* Tenta o próximo seletor */ }
  }
}

module.exports = { abrirPainelTipificacao };
