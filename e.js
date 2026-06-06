// src/lib/gps-next/subroutine/process/selecionarEndereco.js
const { delay, aguardarPrimeFaces, clicarItemPorTexto } = require("../../../../utils/helpers");

/**
 * Abre o menu de endereços e seleciona a opção correspondente ao CSV
 * @returns {boolean} - True se o endereço foi encontrado e clicado
 */
async function selecionarEndereco(page, enderecoAlvo) {
  console.log(`\n      🔍 Localizando endereço para: "${enderecoAlvo}"...`);
  
  const seletorMenu = "[id*='menuEndereco'], .ui-selectonemenu-trigger, .ui-selectonemenu";
  try {
    const menu = await page.$(seletorMenu);
    if (menu) {
      await menu.click(); 
      await delay(500);
      await aguardarPrimeFaces(page, 2000);
    }
  } catch (err) {
    console.warn(`      ⚠️  Aviso ao interagir com o gatilho do menu: ${err.message}`);
  }

  const encontrou = await clicarItemPorTexto(page, enderecoAlvo, [".ui-selectonemenu-item"]);
  
  if (!encontrou) {
    console.warn(`      ⚠️  Alerta: Não foi possível marcar o endereço "${enderecoAlvo}" na tela.`);
    return false;
  } 
  
  console.log(`      ✅ Endereço mapeado e selecionado com sucesso.`);
  await aguardarPrimeFaces(page, 3000);
  await delay(500);
  return true;
}

module.exports = { selecionarEndereco };
