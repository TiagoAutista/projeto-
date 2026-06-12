// utils/index.js - Exporta todas as funções utilitárias
const terminal = require('./terminal');
const visual = require('./visual');
const validacao = require('./validacao');

module.exports = {
  ...terminal,
  ...visual,
  ...validacao
};
