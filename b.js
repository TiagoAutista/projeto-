async function mostrarMenu(rl) {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║     🤖 ROBÔ UNIFICADO - MENU PRINCIPAL       ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log('║  [1]  WFM    - Extração de CPFs em lote      ║');
  console.log('║  [2]  GPS    - Tipificação por UNIDADE       ║');
  console.log('║  [3]  GPS    - Tipificação por GRUPO         ║');
  console.log('║  [4]  WFM    - Inspeção/Ajustes Manuais      ║');
  console.log('║  [5]  GPS    - Inspeção/Ajustes Manuais      ║');
  console.log('║  [6]  Siebel - Tipificação por UNIDADE       ║');
  console.log('║  [7]  Siebel - Tipificação por GRUPO         ║');
  console.log('║  [8]  Siebel - Inspeção/Ajustes Manuais      ║');
  console.log('║  ─────────────────────────────────────────── ║');
  console.log('║  [9]  SDU    - 🔍 Buscar ID Fibra            ║');
  console.log('║  [10] SDU    - 🔧 Inspeção/Ajustes Manuais   ║');
  console.log('║  ─────────────────────────────────────────── ║');
  console.log('║  [0]  Encerrar aplicação                     ║');
  console.log('╚══════════════════════════════════════════════╝');
  
  return new Promise((resolve) => {
    rl.question('\n👉 Escolha uma opção: ', (answer) => {
      resolve(answer.trim());
    });
  });
}
