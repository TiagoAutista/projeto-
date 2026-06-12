// cpqd.js - Módulo do Robô CPQD/Telefônica
const { chromium } = require('playwright');
const chalk = require('chalk'); // 👈 ADICIONE ESTA LINHA AQUI
const { perguntar, aguardarEnter, limparTela, validarNumero, exibirCabecalho } = require('./utils');

// ... resto do código ...



// goi.js - Módulo do Robô GOI Vivo
const { chromium } = require('playwright');
const chalk = require('chalk'); // 👈 ADICIONE ESTA LINHA AQUI
const { perguntar, aguardarEnter, limparTela, exibirCabecalho } = require('./utils');

// ... resto do código ...



// index.js - Menu Principal Unificado
const { criarInterface, perguntar } = require('./utils/terminal');
const { exibirCabecalho, getStatusFormatado } = require('./utils/visual');
const { menuCPQD, getStatus: statusCPQD } = require('./cpqd');
const { menuGOI, getStatus: statusGOI } = require('./goi');
const chalk = require('chalk'); // 👈 DEVE ESTAR AQUI TAMBÉM

// ... resto do código ...



// utils/visual.js - Funções de formatação visual com Chalk
const chalk = require('chalk'); // 👈 DEVE ESTAR AQUI
const { limparTela } = require('./terminal');

// ... resto do código ...
