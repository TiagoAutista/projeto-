      // ... (código anterior de seleção de endereço) ...

      // C. Tipificação e Diagnóstico
      await aplicarTipificacao(page, cfg);
      
      // 1. Lê o diagnóstico (apenas leitura, sem erros de clique)
      await executarDiagnosticoOrdem(page, config, rl);      

      // 2. (OPCIONAL) Se você precisar preencher uma observação padrão, descomente a linha abaixo:
      // await page.type('#formSelecaoResultadoAtendimento\\:observacao', 'Atendimento realizado via automação.');

      // 3. Clica no botão "Registrar Atendimento"
      // Nota: O \\: é obrigatório no Puppeteer para escapar os dois-pontos dos IDs do JSF/PrimeFaces
      console.log("\n      💾 Finalizando e registrando o atendimento...");
      await page.click('#formSelecaoResultadoAtendimento\\:j_idt1853');

      // 4. Aguarda o processamento do servidor (AJAX)
      await aguardarPrimeFaces(page, 5000);
      await delay(1500);

      // 5. (Blindagem) Caso apareça o modal de "Confirmação" ou "Aviso", tenta fechá-lo automaticamente
      try {
        const modalOk = await page.$('#formExecucaoGrupoDiagnostico\\:j_idt605'); // Botão OK do modal de aviso
        if (modalOk && await modalOk.isVisible()) {
          await modalOk.click();
          await aguardarPrimeFaces(page, 3000);
        }
      } catch {
        // Se o modal não existir, ignora e segue o fluxo
      }

      // D. Pausa manual de sucesso (se configurada)
      if (dados.status === "SUCESSO") {
        console.log("\n===============================================================================");
        console.log(`🛑 PAUSA OBRIGATÓRIA - CPF Validado e Registrado: ${docLimpo}`);
        console.log("===============================================================================");
        await new Promise(resolve => rl.question('\n   👉 Trate a ordem na tela e pressione [ENTER] para o próximo... ', resolve));
      }
