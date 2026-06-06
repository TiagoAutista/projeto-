// src/lib/gps-next/subroutine/index.js
const { executarDiagnosticoOrdem } = require("./executarDiagnosticoOrdem");
const { processarGPS } = require("./process"); // Aponta para a pasta process
const { abrirParaInspecaoGPS } = require("./abrirParaInspecaoGPS");

module.exports = {
  executarDiagnosticoOrdem,
  processarGPS,
  abrirParaInspecaoGPS,
};
