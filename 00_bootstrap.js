/* ===============================
   FILE: 00_bootstrap.js
   Startup / Dependency Init
=============================== */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    loadSettings();

    checkSafeMode();

    initRepairIde();

  }
);