// src/lib/gps-next/subroutine/process/aplicarTipificacao.js
const { delay, aguardarPrimeFaces, clicarItemPorTexto } = require("../../../../utils/helpers");

/**
 * Aplica a tipificação de forma segura, evitando cliques duplicados
 * em árvores do PrimeFaces que possuem auto-seleção
 */
async function aplicarTipificacao(page, cfg) {
  if (!cfg.itens || cfg.itens.length === 0) {
    console.log("      ℹ️  Nenhum item de tipificação configurado.");
    return;
  }

  // 🛡️ BLINDAGEM 1: Remove duplicatas da lista mantendo a ordem original
  const itensUnicos = [...new Set(cfg.itens.map(i => String(i).trim()))];
  
  if (itensUnicos.length < cfg.itens.length) {
    console.warn(`      ⚠️  Detectados ${cfg.itens.length - itensUnicos.length} itens duplicados no config. Removendo...`);
  }

  // 🛡️ BLINDAGEM 2: Define escopo restrito à árvore de tipificação
  // Isso evita que o robô clique em textos iguais que aparecem em menus, breadcrumbs, etc.
  const seletoresArvore = cfg.seletorLista 
    ? [cfg.seletorLista] 
    : [
        ".ui-tree",                          // Árvore padrão PrimeFaces
        "[id*='tipificacao'] .ui-tree",      // Árvore dentro do painel de tipificação
        ".ui-selectonetree",                 // Componente de árvore de seleção única
        "[id*='tree']",                      // Fallback genérico
      ];

  console.log(`\n      🌳 Aplicando ${itensUnicos.length} níveis de tipificação...`);

  for (let index = 0; index < itensUnicos.length; index++) {
    const item = itensUnicos[index];
    const nivel = index + 1;
    
    console.log(`      📍 Nível ${nivel}/${itensUnicos.length}: "${item}"`);

    // 🛡️ BLINDAGEM 3: Verifica se o item JÁ está selecionado antes de clicar
    // Isso evita o problema da auto-seleção do PrimeFaces
    const jaSelecionado = await verificarSeJaSelecionado(page, item, seletoresArvore);
    
    if (jaSelecionado) {
      console.log(`      ✅ "${item}" já está selecionado (auto-seleção detectada). Pulando clique.`);
      await delay(300);
      continue;
    }

    // 🛡️ BLINDAGEM 4: Tenta clicar APENAS dentro do escopo da árvore
    const clicou = await clicarItemPorTexto(page, item, seletoresArvore);
    
    if (!clicou) {
      console.warn(`      ⚠️  Elemento não localizado na árvore: "${item}"`);
      
      // Fallback: tenta sem restrição de escopo (último recurso)
      console.log(`      🔄 Tentando busca ampla (sem restrição de escopo)...`);
      const clicouFora = await clicarItemPorTexto(page, item, []);
      if (!clicouFora) {
        console.error(`      ❌ Falha definitiva ao localizar: "${item}"`);
      }
    }

    // 🛡️ BLINDAGEM 5: Aguarda o AJAX do PrimeFaces processar ANTES do próximo clique
    // Aumentei o delay para evitar race conditions
    await aguardarPrimeFaces(page, 4000);
    await delay(800); // Delay extra para estabilização do DOM
  }

  console.log(`      🎉 Tipificação concluída.`);
}

/**
 * Verifica se um item já está selecionado na árvore
 * (Previne cliques duplicados por auto-seleção do PrimeFaces)
 */
async function verificarSeJaSelecionado(page, textoItem, seletoresArvore) {
  try {
    const resultado = await page.evaluate((texto, seletores) => {
      const textoLower = texto.toLowerCase().trim();
      
      // Busca em todos os seletores de árvore
      for (const seletor of seletores) {
        const arvores = document.querySelectorAll(seletor);
        
        for (const arvore of arvores) {
          // Procura por itens marcados como selecionados
          const itensSelecionados = arvore.querySelectorAll(
            '.ui-treenode-selected, ' +
            '.ui-state-highlight, ' +
            '[aria-selected="true"], ' +
            '.ui-tree-selectable.ui-state-hover'
          );
          
          for (const item of itensSelecionados) {
            const label = item.querySelector('.ui-treenode-label, .ui-tree-label, span');
            if (label && label.innerText?.toLowerCase().trim() === textoLower) {
              return true;
            }
          }
        }
      }
      
      return false;
    }, textoItem, seletoresArvore);
    
    return resultado;
  } catch (err) {
    // Se der erro na verificação, assume que não está selecionado (comporta-se como antes)
    return false;
  }
}

module.exports = { aplicarTipificacao };
