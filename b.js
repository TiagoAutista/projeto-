// ============================================================================
// 📂 EXPANDIR PAINEL (Versão Tolerante a Sistemas Lentos)
// ============================================================================
async function expandirPainelBloqueios(page) {
  console.log('   📂 Localizando painel "Informações de Bloqueios"...');
  
  // 1. Encontrar o header pelo título exato
  const headerHandle = await page.evaluateHandle(() => {
    const headers = Array.from(document.querySelectorAll('mat-expansion-panel-header'));
    return headers.find(h => {
      const titulo = h.querySelector('mat-panel-title');
      return titulo && titulo.innerText.trim().toLowerCase().includes('informações de bloqueios');
    }) || null;
  });

  const existe = await headerHandle.evaluate(h => h !== null);
  if (!existe) {
    throw new Error('Painel "Informações de Bloqueios" não encontrado');
  }
  console.log('   🎯 Painel alvo localizado!');

  // 2. Verificar se já está expandido
  const jaExpandido = await page.evaluate((header) => {
    const painel = header.closest('mat-expansion-panel');
    return painel?.classList.contains('mat-expanded') || header.getAttribute('aria-expanded') === 'true';
  }, headerHandle);

  if (!jaExpandido) {
    console.log('   ⏳ Painel fechado. Preparando para expandir...');
    
    // ✅ PAUSA 1: Dar tempo da aba "Banda Larga" estabilizar antes do clique
    await aguardar(1500);
    
    // Clicar no mat-panel-title
    const tituloHandle = await headerHandle.evaluateHandle(h => h.querySelector('mat-panel-title'));
    await tituloHandle.click({ delay: 100 });
    console.log('   🖱️ Clique executado no título.');
    
    // ✅ PAUSA 2: Aguardar o Angular processar o clique
    await aguardar(2000);
    
    // 3. Aguardar o Angular aplicar as classes de expansão (Timeout aumentado para 15s)
    try {
      await page.waitForFunction((header) => {
        const painel = header.closest('mat-expansion-panel');
        return painel?.classList.contains('mat-expanded') || header.getAttribute('aria-expanded') === 'true';
      }, { timeout: 15000 }, headerHandle);
      
      console.log('   ✅ Painel expandido com sucesso!');
    } catch (e) {
      console.log('   ⚠️ O sistema demorou para confirmar a expansão visual, mas vamos tentar prosseguir...');
    }
    
    await tituloHandle.dispose();
  } else {
    console.log('   ✅ Painel já estava expandido!');
  }

  // 4. ESPERA INTELIGENTE: Aguardar o texto REAL aparecer dentro dos <p>
  console.log('   ⏳ Aguardando o sistema lento carregar os dados (CRM/Radius/ACS)...');
  
  try {
    await page.waitForFunction(() => {
      const paineis = Array.from(document.querySelectorAll('mat-expansion-panel.mat-expanded'));
      const painelAlvo = paineis.find(p => {
        const titulo = p.querySelector('mat-panel-title');
        return titulo && titulo.innerText.toLowerCase().includes('informações de bloqueios');
      });
      
      if (!painelAlvo) return false;
      
      const body = painelAlvo.querySelector('.mat-expansion-panel-body');
      if (!body) return false;
      
      const textos = Array.from(body.querySelectorAll('p')).map(p => p.innerText.toUpperCase());
      return textos.some(t => t.includes('CRM') || t.includes('RADIUS') || t.includes('ACS') || t.includes('BLOQUEADO'));
    }, { timeout: 15000 }); // Aguarda até 15 segundos pelos dados
    
    console.log('   ✅ Dados carregados e visíveis na tela!');
  } catch (e) {
    console.log('   ⚠️ Timeout ao aguardar dados. Tentando extrair mesmo assim...');
  }

  await headerHandle.dispose();
}
