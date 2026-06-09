// 1. Encontrar o título exato
const titles = document.querySelectorAll('mat-panel-title');
const targetTitle = Array.from(titles).find(t => t.innerText.trim().toLowerCase().includes('informações de bloqueios'));

if (targetTitle) {
    const header = targetTitle.closest('mat-expansion-panel-header');
    
    // 2. Destacar visualmente para você confirmar
    header.style.border = "3px solid red";
    header.style.backgroundColor = "rgba(255, 0, 0, 0.1)";
    header.scrollIntoView({ behavior: "smooth", block: "center" });
    
    console.log("✅ Elemento encontrado e destacado em VERMELHO!");
    
    // 3. Simular o clique no título
    console.log("🖱️ Simulando clique...");
    targetTitle.click();
    
    console.log("👀 Observe a tela: o painel abriu? O atributo aria-expanded mudou para 'true'?");
} else {
    console.error("❌ Elemento 'Informações de Bloqueios' NÃO encontrado na página.");
}
