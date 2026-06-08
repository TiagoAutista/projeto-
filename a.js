PS C:\Users\A0161921\Desktop\auto-robo-main> node src/lib/bot.js
>> 
🚀 Iniciando o robô...
📅 Data/Hora: 08/06/2026, 12:40:13
🔍 ID a buscar: SPO-76438046-069

🌐 Acessando: https://sdu.redecororp.br/DiagnoseServiceProblem/home

❌ Erro durante a execução: net::ERR_EMPTY_RESPONSE at https://sdu.redecororp.br/DiagnoseServiceProblem/home
📍 Stack: Error: net::ERR_EMPTY_RESPONSE at https://sdu.redecororp.br/DiagnoseServiceProblem/home
    at navigate (C:\Users\A0161921\Desktop\auto-robo-main\node_modules\puppeteer-core\lib\cjs\puppeteer\cdp\Frame.js:186:27)
    at async Deferred.race (C:\Users\A0161921\Desktop\auto-robo-main\node_modules\puppeteer-core\lib\cjs\puppeteer\util\Deferred.js:36:20)
    at async CdpFrame.goto (C:\Users\A0161921\Desktop\auto-robo-main\node_modules\puppeteer-core\lib\cjs\puppeteer\cdp\Frame.js:152:25)
    at async CdpPage.goto (C:\Users\A0161921\Desktop\auto-robo-main\node_modules\puppeteer-core\lib\cjs\puppeteer\api\Page.js:588:20)
    at async C:\Users\A0161921\Desktop\auto-robo-main\src\lib\bot.js:265:5
⚠️ Não foi possível tirar screenshot: Protocol error (Page.captureScreenshot): Not attached to an active page

🔒 Fechando navegador...
✅ Robô finalizado.
PS C:\Users\A0161921\Desktop\auto-robo-main> 
