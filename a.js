// ============================================================================
// 📊 EXTRAIR INFORMAÇÕES (Com debug de texto bruto)
// ============================================================================
async function extrairInformacoesBloqueio(page) {
  console.log('   📊 Extraindo informações de bloqueio...');
  
  const resultado = await page.evaluate(() => {
    // Encontrar o painel com o título correto
    const paineis = Array.from(document.querySelectorAll('mat-expansion-panel'));
    const painelAlvo = paineis.find(p => {
      const titulo = p.querySelector('mat-panel-title');
      return titulo && titulo.innerText.toLowerCase().includes('informações de bloqueios');
    });
    
    if (!painelAlvo) {
      return { linhasBrutas: [], debug: 'Painel com título correto não encontrado.' };
    }
    
    const body = painelAlvo.querySelector('.mat-expansion-panel-body');
    if (!body) {
      return { linhasBrutas: [], debug: '.mat-expansion-panel-body não encontrado.' };
    }
    
    const ps = Array.from(body.querySelectorAll('p'));
    
    // Retorna os textos brutos para debugarmos
    const linhasBrutas = ps.map(p => p.innerText.trim());
    const linhasValidas = linhasBrutas.filter(texto => texto.length > 0 && texto.includes(':'));
    
    return { 
      linhasBrutas,
      linhasValidas,
      debug: `Encontrados ${ps.length} <p> no total, ${linhasValidas.length} válidos (contêm ':').` 
    };
  });
  
  console.log(`   🔍 Debug extração: ${resultado.debug}`);
  
  // ✅ NOVO: Mostrar os textos brutos encontrados
  if (resultado.linhasBrutas.length > 0) {
    console.log('   📝 Textos brutos encontrados nos <p>:');
    resultado.linhasBrutas.forEach((texto, i) => {
      console.log(`      [${i}] "${texto}"`);
    });
  }
  
  if (!resultado.linhasValidas || resultado.linhasValidas.length === 0) {
    console.log('   ⚠️ Nenhuma linha válida (com ":") encontrada.');
    return {};
  }
  
  const dados = {};
  for (const linha of resultado.linhasValidas) {
    const indiceDoisPontos = linha.indexOf(':');
    if (indiceDoisPontos === -1) continue;
    
    const label = linha.substring(0, indiceDoisPontos).trim();
    const valor = linha.substring(indiceDoisPontos + 1).trim();
    
    console.log(`   🔧 Parseando: Label="${label}" | Valor="${valor}"`);
    
    if (!label || !valor) {
      console.log(`      ⚠️ Ignorado: label ou valor vazio`);
      continue;
    }
    
    const chave = sanitizarChave(label);
    console.log(`      ➡️ Chave sanitizada: "${chave}"`);
    
    if (!chave) {
      console.log(`      ⚠️ Ignorado: chave sanitizada ficou vazia`);
      continue;
    }
    
    dados[chave] = valor;
  }
  
  console.log(`   ✅ ${Object.keys(dados).length} informação(ões) extraída(s) com sucesso!`);
  return dados;
}
