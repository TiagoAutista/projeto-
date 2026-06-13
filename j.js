PS C:\Users\A0161921\Desktop\corporate-ecosystem> node src/lib/wfm.js
>> 
🚀 Teste de Login WFM

◇ injected env (37) from .env // tip: ⌘ override existing { override: true }
node:internal/modules/cjs/loader:1456
  const err = new Error(message);
              ^

Error: Cannot find module '../config/config.js'
Require stack:
- C:\Users\A0161921\Desktop\corporate-ecosystem\src\lib\wfm.js
    at Module._resolveFilename (node:internal/modules/cjs/loader:1456:15)
    at defaultResolveImpl (node:internal/modules/cjs/loader:1066:19)
    at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1071:22)
    at Module._load (node:internal/modules/cjs/loader:1242:25)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    at Module.require (node:internal/modules/cjs/loader:1556:12)
    at require (node:internal/modules/helpers:152:16)
    at C:\Users\A0161921\Desktop\corporate-ecosystem\src\lib\wfm.js:209:20
    at Object.<anonymous> (C:\Users\A0161921\Desktop\corporate-ecosystem\src\lib\wfm.js:226:5)
    at Module._compile (node:internal/modules/cjs/loader:1812:14) {
  code: 'MODULE_NOT_FOUND',
  requireStack: [
    'C:\\Users\\A0161921\\Desktop\\corporate-ecosystem\\src\\lib\\wfm.js'
  ]
}

Node.js v24.14.1
PS C:\Users\A0161921\Desktop\corporate-ecosystem> 
