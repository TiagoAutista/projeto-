// src/lib/gps-next/subroutine/executarDiagnosticoOrdem.js
const { delay, aguardarPrimeFaces } = require("../../../utils/helpers");

/**
 * Lê e valida o painel de diagnóstico do GPS.
 * O sistema responde automaticamente com base na tipificação.
 * Esta função apenas LÊ e REGISTRA as respostas.
 */
async function executarDiagnosticoOrdem(page, config, rl) {
  console.log("🔍 Lendo painel de diagnóstico...");

  try {
    // Aguarda a tabela de diagnóstico aparecer
    await page.waitForSelector('#formExecucaoDiagnostico table.ui-panelgrid', {
      timeout: 4000,
    });
  } catch {
    console.log("      ℹ️  Painel de diagnóstico não encontrado. Continuando...");
    return { encontrado: false, respostas: [] };
  }

  await delay(800);

  // Extrai as perguntas e as imagens de resposta (ico-check ou ico-nope)
  const diagnostico = await page.evaluate(() => {
    const respostas = [];
    const linhas = document.querySelectorAll('#formExecucaoDiagnostico table.ui-panelgrid tr');
    
    linhas.forEach((linha) => {
      const labelPergunta = linha.querySelector('label.subtitle');
      if (!labelPergunta) return;
      
      const pergunta = labelPergunta.innerText?.trim();
      if (!pergunta) return;
      
      // Verifica qual imagem está presente na mesma linha da pergunta
      const imgCheck = linha.querySelector('img[src*="ico-check.png"]');
      const imgNope = linha.querySelector('img[src*="ico-nope.png"]');
      
      let resposta = null;
      if (imgCheck) resposta = 'SIM';
      else if (imgNope) resposta = 'NÃO';
      
      if (resposta) {
        respostas.push({
          pergunta: pergunta.replace(/^[AM]\)\s*/i, ''), // Remove "A) " ou "M) "
          resposta: resposta,
        });
      }
    });
    
    return respostas;
  });

  // Exibe o relatório formatado no console
  if (diagnostico.length === 0) {
    console.log("      ℹ️  Nenhuma pergunta de diagnóstico encontrada.");
    return { encontrado: true, respostas: [] };
  }

  console.log(`\n      📋 Diagnóstico automático (${diagnostico.length} perguntas):`);
  console.log('      ' + '─'.repeat(65));
  
  diagnostico.forEach((item) => {
    const icone = item.resposta === 'SIM' ? '✅' : '❌';
    const perguntaFormatada = item.pergunta.substring(0, 50).padEnd(50, ' ');
    console.log(`      ${icone} ${perguntaFormatada} → ${item.resposta}`);
  });
  
  console.log('      ' + '─'.repeat(65));

  await aguardarPrimeFaces(page, 2000);
  return { encontrado: true, respostas: diagnostico };
}

module.exports = { executarDiagnosticoOrdem };
