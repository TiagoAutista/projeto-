// src/lib/gps-next/subroutine/process/aplicarTipificacao.js
const { delay, aguardarPrimeFaces } = require("../../../../utils/helpers");

/**
 * Aplica a tipificação de forma segura, evitando cliques duplicados
 * em árvores do PrimeFaces
 */
async function aplicarTipificacao(page, cfg) {
  if (!cfg.itens || cfg.itens.length === 0) {
    console.log("      ℹ️  Nenhum item de tipificação configurado.");
    return;
  }

  // 🛡️ BLINDAGEM 1: Remove duplicatas da lista
  const itensUnicos = [...new Set(cfg.itens.map(i => String(i).trim()))];
  
  if (itensUnicos.length < cfg.itens.length) {
    console.warn(`      ⚠️  Detectados ${cfg.itens.length - itensUnicos.length} itens duplicados no config.`);
  }

  // 🛡️ BLINDAGEM 2: Parseia os seletores e usa APENAS o primeiro que encontrar elementos
  // Isso evita que o robô tente múltiplos seletores e clique no mesmo item várias vezes
  const seletoresRaw = cfg.seletorLista 
    ? cfg.seletorLista.split(',').map(s => s.trim())
    : ['.ui-selectonemenu-item', '.ui-selectonemenu-list-item', 'li.ui-selectlistbox-item'];

  console.log(`\n      🌳 Aplicando ${itensUnicos.length} níveis de tipificação...`);

  for (let index = 0; index < itensUnicos.length; index++) {
    const item = itensUnicos[index];
    const nivel = index + 1;
    
    console.log(`\n      📍 Nível ${nivel}/${itensUnicos.length}: "${item}"`);

    // 🛡️ BLINDAGEM 3: Verifica se o item JÁ está selecionado antes de clicar
    const jaSelecionado = await verificarSeJaSelecionado(page, item);
    
    if (jaSelecionado) {
      console.log(`      ✅ "${item}" já está selecionado (auto-seleção detectada). Pulando clique.`);
      await delay(500);
      continue;
    }

    // 🛡️ BLINDAGEM 4: Tenta clicar usando APENAS UM seletor por vez
    // Para no primeiro que funcionar (evita cliques duplicados)
    const clicou = await clicarComPrimeiroSeletorValido(page, item, seletoresRaw);
    
    if (!clicou) {
      console.error(`      ❌ Elemento não localizado em nenhum seletor: "${item}"`);
    } else {
      console.log(`      ✅ Clique realizado com sucesso em "${item}"`);
    }

    // 🛡️ BLINDAGEM 5: Aguarda o AJAX do PrimeFaces processar completamente
    // Aumentei o delay para evitar race conditions
    await aguardarPrimeFaces(page, 5000);
    await delay(1000); // Delay extra para estabilização do DOM
  }

  console.log(`\n      🎉 Tipificação concluída com sucesso.`);
}

/**
 * Tenta clicar no item usando apenas o primeiro seletor que encontrar elementos
 * Retorna true se conseguiu clicar, false caso contrário
 */
async function clicarComPrimeiroSeletorValido(page, textoItem, seletores) {
  const textoLower = textoItem.toLowerCase().trim();
  
  for (const seletor of seletores) {
    try {
      const clicou = await page.evaluate((seletor, texto) => {
        const elementos = document.querySelectorAll(seletor);
        
        for (const el of elementos) {
          const textoEl = el.innerText?.toLowerCase().trim();
          
          if (textoEl === texto) {
            // Verifica se o elemento está visível e clicável
            const rect = el.getBoundingClientRect();
            const isVisible = rect.width > 0 && rect.height > 0;
            
            if (isVisible) {
              el.scrollIntoView({ block: 'center', behavior: 'instant' });
              el.click();
              return true;
            }
          }
        }
        
        return false;
      }, seletor, textoLower);
      
      if (clicou) {
        console.log(`      ✓ Encontrado e clicado usando seletor: ${seletor}`);
        return true;
      }
    } catch (err) {
      // Se der erro neste seletor, tenta o próximo
      continue;
    }
  }
  
  return false;
}

/**
 * Verifica se um item já está selecionado na árvore/menu
 */
async function verificarSeJaSelecionado(page, textoItem) {
  try {
    const resultado = await page.evaluate((texto) => {
      const textoLower = texto.toLowerCase().trim();
      
      // Verifica em todos os tipos de componentes PrimeFaces
      const seletoresCheck = [
        '.ui-selectonemenu-item.ui-state-highlight',
        '.ui-selectonemenu-item.ui-state-active',
        '.ui-selectlistbox-item.ui-state-highlight',
        '.ui-treenode-selected',
        '[aria-selected="true"]',
        '.ui-state-highlight'
      ];
      
      for (const seletor of seletoresCheck) {
        const elementos = document.querySelectorAll(seletor);
        
        for (const el of elementos) {
          const textoEl = el.innerText?.toLowerCase().trim();
          if (textoEl === textoLower) {
            return true;
          }
        }
      }
      
      return false;
    }, textoItem);
    
    return resultado;
  } catch (err) {
    return false;
  }
}

module.exports = { aplicarTipificacao };
