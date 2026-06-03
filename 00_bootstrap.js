/* ===============================
   FILE: 00_bootstrap.js
   Bootstrap / Shared Core
=============================== */

/* ===============================
   Shared Helpers
=============================== */

function get(id){
  return document.getElementById(id);
}

function escapeHtml(text){
  return String(text || "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;");
}

function escapeRegExp(text){
  return String(text || "")
    .replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
}
