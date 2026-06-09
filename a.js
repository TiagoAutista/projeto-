// ============================================================================
// 📂 EXPANDIR PAINEL (Com espera inteligente para sistemas lentos)
// ============================================================================
async function expandirPainelBloqueios(page) {
  console.log('   📂 Localizando painel "Informações de Bloqueios"...');
  
  // 1. DIAGNÓSTICO: Listar todos os painéis
  const diagnostico = await page.evaluate(() => {
    const headers = Array.from(document.querySelectorAll('mat-expansion-panel-header'));
    return headers.map((h, i) => {
      const painel = h.closest('mat-expansion-panel');
      const titulo = h.querySelector('mat-panel-title');
      return {
        indice: i,
        texto: titulo ? titulo.innerText.trim() : 'Sem título',
        estaExpandido: painel ? painel.classList.contains('mat-expanded') : false,
        ariaExpanded: h.getAttribute('aria-expanded')
      };
    });
  });
  
  console.log(`   🔍 Encontrados ${diagnostico.length} painéis:`);
  diagnostico.forEach(d => {
    console.log(`      [${d.indice}] "${d.texto}" | expandido: ${d.estaExpandido} | aria: ${d.ariaExpanded}`);
  });
  
  // 2. Encontrar o painel alvo pelo texto do título
  const headerSelector = await page.evaluateHandle(() => {
    const headers = Array.from(document.querySelectorAll('mat-expansion-panel-header'));
    for (const header of headers) {
      const titulo = header.querySelector('mat-panel-title');
      if (titulo) {
        const texto = titulo.innerText.toLowerCase();
        if (texto.includes('informações de bloqueios') || texto.includes('informacoes de bloqueios')) {
          return header;
        }
      }
    }
    return null;
  });
  
  const headerExiste = await headerSelector.evaluate(h => h !== null);
  if (!headerExiste) {
    throw new Error('Painel "Informações de Bloqueios" não encontrado');
  }
  
  console.log('   🎯 Painel alvo localizado!');
  
  // 3. Verificar se já está expandido
  const jaExpandido = await page.evaluate((header) => {
    const painel = header.closest('mat-expansion-panel');
    const ariaExpanded = header.getAttribute('aria-expanded');
    return painel?.classList.contains('mat-expanded') || ariaExpanded === 'true';
  }, headerSelector);
  
  if (jaExpandido) {
    console.log('   ✅ Painel já está expandido!');
  } else {
    console.log('   ⏳ Painel fechado. Tentando expandir...');
    
    // ESTRATÉGIA 1: ScrollIntoView + Click no título
    try {
      await page.evaluate((header) => {
        header.scrollIntoView({ block: 'center', behavior: 'instant' });
      }, headerSelector);
      await aguardar(500);
      
      const tituloSelector = await headerSelector.evaluateHandle(h => h.querySelector('mat-panel-title'));
      await tituloSelector.click();
      console.log('   ✓ Estratégia 1: Click no título executado');
      await aguardar(1500);
    } catch (e) {
      console.log('   ⚠️ Estratégia 1 falhou:', e.message);
    }
    
    // Verificar se funcionou
    let expandiu = await page.evaluate((header) => {
      const painel = header.closest('mat-expansion-panel');
      return painel?.classList.contains('mat-expanded') || header.getAttribute('aria-expanded') === 'true';
    }, headerSelector);
    
    // ESTRATÉGIA 2: Click direto no header
    if (!expandiu) {
      console.log('   ⏳ Tentando estratégia 2: Click no header...');
      try {
        await headerSelector.click({ delay: 150 });
        await aguardar(1500);
      } catch (e) {
        console.log('   ⚠️ Estratégia 2 falhou:', e.message);
      }
      expandiu = await page.evaluate((header) => {
        const painel = header.closest('mat-expansion-panel');
        return painel?.classList.contains('mat-expanded') || header.getAttribute('aria-expanded') === 'true';
      }, headerSelector);
    }
    
    // ESTRATÉGIA 3: Click via JavaScript
    if (!expandiu) {
      console.log('   ⏳ Tentando estratégia 3: Click via JavaScript...');
      await page.evaluate((header) => { header.click(); }, headerSelector);
      await aguardar(1500);
      expandiu = await page.evaluate((header) => {
        const painel = header.closest('mat-expansion-panel');
        return painel?.classList.contains('mat-expanded') || header.getAttribute('aria-expanded') === 'true';
      }, headerSelector);
    }
    
    if (expandiu) {
      console.log('   ✅ Painel expandido com sucesso!');
    } else {
      console.log('   ⚠️ Painel não expandiu visualmente, mas continuando...');
    }
  }
  
  // ========================================================================
  // 🕒 ESPERA INTELIGENTE PARA SISTEMAS LENTOS
  // ========================================================================
  console.log('   ⏳ Sistema lento detectado. Aguardando renderização COMPLETA dos textos...');
  
  // Pausa base de 3 segundos para dar tempo do Angular processar
  await aguardar(3000);
  
  let tentativas = 0;
  const maxTentativas = 8; // Até 8 segundos extras de espera
  let textoCompleto = false;
  
  while (tentativas < maxTentativas && !textoCompleto) {
    textoCompleto = await page.evaluate((header) => {
      const painel = header.closest('mat-expansion-panel');
      if (!painel) return false;
      const body = painel.querySelector('.mat-expansion-panel-body');
      if (!body) return false;
      const ps = body.querySelectorAll('p');
      
      // Verifica se pelo menos um <p> tem texto substancial (ex: contém a palavra de status ou tem mais de 30 caracteres)
      for (let p of ps) {
        const texto = p.innerText.trim();
        if (texto.length > 30 || texto.toUpperCase().includes('BLOQUEADO') || texto.toUpperCase().includes('DESBLOQUEADO')) {
          return true;
        }
      }
      return false;
    }, headerSelector);
    
    if (!textoCompleto) {
      tentativas++;
      console.log(`   ⏳ Textos ainda incompletos. Aguardando... (${tentativas}/${maxTentativas})`);
      await aguardar(1000); // Espera 1 segundo entre cada verificação
    }
  }
  
  if (textoCompleto) {
    console.log('   ✅ Textos renderizados completamente! Pronto para extração.');
  } else {
    console.log('   ⚠️ Tempo máximo de espera atingido. Tentando extrair mesmo assim...');
  }
  
  await headerSelector.dispose();
}
