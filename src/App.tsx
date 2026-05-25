// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "./supabase";

// ── IMAGE ASSETS ────────────────────────────────────────────────────────────
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const LOGO_UNI = BASE + "/logo-uni.png";
const LOGO_APP = BASE + "/logo-app.png";
const COVER   = BASE + "/cover.png";

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const CSSB_LIST = [
  "CSSB AKARIT","CSSB ARRAM","BEN CHILOUF","CSSB BOUATTOUCH","CSSB BOUCHEMA",
  "CHENINI","CSSB CHATT ESSALAM","CSSB EL HAMMA","CSSB EL MANCEF","CSSB EL MDOU",
  "CSSB EL MEDA","CSSB CHANNOUCH","CSSB HAY AMAL","CSSB JARA","CSSB KETTANA",
  "CSSB MANARA","CSSB MARETH VILLE","CSSB MATOUIA NORD","CSSB MOHAMED ALI",
  "MTORRECH","CSSB SIDI BOULBABA","CSSB TEBELBOU","CSSB WALI","CSSB WASIT","CSSB ZARAT",
];

const ADMIN_CODE = "ISSIG2024";

const DEFAULT_SECTIONS = [
  { icone:"🧊", titre:"Importance de la chaîne du froid", description:"Pourquoi maintenir la chaîne du froid est essentiel.", items:[
    "La rupture de la chaîne du froid rend les vaccins inefficaces et peut causer des maladies.",
    "Les vaccins doivent être conservés entre +2°C et +8°C en permanence.",
    "Toute exposition hors plage de température doit être signalée immédiatement.",
  ]},
  { icone:"🌡️", titre:"Températures recommandées", description:"Plages de températures selon le type de vaccin.", items:[
    "2°C à 8°C — Vaccins classiques : BCG, DTC, Hépatite B, Polio, Rougeole-Rubéole, Hib.",
    "-15°C à -25°C — Vaccins congelés : certains vaccins COVID-19, vaccins de laboratoire.",
    "≈ -70°C — Vaccin Pfizer-BioNTech COVID-19 — nécessite un congélateur spécial.",
    "Utilisez un thermomètre digital et contrôlez la température régulièrement. Évitez le gel des vaccins classiques.",
  ]},
  { icone:"🧪", titre:"Vérifications avant utilisation", description:"Contrôles obligatoires avant d'administrer un vaccin.", items:[
    "Vérifier la date de péremption sur le flacon avant utilisation.",
    "Inspecter le flacon : pas de turbidité anormale, pas de particules.",
    "Vérifier l'indicateur de flacon (VVM) — doit être dans la zone valide.",
    "Ne jamais utiliser un vaccin sorti de la chaîne du froid sans validation.",
  ]},
  { icone:"⚡", titre:"Rupture de courant", description:"Procédures en cas de coupure électrique.", items:[
    "En cas de coupure, ne pas ouvrir le réfrigérateur inutilement.",
    "Utiliser des accumulateurs de froid (ice packs) pour maintenir la température.",
    "Contacter immédiatement le responsable de la chaîne du froid.",
    "Documenter l'heure de début et de fin de la coupure.",
  ]},
  { icone:"🚚", titre:"Transport des vaccins", description:"Règles de transport des vaccins entre sites.", items:[
    "Utiliser une glacière qualifiée avec des indicateurs de température.",
    "Pré-conditionner les ice packs pour éviter le gel des vaccins.",
    "Transporter les vaccins dans des délais aussi courts que possible.",
    "Ne jamais exposer les vaccins à la lumière directe du soleil.",
  ]},
];

// ── HELPERS ────────────────────────────────────────────────────────────────────
function daysUntil(d) { return d ? Math.ceil((new Date(d) - new Date()) / 86400000) : 999; }
function tempStatus(v) {
  if (v > 8 || v < 2) return { cls: "badge-error", txt: "❌ Anormal" };
  if (v > 6.5)        return { cls: "badge-warn",  txt: "⚠️ Limite"  };
  return                     { cls: "badge-ok",    txt: "✓ Normal"   };
}

async function loadJsPDF() {
  if (window.jspdf) return window.jspdf.jsPDF;
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = () => res(window.jspdf.jsPDF); s.onerror = rej;
    document.head.appendChild(s);
  });
}

function pdfFooter(doc, W) {
  const pages=doc.getNumberOfPages();
  for(let i=1;i<=pages;i++){
    doc.setPage(i); doc.setFillColor(240,244,248); doc.rect(0,284,W,13,"F");
    doc.setFontSize(8); doc.setTextColor(100,116,139); doc.setFont("helvetica","normal");
    doc.text("Gestion Vaccinale Intelligente · OMS · I.S.S.I.G Gabes", 14, 291);
    doc.text("Page "+i+"/"+pages, W-14, 291, {align:"right"});
  }
}

async function exportStockPDF(vaccins, cssb?) {
  const jsPDF = await loadJsPDF();
  const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
  const today = new Date().toLocaleDateString("fr-FR"); const W = 210;
  doc.setFillColor(10,37,64); doc.rect(0,0,W,28,"F");
  doc.setTextColor(255,255,255); doc.setFontSize(18); doc.setFont("helvetica","bold");
  doc.text("Gestion Vaccinale Intelligente", 14, 12);
  doc.setFontSize(9); doc.setFont("helvetica","normal");
  doc.text(`I.S.S.I.G Gabes${cssb?` — ${cssb}`:" — Toutes les CSSB"} — Stock du : ${today}`, 14, 22);
  let y = 36;
  doc.setFillColor(26,86,219); doc.rect(0,y,W,8,"F");
  doc.setTextColor(255,255,255); doc.setFontSize(11); doc.setFont("helvetica","bold");
  doc.text("STOCK VACCINAL", 14, y+5.5); y+=13;
  const cols=[14,54,94,118,142,168];
  ["Vaccin","Lot","Qte","Seuil","Péremption","Statut"].forEach((h,i)=>{
    doc.setFillColor(10,37,64); if(i===0) doc.rect(14,y,182,7,"F");
    doc.setTextColor(255,255,255); doc.setFontSize(8); doc.setFont("helvetica","bold");
    doc.text(h,cols[i]+1,y+5);
  }); y+=7;
  vaccins.forEach((v,i)=>{
    if(y>255){doc.addPage();y=20;}
    doc.setFillColor(i%2===0?248:255,i%2===0?250:255,i%2===0?252:255);
    doc.rect(14,y,182,7,"F"); doc.setTextColor(30,41,59);
    doc.setFont("helvetica","normal"); doc.setFontSize(8);
    doc.text(v.nom,cols[0]+1,y+5); doc.text(v.lot||"—",cols[1]+1,y+5);
    doc.text(String(v.quantite),cols[2]+1,y+5); doc.text(String(v.seuil_min),cols[3]+1,y+5);
    doc.text(v.peremption||"—",cols[4]+1,y+5);
    v.statut==="faible"?(doc.setTextColor(180,83,9),doc.text("Faible",cols[5]+1,y+5))
                       :(doc.setTextColor(5,150,105),doc.text("OK",cols[5]+1,y+5));
    y+=7;
  });
  pdfFooter(doc,W);
  doc.save("StockVaccinal_"+today.replace(/\//g,"-")+".pdf");
}

async function exportRelevesPDF(releves, dateFrom, dateTo, cssb?) {
  const jsPDF = await loadJsPDF();
  const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
  const today = new Date().toLocaleDateString("fr-FR"); const W = 210;
  const filtered = releves.filter(r => (!dateFrom||r.date>=dateFrom) && (!dateTo||r.date<=dateTo));
  doc.setFillColor(10,37,64); doc.rect(0,0,W,28,"F");
  doc.setTextColor(255,255,255); doc.setFontSize(18); doc.setFont("helvetica","bold");
  doc.text("Gestion Vaccinale Intelligente", 14, 12);
  doc.setFontSize(9); doc.setFont("helvetica","normal");
  const periode = dateFrom||dateTo ? `${dateFrom||"…"} → ${dateTo||"…"}` : "Toutes dates";
  doc.text(`I.S.S.I.G Gabes${cssb?` — ${cssb}`:" — Toutes les CSSB"} — ${periode}`, 14, 22);
  let y = 36;
  doc.setFillColor(14,159,110); doc.rect(0,y,W,8,"F");
  doc.setTextColor(255,255,255); doc.setFontSize(11); doc.setFont("helvetica","bold");
  doc.text("FEUILLE DE TEMPÉRATURE", 14, y+5.5); y+=13;
  const rc=[14,42,66,96,130,168];
  ["Date","Heure","Temp","Statut","Responsable","Obs"].forEach((h,i)=>{
    if(i===0){doc.setFillColor(10,37,64);doc.rect(14,y,182,7,"F");}
    doc.setTextColor(255,255,255);doc.setFontSize(8);doc.setFont("helvetica","bold");
    doc.text(h,rc[i]+1,y+5);
  }); y+=7;
  filtered.forEach((r,i)=>{
    if(y>270){doc.addPage();y=20;}
    doc.setFillColor(i%2===0?248:255,i%2===0?250:255,i%2===0?252:255);
    doc.rect(14,y,182,7,"F"); doc.setTextColor(30,41,59);
    doc.setFont("helvetica","normal"); doc.setFontSize(8);
    doc.text(String(r.date),rc[0]+1,y+5); doc.text(r.heure,rc[1]+1,y+5);
    doc.text(r.temp+"°C",rc[2]+1,y+5);
    const ok=r.temp>=2&&r.temp<=8,lim=r.temp>6.5&&r.temp<=8;
    !ok?(doc.setTextColor(185,28,28),doc.text("Anormal",rc[3]+1,y+5))
    :lim?(doc.setTextColor(180,83,9),doc.text("Limite",rc[3]+1,y+5))
        :(doc.setTextColor(5,150,105),doc.text("Normal",rc[3]+1,y+5));
    doc.setTextColor(30,41,59);
    doc.text((r.nom||"—").slice(0,18),rc[4]+1,y+5);
    doc.text((r.obs||"—").slice(0,16),rc[5]+1,y+5);
    y+=7;
  });
  pdfFooter(doc,W);
  doc.save("FeuilleTemperature_"+today.replace(/\//g,"-")+".pdf");
}

async function exportSortiesPDF(utilisations, cssb?) {
  const jsPDF = await loadJsPDF();
  const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
  const today = new Date().toLocaleDateString("fr-FR"); const W = 210;
  doc.setFillColor(10,37,64); doc.rect(0,0,W,28,"F");
  doc.setTextColor(255,255,255); doc.setFontSize(18); doc.setFont("helvetica","bold");
  doc.text("Gestion Vaccinale Intelligente", 14, 12);
  doc.setFontSize(9); doc.setFont("helvetica","normal");
  doc.text(`I.S.S.I.G Gabes${cssb?` — ${cssb}`:" — Toutes les CSSB"} — Sorties au : ${today}`, 14, 22);
  let y = 36;
  doc.setFillColor(124,58,237); doc.rect(0,y,W,8,"F");
  doc.setTextColor(255,255,255); doc.setFontSize(11); doc.setFont("helvetica","bold");
  doc.text("LISTE DES VACCINS SORTIS", 14, y+5.5); y+=13;
  const cols=[14,60,96,122,152,182];
  ["Date","Vaccin","Qté utilisée","CSSB","Responsable","Obs"].forEach((h,i)=>{
    if(i===0){doc.setFillColor(10,37,64);doc.rect(14,y,182,7,"F");}
    doc.setTextColor(255,255,255);doc.setFontSize(8);doc.setFont("helvetica","bold");
    doc.text(h,cols[i]+1,y+5);
  }); y+=7;
  utilisations.forEach((u,i)=>{
    if(y>270){doc.addPage();y=20;}
    doc.setFillColor(i%2===0?248:255,i%2===0?250:255,i%2===0?252:255);
    doc.rect(14,y,182,7,"F"); doc.setTextColor(30,41,59);
    doc.setFont("helvetica","normal"); doc.setFontSize(8);
    doc.text(String(u.date||"—"),cols[0]+1,y+5);
    doc.text((u.vaccin_nom||"—").slice(0,20),cols[1]+1,y+5);
    doc.text(String(u.quantite),cols[2]+1,y+5);
    doc.text((u.cssb||"—").slice(0,16),cols[3]+1,y+5);
    doc.text((u.nom||"—").slice(0,14),cols[4]+1,y+5);
    doc.text((u.obs||"—").slice(0,12),cols[5]+1,y+5);
    y+=7;
  });
  pdfFooter(doc,W);
  doc.save("SortiesVaccins_"+today.replace(/\//g,"-")+".pdf");
}

// ── CSS ────────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Poppins',sans-serif;background:#f8fafc;color:#1e293b;}
h1,h2,h3,h4,h5{font-family:'Poppins',sans-serif;}
.app{min-height:100vh;display:flex;flex-direction:column;}
nav{background:#0a2540;position:sticky;top:0;z-index:100;border-bottom:1px solid rgba(255,255,255,.08);}
.nav-inner{max-width:1200px;margin:0 auto;padding:0 20px;display:flex;align-items:center;justify-content:space-between;height:60px;}
.logo{display:flex;align-items:center;gap:10px;color:white;font-family:'Poppins',sans-serif;font-weight:800;font-size:17px;}
.logo-badge{width:32px;height:32px;border-radius:9px;background:linear-gradient(135deg,#1a56db,#0e9f6e);display:flex;align-items:center;justify-content:center;font-size:15px;}
.nav-right{display:flex;align-items:center;gap:8px;}
.nav-tabs{display:flex;gap:2px;}
.nav-tab{background:none;border:none;color:rgba(255,255,255,.6);font-size:13px;font-weight:500;padding:6px 12px;border-radius:8px;cursor:pointer;font-family:'Poppins',sans-serif;transition:all .2s;}
.nav-tab:hover{color:white;background:rgba(255,255,255,.08);}
.nav-tab.active{color:white;background:rgba(255,255,255,.14);}
.user-chip{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:100px;padding:5px 12px 5px 6px;cursor:pointer;}
.user-avatar{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;}
.avatar-admin{background:linear-gradient(135deg,#f59e0b,#ef4444);}
.avatar-user{background:linear-gradient(135deg,#1a56db,#0e9f6e);}
.user-name{font-size:12px;font-weight:600;color:white;}
.role-tag{font-size:10px;font-weight:700;padding:2px 7px;border-radius:100px;}
.role-admin{background:rgba(245,158,11,.25);color:#fbbf24;}
.role-user{background:rgba(14,159,110,.25);color:#34d399;}
main{flex:1;max-width:1200px;margin:0 auto;width:100%;padding:24px 20px;}
.login-page{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0a2540,#0d3b72,#0a5e8a);padding:20px;}
.login-box{background:white;border-radius:24px;padding:40px;width:100%;max-width:440px;box-shadow:0 25px 60px rgba(0,0,0,.35);}
.login-cover{width:100%;border-radius:14px;margin-bottom:24px;display:block;object-fit:cover;max-height:140px;}
.login-title{font-size:24px;font-weight:800;color:#0a2540;margin-bottom:4px;text-align:center;}
.login-sub{font-size:13px;color:#64748b;text-align:center;margin-bottom:28px;}
.login-error{background:#fee2e2;border:1px solid #fecaca;color:#dc2626;font-size:13px;padding:10px 14px;border-radius:10px;margin-bottom:16px;font-weight:500;}
.login-success{background:#d1fae5;border:1px solid #6ee7b7;color:#065f46;font-size:13px;padding:10px 14px;border-radius:10px;margin-bottom:16px;font-weight:500;}
.card{background:white;border-radius:16px;padding:24px;border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,.05);}
.card-title{font-size:18px;font-weight:700;color:#0a2540;margin-bottom:16px;}
.dash-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;margin-bottom:24px;}
.stat-card{background:white;border-radius:16px;padding:22px;border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,.05);transition:.2s;}
.stat-card:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,.08);}
.stat-icon{width:44px;height:44px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:20px;margin-bottom:14px;}
.stat-val{font-family:'Poppins',sans-serif;font-size:30px;font-weight:800;letter-spacing:-1px;margin-bottom:3px;}
.stat-lbl{font-size:12px;color:#64748b;}
.stat-badge{display:inline-flex;align-items:center;font-size:11px;font-weight:600;margin-top:8px;padding:2px 8px;border-radius:20px;}
.s-ok .stat-icon{background:#d1fae5;}.s-ok .stat-val{color:#059669;}.s-ok .stat-badge{background:#d1fae5;color:#065f46;}
.s-warn .stat-icon{background:#fef3c7;}.s-warn .stat-val{color:#d97706;}.s-warn .stat-badge{background:#fef3c7;color:#92400e;}
.s-alert .stat-icon{background:#fee2e2;}.s-alert .stat-val{color:#dc2626;}.s-alert .stat-badge{background:#fee2e2;color:#991b1b;}
.s-info .stat-icon{background:#dbeafe;}.s-info .stat-val{color:#1d4ed8;}.s-info .stat-badge{background:#dbeafe;color:#1e40af;}
.s-purple .stat-icon{background:#ede9fe;}.s-purple .stat-val{color:#7c3aed;}.s-purple .stat-badge{background:#ede9fe;color:#5b21b6;}
.sec-label{display:inline-flex;align-items:center;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#1a56db;background:rgba(26,86,219,.08);padding:4px 12px;border-radius:100px;margin-bottom:10px;}
.sec-title{font-size:26px;font-weight:800;letter-spacing:-.5px;color:#0a2540;margin-bottom:6px;}
.sec-sub{font-size:14px;color:#64748b;margin-bottom:24px;}
table{width:100%;border-collapse:collapse;font-size:13px;}
thead{background:#0a2540;}
thead th{color:white;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;padding:12px 16px;text-align:left;}
tbody tr{border-bottom:1px solid #f1f5f9;transition:.15s;}
tbody tr:hover{background:#f8fafc;}
tbody td{padding:11px 16px;color:#475569;}
tbody td:first-child{font-weight:600;color:#1e293b;}
.tbl-wrap{border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,.05);}
.badge{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;}
.badge-ok{background:#d1fae5;color:#065f46;}
.badge-warn{background:#fef3c7;color:#92400e;}
.badge-error{background:#fee2e2;color:#991b1b;}
.badge-info{background:#dbeafe;color:#1e40af;}
.badge-purple{background:#ede9fe;color:#5b21b6;}
.form-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;margin-bottom:16px;}
.field{display:flex;flex-direction:column;gap:5px;}
.field label{font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:.5px;}
.field input,.field select,.field textarea{padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;font-family:'Poppins',sans-serif;color:#1e293b;background:white;transition:.2s;outline:none;}
.field input:focus,.field select:focus,.field textarea:focus{border-color:#1a56db;box-shadow:0 0 0 3px rgba(26,86,219,.1);}
.field textarea{resize:vertical;min-height:70px;}
.btn{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border-radius:10px;font-size:13px;font-weight:600;font-family:'Poppins',sans-serif;cursor:pointer;border:none;transition:all .2s;}
.btn-primary{background:#1a56db;color:white;}.btn-primary:hover{background:#1645c0;}
.btn-danger{background:#fee2e2;color:#dc2626;}.btn-danger:hover{background:#fecaca;}
.btn-outline{background:white;color:#1a56db;border:1.5px solid #1a56db;}
.btn-ghost{background:#f1f5f9;color:#475569;}.btn-ghost:hover{background:#e2e8f0;}
.btn-purple{background:#7c3aed;color:white;}.btn-purple:hover{background:#6d28d9;}
.btn-sm{padding:6px 12px;font-size:12px;}
.btn-xs{padding:4px 9px;font-size:11px;border-radius:7px;}
.btn-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;}
.modal-bg{position:fixed;inset:0;background:rgba(10,37,64,.5);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;}
.modal{background:white;border-radius:20px;padding:28px;max-width:560px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.2);max-height:90vh;overflow-y:auto;}
.modal-title{font-size:20px;font-weight:800;color:#0a2540;margin-bottom:20px;}
.modal-footer{display:flex;gap:10px;justify-content:flex-end;margin-top:20px;padding-top:16px;border-top:1px solid #f1f5f9;}
.toast{position:fixed;bottom:24px;right:24px;z-index:300;background:#0a2540;color:white;padding:14px 20px;border-radius:12px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:10px;box-shadow:0 8px 24px rgba(0,0,0,.2);}
.empty{text-align:center;padding:48px 24px;color:#94a3b8;}
.empty-icon{font-size:48px;margin-bottom:14px;}
.empty h4{font-size:16px;font-weight:700;color:#64748b;margin-bottom:6px;}
.alert-banner{background:#fff5f5;border:1.5px solid #fecaca;border-radius:14px;padding:16px 20px;display:flex;gap:12px;align-items:flex-start;margin-bottom:20px;}
.alert-banner h4{font-size:14px;font-weight:700;color:#dc2626;margin-bottom:3px;}
.alert-banner p{font-size:12px;color:#c53030;}
.releve-form{background:linear-gradient(135deg,#eff6ff,#f0fdf4);border:1.5px solid #93c5fd;border-radius:16px;padding:24px;margin-bottom:24px;}
.tabs{display:flex;gap:4px;background:#f1f5f9;padding:4px;border-radius:12px;margin-bottom:20px;width:fit-content;flex-wrap:wrap;}
.tab-btn{padding:7px 16px;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;border:none;background:none;color:#64748b;font-family:'Poppins',sans-serif;transition:.2s;}
.tab-btn.active{background:white;color:#1a56db;box-shadow:0 1px 4px rgba(0,0,0,.08);}
.progress-bar{height:6px;background:#e2e8f0;border-radius:100px;overflow:hidden;}
.progress-fill{height:100%;border-radius:100px;}
.locked-msg{display:flex;align-items:center;gap:10px;background:#f8fafc;border:1.5px dashed #e2e8f0;border-radius:12px;padding:14px 18px;color:#64748b;font-size:13px;margin-bottom:16px;}
.notif-bell{position:relative;cursor:pointer;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:100px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:16px;}
.notif-dot{position:absolute;top:4px;right:4px;width:8px;height:8px;background:#ef4444;border-radius:50%;border:2px solid #0a2540;}
.notif-panel{position:fixed;top:68px;right:16px;width:320px;z-index:200;display:flex;flex-direction:column;gap:8px;}
.notif-card{background:white;border-radius:14px;padding:14px 16px;box-shadow:0 8px 30px rgba(0,0,0,.15);border-left:4px solid #ef4444;}
.notif-card.warn{border-left-color:#f59e0b;}
.notif-card.info{border-left-color:#1a56db;}
.notif-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;}
.notif-title{font-size:13px;font-weight:700;color:#0a2540;}
.notif-close{background:none;border:none;cursor:pointer;color:#94a3b8;font-size:18px;}
.notif-body{font-size:12px;color:#475569;}
.user-row{display:flex;align-items:center;gap:14px;padding:14px;background:white;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:10px;}
.user-big-avatar{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;flex-shrink:0;}
.loading-screen{display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:12px;font-family:'Poppins',sans-serif;color:#0a2540;}
.spinner{width:40px;height:40px;border:4px solid #e2e8f0;border-top:4px solid #1a56db;border-radius:50%;animation:spin 1s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}
.dash-logo-bar{display:flex;align-items:center;justify-content:space-between;background:white;border-radius:16px;padding:18px 24px;border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,.05);margin-bottom:20px;}
.dash-logo-bar img{height:54px;object-fit:contain;}
.dash-logo-center{text-align:center;flex:1;}
.dash-logo-center h3{font-family:'Poppins',sans-serif;font-size:16px;font-weight:800;color:#0a2540;margin-bottom:2px;}
.dash-logo-center p{font-size:11px;color:#64748b;}
.accord{border:1px solid #e2e8f0;border-radius:14px;margin-bottom:10px;overflow:hidden;background:white;box-shadow:0 1px 3px rgba(0,0,0,.04);}
.accord-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;cursor:pointer;user-select:none;transition:background .15s;}
.accord-head:hover{background:#f8fafc;}
.accord-head-left{display:flex;align-items:center;gap:12px;}
.accord-icon{font-size:22px;}
.accord-title{font-family:'Poppins',sans-serif;font-size:15px;font-weight:700;color:#0a2540;}
.accord-desc{font-size:12px;color:#64748b;margin-top:2px;}
.accord-actions{display:flex;align-items:center;gap:6px;}
.accord-body{padding:0 18px 18px 18px;border-top:1px solid #f1f5f9;}
.accord-item{display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-bottom:1px solid #f8fafc;}
.accord-item:last-child{border-bottom:none;}
.accord-bullet{width:7px;height:7px;border-radius:50%;background:#1a56db;margin-top:6px;flex-shrink:0;}
.accord-item-text{flex:1;font-size:13px;color:#475569;line-height:1.5;}
.accord-item-edit{display:flex;gap:5px;flex-shrink:0;}
.guide-hint{background:linear-gradient(135deg,#eff6ff,#f0fdf4);border:1.5px solid #93c5fd;border-radius:12px;padding:12px 16px;font-size:12px;color:#1e40af;margin-bottom:18px;display:flex;align-items:center;gap:8px;}
.inline-input{padding:6px 10px;border:1.5px solid #93c5fd;border-radius:8px;font-size:13px;font-family:'Poppins',sans-serif;outline:none;flex:1;}
.inline-input:focus{border-color:#1a56db;}
.chart-wrap{position:relative;width:100%;overflow-x:auto;}
.chart-svg{display:block;min-width:400px;}
.chart-zone-safe{fill:rgba(16,185,129,.08);}
.chart-zone-warn{fill:rgba(245,158,11,.08);}
.chart-line{fill:none;stroke:#1a56db;stroke-width:2;stroke-linejoin:round;stroke-linecap:round;}
.chart-point-ok{fill:#059669;}
.chart-point-warn{fill:#d97706;}
.chart-point-bad{fill:#dc2626;}
.chart-label{font-family:'Poppins',sans-serif;font-size:10px;fill:#94a3b8;}
.chart-axis{stroke:#e2e8f0;stroke-width:1;}
.pdf-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:16px;background:linear-gradient(135deg,#eff6ff,#f0fdf4);border:1.5px solid #93c5fd;border-radius:14px;padding:14px 18px;}
.pdf-row label{font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.5px;}
.pdf-row input[type=date]{padding:7px 10px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:12px;font-family:'Poppins',sans-serif;color:#1e293b;outline:none;}
.cssb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;margin-bottom:20px;}
.cssb-card{background:white;border-radius:14px;border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,.05);overflow:hidden;}
.cssb-card-header{background:linear-gradient(135deg,#0a2540,#1e3a5f);color:white;padding:10px 14px;font-family:'Poppins',sans-serif;font-size:13px;font-weight:700;}
.cssb-stats{padding:12px 14px;display:flex;flex-direction:column;gap:6px;font-size:13px;color:#334155;}
.cssb-row{display:flex;align-items:center;gap:6px;}
.cssb-ok{color:#059669;font-weight:600;}
.cssb-warn{color:#d97706;font-weight:600;}
.cssb-alert{color:#dc2626;font-weight:600;}
.cssb-neutral{color:#64748b;}
.alert-hist-row{display:flex;gap:12px;align-items:flex-start;padding:12px 16px;border-bottom:1px solid #f1f5f9;transition:.15s;}
.alert-hist-row:hover{background:#fafafa;}
.alert-hist-row:last-child{border-bottom:none;}
.alert-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;margin-top:4px;}
.dot-red{background:#ef4444;}
.dot-orange{background:#f59e0b;}
.dot-blue{background:#1a56db;}
@media(max-width:640px){.form-grid{grid-template-columns:1fr;}.dash-grid{grid-template-columns:repeat(2,1fr);}.nav-tabs{display:none;}.dash-logo-bar img{height:36px;}.dash-logo-center h3{font-size:13px;}.cssb-grid{grid-template-columns:1fr 1fr;}}
`;

// ── TOAST ─────────────────────────────────────────────────────────────────────
function Toast({ msg, onDone }) {
  useEffect(()=>{const t=setTimeout(onDone,3000);return()=>clearTimeout(t);},[]);
  return <div className="toast">✅ {msg}</div>;
}
function ConfirmModal({ msg, onConfirm, onCancel }) {
  return (
    <div className="modal-bg"><div className="modal">
      <div className="modal-title">⚠️ Confirmer</div>
      <p style={{fontSize:14,color:"#475569"}}>{msg}</p>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onCancel}>Annuler</button>
        <button className="btn btn-danger" onClick={onConfirm}>🗑️ Supprimer</button>
      </div>
    </div></div>
  );
}

// ── LOGIN / REGISTER ──────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [mode,setMode]=useState("login");
  const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
  const [nom,setNom]=useState(""); const [cssb,setCssb]=useState(CSSB_LIST[0]);
  const [code,setCode]=useState("");
  const [error,setError]=useState(""); const [success,setSuccess]=useState("");
  const [loading,setLoading]=useState(false);
  const [show,setShow]=useState(false);

  async function handleLogin() {
    if(!email||!password){setError("Remplissez tous les champs.");return;}
    setLoading(true); setError("");
    const { data, error:err } = await supabase.from("users")
      .select("*").eq("email",email.trim()).eq("password",password).single();
    setLoading(false);
    if(err||!data){setError("Email ou mot de passe incorrect.");return;}
    if(data.statut==="pending"){setError("Votre compte est en attente de validation par l'administrateur.");return;}
    if(data.statut==="rejected"){setError("Votre demande de compte a été refusée. Contactez l'administrateur.");return;}
    localStorage.setItem("vc_user", JSON.stringify(data));
    onLogin(data);
  }

  async function handleRegister() {
    if(!nom||!email||!password||!cssb){setError("Tous les champs sont requis.");return;}
    if(code!==ADMIN_CODE){setError("Code administrateur incorrect.");return;}
    setLoading(true); setError("");
    const {data:ex}=await supabase.from("users").select("id").eq("email",email.trim().toLowerCase()).maybeSingle();
    if(ex){setError("Cet email est déjà utilisé.");setLoading(false);return;}
    const {error:err}=await supabase.from("users").insert({nom,email:email.trim().toLowerCase(),password,role:"user",cssb,statut:"pending"});
    setLoading(false);
    if(err){setError("Erreur : "+err.message);return;}
    setSuccess("Demande envoyée ! L'administrateur doit approuver votre compte avant que vous puissiez vous connecter.");
    setMode("login"); setEmail(""); setPassword(""); setNom(""); setCode("");
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <img src={COVER} alt="cover" className="login-cover"/>
        <div style={{display:"flex",justifyContent:"center",gap:16,marginBottom:16}}>
          <img src={LOGO_UNI} alt="ISSIG" style={{height:48,objectFit:"contain"}}/>
          <img src={LOGO_APP} alt="App" style={{height:48,objectFit:"contain"}}/>
        </div>
        <div className="login-title">Gestion Vaccinale Intelligente</div>
        <div className="login-sub">I.S.S.I.G Gabès — Connexion requise</div>

        <div style={{display:"flex",gap:8,marginBottom:20,background:"#f1f5f9",padding:4,borderRadius:10}}>
          <button onClick={()=>{setMode("login");setError("");setSuccess("");}} style={{flex:1,padding:"7px",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:13,fontFamily:"Poppins",background:mode==="login"?"white":"transparent",color:mode==="login"?"#1a56db":"#64748b",boxShadow:mode==="login"?"0 1px 4px rgba(0,0,0,.08)":"none"}}>Se connecter</button>
          <button onClick={()=>{setMode("register");setError("");setSuccess("");}} style={{flex:1,padding:"7px",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:13,fontFamily:"Poppins",background:mode==="register"?"white":"transparent",color:mode==="register"?"#1a56db":"#64748b",boxShadow:mode==="register"?"0 1px 4px rgba(0,0,0,.08)":"none"}}>Créer un compte</button>
        </div>

        {error&&<div className="login-error">⚠️ {error}</div>}
        {success&&<div className="login-success">✅ {success}</div>}

        {mode==="login"?(
          <>
            <div className="form-grid" style={{gridTemplateColumns:"1fr"}}>
              <div className="field"><label>Email</label>
                <input type="email" value={email} onChange={e=>{setEmail(e.target.value);setError("");}} placeholder="votre@email.tn"/>
              </div>
              <div className="field"><label>Mot de passe</label>
                <div style={{position:"relative"}}>
                  <input type={show?"text":"password"} value={password}
                    onChange={e=>{setPassword(e.target.value);setError("");}}
                    onKeyDown={e=>e.key==="Enter"&&handleLogin()}
                    placeholder="••••••••" style={{width:"100%",paddingRight:44}}/>
                  <button onClick={()=>setShow(!show)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16}}>
                    {show?"🙈":"👁️"}
                  </button>
                </div>
              </div>
            </div>
            <button className="btn btn-primary" style={{width:"100%",justifyContent:"center",padding:"12px"}}
              onClick={handleLogin} disabled={loading}>
              {loading?"⏳ Connexion...":"🔐 Se connecter"}
            </button>
          </>
        ):(
          <>
            <div className="form-grid" style={{gridTemplateColumns:"1fr"}}>
              <div className="field"><label>Nom complet *</label><input value={nom} onChange={e=>setNom(e.target.value)} placeholder="Votre nom"/></div>
              <div className="field"><label>Email *</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="votre@email.tn"/></div>
              <div className="field"><label>Mot de passe *</label>
                <div style={{position:"relative"}}>
                  <input type={show?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" style={{width:"100%",paddingRight:44}}/>
                  <button onClick={()=>setShow(!show)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16}}>{show?"🙈":"👁️"}</button>
                </div>
              </div>
              <div className="field"><label>CSSB *</label>
                <select value={cssb} onChange={e=>setCssb(e.target.value)}>
                  {CSSB_LIST.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field"><label>Code administrateur *</label>
                <input type="password" value={code} onChange={e=>setCode(e.target.value)} placeholder="Code fourni par l'admin"/>
              </div>
            </div>
            <button className="btn btn-primary" style={{width:"100%",justifyContent:"center",padding:"12px"}}
              onClick={handleRegister} disabled={loading}>
              {loading?"⏳ Envoi...":"📝 Envoyer ma demande"}
            </button>
            <div style={{fontSize:11,color:"#94a3b8",marginTop:10,textAlign:"center"}}>Votre compte sera activé après validation par l'administrateur.</div>
          </>
        )}
        <div style={{textAlign:"center",fontSize:12,color:"#94a3b8",marginTop:16}}>
          Institut Supérieur des Sciences Infirmières · Gabès
        </div>
      </div>
    </div>
  );
}

// ── TEMP CHART ────────────────────────────────────────────────────────────────
function TempChart({ releves }) {
  const W=560, H=180, pad={top:18,bottom:36,left:36,right:16};
  const inner={w:W-pad.left-pad.right, h:H-pad.top-pad.bottom};
  const sorted=[...releves].sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:a.heure<b.heure?-1:1);
  const pts=sorted.slice(-30);
  if(pts.length<2) return null;
  const minT=0, maxT=12;
  const toX=(i)=>pad.left+i*(inner.w/(pts.length-1));
  const toY=(t)=>pad.top+inner.h-(((t-minT)/(maxT-minT))*inner.h);
  const polyline=pts.map((r,i)=>`${toX(i)},${toY(r.temp)}`).join(" ");
  const yTicks=[0,2,4,6,8,10,12];
  return (
    <div className="card" style={{marginBottom:16}}>
      <div className="card-title">📈 Courbe de température</div>
      <div style={{fontSize:12,color:"#64748b",marginBottom:10,display:"flex",gap:16,flexWrap:"wrap"}}>
        <span><span style={{display:"inline-block",width:10,height:10,borderRadius:"50%",background:"#059669",marginRight:4}}/>Normal</span>
        <span><span style={{display:"inline-block",width:10,height:10,borderRadius:"50%",background:"#d97706",marginRight:4}}/>Limite</span>
        <span><span style={{display:"inline-block",width:10,height:10,borderRadius:"50%",background:"#dc2626",marginRight:4}}/>Anormal</span>
      </div>
      <div className="chart-wrap">
        <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
          <rect x={pad.left} y={toY(8)} width={inner.w} height={toY(2)-toY(8)} className="chart-zone-safe"/>
          <rect x={pad.left} y={toY(6.5)} width={inner.w} height={toY(2)-toY(6.5)} className="chart-zone-warn" opacity="0.6"/>
          {yTicks.map(t=>(
            <g key={t}>
              <line x1={pad.left} y1={toY(t)} x2={pad.left+inner.w} y2={toY(t)} className="chart-axis"/>
              <text x={pad.left-4} y={toY(t)+4} textAnchor="end" className="chart-label">{t}</text>
            </g>
          ))}
          <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top+inner.h} className="chart-axis" stroke="#94a3b8"/>
          <line x1={pad.left} y1={pad.top+inner.h} x2={pad.left+inner.w} y2={pad.top+inner.h} className="chart-axis" stroke="#94a3b8"/>
          <polyline points={polyline} className="chart-line"/>
          {pts.map((r,i)=>{
            const ok=r.temp>=2&&r.temp<=8,lim=r.temp>6.5&&r.temp<=8;
            const cls=!ok?"chart-point-bad":lim?"chart-point-warn":"chart-point-ok";
            return <circle key={i} cx={toX(i)} cy={toY(r.temp)} r={3.5} className={cls}/>;
          })}
          {pts.filter((_,i)=>i===0||i===pts.length-1||pts.length<=8||(i%(Math.ceil(pts.length/6))===0)).map((r,i,arr)=>{
            const orig=pts.findIndex(p=>p===arr[i]);
            return <text key={i} x={toX(orig)} y={H-6} textAnchor="middle" className="chart-label">{r.date.slice(5)}</text>;
          })}
        </svg>
      </div>
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function DashboardTab({ vaccins, releves, utilisations, toast, isAdmin, currentUser }) {
  const myCssb=isAdmin?null:currentUser?.cssb||null;
  const myVaccins=myCssb?vaccins.filter(v=>v.cssb===myCssb):vaccins;
  const myReleves=myCssb?releves.filter(r=>r.cssb===myCssb):releves;
  const myUtilisations=myCssb?utilisations.filter(u=>u.cssb===myCssb):utilisations;
  const last=myReleves[0];
  const faibles=myVaccins.filter(v=>v.statut==="faible").length;
  const urgents=myVaccins.filter(v=>daysUntil(v.peremption)<30).length;
  const tempOk=last?(last.temp>=2&&last.temp<=8):null;
  const tempPct=last?Math.min(100,Math.max(0,(last.temp/11)*100)):50;
  return (
    <div>
      <div className="dash-logo-bar">
        <img src={LOGO_UNI} alt="Université de Gabès"/>
        <div className="dash-logo-center">
          <h3>Gestion Vaccinale Intelligente</h3>
          <p>I.S.S.I.G Gabès · Chaîne du froid vaccins · Conforme OMS</p>
        </div>
        <img src={LOGO_APP} alt="VaccineChain"/>
      </div>
      <div className="sec-label">📊 Vue d'ensemble</div>
      <h2 className="sec-title">Tableau de bord</h2>
      <p className="sec-sub">État en temps réel de votre chaîne du froid.</p>
      <div className="dash-grid">
        <div className={`stat-card ${tempOk===null?"s-info":tempOk?"s-ok":"s-alert"}`}>
          <div className="stat-icon">🌡️</div>
          <div className="stat-val">{last?`${last.temp}°C`:"—"}</div>
          <div className="stat-lbl">Dernière température</div>
          <div className="stat-badge">{tempOk===null?"Aucun relevé":tempOk?"✓ Norme":"⚠️ Hors norme"}</div>
        </div>
        <div className="stat-card s-info">
          <div className="stat-icon">💉</div><div className="stat-val">{myVaccins.length}</div>
          <div className="stat-lbl">Types de vaccins</div><div className="stat-badge">{myCssb?myCssb:"Total"}</div>
        </div>
        <div className={`stat-card ${faibles>0?"s-warn":"s-ok"}`}>
          <div className="stat-icon">⚠️</div><div className="stat-val">{faibles}</div>
          <div className="stat-lbl">Stock faible</div>
          <div className="stat-badge">{faibles>0?"À réapprovisionner":"✓ OK"}</div>
        </div>
        <div className={`stat-card ${urgents>0?"s-alert":"s-ok"}`}>
          <div className="stat-icon">📅</div><div className="stat-val">{urgents}</div>
          <div className="stat-lbl">Péremptions &lt;30j</div>
          <div className="stat-badge">{urgents>0?"Urgent":"✓ OK"}</div>
        </div>
        <div className="stat-card s-purple">
          <div className="stat-icon">📤</div><div className="stat-val">{myUtilisations.length}</div>
          <div className="stat-lbl">Sorties enregistrées</div>
          <div className="stat-badge">Journal</div>
        </div>
      </div>
      {last&&(
        <div className="card" style={{marginBottom:16}}>
          <div className="card-title">🌡️ Température actuelle</div>
          <div style={{display:"flex",alignItems:"center",gap:20,flexWrap:"wrap"}}>
            <div style={{textAlign:"center",minWidth:80}}>
              <div style={{fontFamily:"Poppins",fontSize:36,fontWeight:800,color:tempOk?"#059669":"#dc2626"}}>{last.temp}°C</div>
              <div style={{fontSize:11,color:"#64748b"}}>{last.date} {last.heure}</div>
            </div>
            <div style={{flex:1,minWidth:180}}>
              <div style={{fontSize:12,color:"#64748b",marginBottom:6}}>Zone sécurisée : +2°C à +8°C</div>
              <div className="progress-bar" style={{height:14}}>
                <div className="progress-fill" style={{width:`${tempPct}%`,background:tempOk?"#10b981":"#ef4444"}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#94a3b8",marginTop:4}}>
                <span>0°C</span><span>2°C</span><span>8°C</span><span>11+</span>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="btn-row" style={{marginBottom:16}}>
        <button className="btn btn-primary" onClick={async()=>{toast("⏳ Génération...");await exportStockPDF(myVaccins,myCssb||undefined);}}>
          📄 Stock vaccinal
        </button>
        <button className="btn btn-primary" onClick={async()=>{toast("⏳ Génération...");await exportRelevesPDF(myReleves,"","",myCssb||undefined);}}>
          📄 Feuille de température
        </button>
      </div>
      {myReleves.length>1&&<TempChart releves={myReleves}/>}
      <div className="card">
        <div className="card-title">📦 Résumé stock{myCssb?` — ${myCssb}`:""}</div>
        {myVaccins.length===0?<div className="empty"><div className="empty-icon">💉</div><h4>Aucun vaccin</h4></div>:(
          <div className="tbl-wrap"><table>
            <thead><tr><th>Vaccin</th><th>Qté</th><th>Péremption</th><th>Statut</th></tr></thead>
            <tbody>{myVaccins.map(v=>{const d=daysUntil(v.peremption);return(
              <tr key={v.id}>
                <td>{v.nom}</td><td style={{fontWeight:700}}>{v.quantite}</td>
                <td><span className={`badge ${d<30?"badge-error":d<90?"badge-warn":"badge-ok"}`}>{d<30?`⚠️ ${d}j`:v.peremption}</span></td>
                <td><span className={`badge ${v.statut==="faible"?"badge-warn":"badge-ok"}`}>{v.statut==="faible"?"⚠️ Faible":"✓ OK"}</span></td>
              </tr>
            );})}</tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}

// ── STOCK ─────────────────────────────────────────────────────────────────────
function StockTab({ vaccins, reload, toast, isAdmin, currentUser }) {
  const [showAdd,setShowAdd]=useState(false); const [editItem,setEditItem]=useState(null);
  const [confirm,setConfirm]=useState(null); const [search,setSearch]=useState("");
  const [filterCssb,setFilterCssb]=useState(isAdmin?"":currentUser?.cssb||"");
  const [form,setForm]=useState({nom:"",quantite:"",seuil_min:"",peremption:"",lot:"",temp:"+2/+8°C",cssb:currentUser?.cssb||CSSB_LIST[0]});
  const [useModal,setUseModal]=useState(null);
  const [useQty,setUseQty]=useState("1");
  const [useObs,setUseObs]=useState("");

  const filtered=vaccins
    .filter(v=>!filterCssb||v.cssb===filterCssb)
    .filter(v=>v.nom.toLowerCase().includes(search.toLowerCase())||String(v.lot||"").toLowerCase().includes(search.toLowerCase()));

  function openAdd(){setForm({nom:"",quantite:"",seuil_min:"",peremption:"",lot:"",temp:"+2/+8°C",cssb:currentUser?.cssb||CSSB_LIST[0]});setEditItem(null);setShowAdd(true);}
  function openEdit(v){setForm({nom:v.nom,quantite:v.quantite,seuil_min:v.seuil_min,peremption:v.peremption||"",lot:v.lot||"",temp:v.temp,cssb:v.cssb||""});setEditItem(v.id);setShowAdd(true);}

  async function saveVaccin(){
    if(!form.nom||!form.quantite){alert("Nom et quantité requis.");return;}
    if(!form.cssb){alert("Veuillez sélectionner une CSSB.");return;}
    const q=parseInt(form.quantite),s=parseInt(form.seuil_min)||5;
    const data={...form,quantite:q,seuil_min:s,statut:q<=s?"faible":"ok"};
    if(editItem){
      const {error}=await supabase.from("vaccins").update(data).eq("id",editItem);
      if(error){alert("Erreur : "+error.message);return;}
      toast("Mis à jour !");
    } else {
      const {error}=await supabase.from("vaccins").insert(data);
      if(error){alert("Erreur : "+error.message);return;}
      toast("Vaccin ajouté !");
    }
    reload(); setShowAdd(false);
  }

  async function updateQty(v,delta){
    const q=Math.max(0,v.quantite+delta);
    await supabase.from("vaccins").update({quantite:q,statut:q<=v.seuil_min?"faible":"ok"}).eq("id",v.id);
    reload();
  }

  async function deleteV(id){
    await supabase.from("vaccins").delete().eq("id",id);
    setConfirm(null); toast("Supprimé."); reload();
  }

  async function handleUse(){
    const qty=parseInt(useQty);
    if(!qty||qty<=0){alert("Quantité invalide.");return;}
    const v=useModal;
    if(qty>v.quantite){alert(`Stock insuffisant. Disponible : ${v.quantite}`);return;}
    const newQ=v.quantite-qty;
    const today=new Date().toISOString().split("T")[0];
    const {error:errV}=await supabase.from("vaccins").update({quantite:newQ,statut:newQ<=v.seuil_min?"faible":"ok"}).eq("id",v.id);
    if(errV){alert("Erreur mise à jour stock : "+errV.message);return;}
    const {error:errU}=await supabase.from("utilisations").insert({
      vaccin_id:v.id, vaccin_nom:v.nom, quantite:qty, cssb:v.cssb,
      nom:currentUser.nom, date:today, obs:useObs
    });
    if(errU){
      alert("⚠️ Sortie enregistrée dans le stock, mais la table 'utilisations' n'existe pas encore dans Supabase.\n\nExécutez ce SQL dans votre Supabase → SQL Editor :\n\nCREATE TABLE IF NOT EXISTS public.utilisations (\n  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n  vaccin_id UUID, vaccin_nom TEXT, quantite INT,\n  cssb TEXT, nom TEXT, date TEXT, obs TEXT,\n  created_at TIMESTAMPTZ DEFAULT NOW()\n);\nALTER TABLE public.utilisations DISABLE ROW LEVEL SECURITY;\nGRANT ALL ON public.utilisations TO anon, authenticated;");
      setUseModal(null); setUseQty("1"); setUseObs(""); reload(); return;
    }
    toast(`📤 ${qty} dose${qty>1?"s":""} de ${v.nom} sortie${qty>1?"s":""}.`);
    setUseModal(null); setUseQty("1"); setUseObs(""); reload();
  }

  return (
    <div>
      <div className="sec-label">💉 Stock de vaccins</div>
      <h2 className="sec-title">Stock de vaccins</h2>
      <p className="sec-sub">Gérez votre stock de vaccins.</p>
      {vaccins.filter(v=>v.statut==="faible").length>0&&(
        <div className="alert-banner"><span style={{fontSize:24}}>⚠️</span>
          <div><h4>Stock faible</h4><p>{vaccins.filter(v=>v.statut==="faible").map(v=>v.nom).join(", ")}</p></div>
        </div>
      )}
      <div className="btn-row" style={{marginBottom:16}}>
        <button className="btn btn-primary" onClick={openAdd}>➕ Ajouter</button>
        {isAdmin&&(
          <select style={{padding:"8px 12px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:13,outline:"none",maxWidth:220}}
            value={filterCssb} onChange={e=>setFilterCssb(e.target.value)}>
            <option value="">Toutes les CSSB</option>
            {CSSB_LIST.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <input style={{padding:"8px 14px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:13,outline:"none",flex:1,maxWidth:280}}
          placeholder="🔍 Rechercher..." value={search} onChange={e=>setSearch(e.target.value)}/>
        <button className="btn btn-outline" onClick={async()=>{toast("⏳ Génération...");await exportStockPDF(filtered,filterCssb||undefined);}}>
          📄 Stock vaccinal
        </button>
      </div>
      {filtered.length===0?<div className="empty"><div className="empty-icon">💉</div><h4>Aucun vaccin</h4></div>:(
        <div className="tbl-wrap"><table>
          <thead><tr><th>Vaccin</th><th>Lot</th><th>Temp.</th><th>Quantité</th><th>Péremption</th><th>Statut</th><th>CSSB</th><th>Actions</th></tr></thead>
          <tbody>{filtered.map(v=>{const d=daysUntil(v.peremption);return(
            <tr key={v.id}>
              <td>{v.nom}</td>
              <td style={{fontFamily:"monospace",fontSize:12}}>{v.lot||"—"}</td>
              <td><span className="badge badge-info">{v.temp}</span></td>
              <td>{isAdmin?(
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <button className="btn btn-ghost btn-sm" onClick={()=>updateQty(v,-1)} style={{padding:"3px 8px",fontSize:14}}>−</button>
                  <span style={{fontWeight:700,color:v.quantite<=v.seuil_min?"#dc2626":"#059669",minWidth:28,textAlign:"center"}}>{v.quantite}</span>
                  <button className="btn btn-ghost btn-sm" onClick={()=>updateQty(v,1)} style={{padding:"3px 8px",fontSize:14}}>+</button>
                </div>
              ):<span style={{fontWeight:700}}>{v.quantite}</span>}</td>
              <td><span className={`badge ${d<30?"badge-error":d<90?"badge-warn":"badge-ok"}`}>{d<30?`⚠️ ${d}j`:v.peremption}</span></td>
              <td><span className={`badge ${v.statut==="faible"?"badge-warn":"badge-ok"}`}>{v.statut==="faible"?"⚠️ Faible":"✓ OK"}</span></td>
              <td style={{fontSize:12,color:"#64748b"}}>{v.cssb||"—"}</td>
              <td><div style={{display:"flex",gap:6}}>
                <button className="btn btn-purple btn-sm" onClick={()=>{setUseModal(v);setUseQty("1");setUseObs("");}}>📤 Sortie</button>
                {isAdmin&&<>
                  <button className="btn btn-outline btn-sm" onClick={()=>openEdit(v)}>✏️</button>
                  <button className="btn btn-danger btn-sm" onClick={()=>setConfirm(v.id)}>🗑️</button>
                </>}
              </div></td>
            </tr>
          );})}</tbody>
        </table></div>
      )}
      {showAdd&&(
        <div className="modal-bg"><div className="modal">
          <div className="modal-title">{editItem?"✏️ Modifier":"➕ Ajouter"} un vaccin</div>
          <div className="form-grid">
            <div className="field" style={{gridColumn:"span 2"}}><label>Nom *</label><input value={form.nom} onChange={e=>setForm({...form,nom:e.target.value})} placeholder="ex: BCG"/></div>
            <div className="field"><label>N° lot</label><input value={form.lot} onChange={e=>setForm({...form,lot:e.target.value})}/></div>
            <div className="field"><label>Température</label>
              <select value={form.temp} onChange={e=>setForm({...form,temp:e.target.value})}>
                <option>+2/+8°C</option><option>-15/-25°C</option><option>Température ambiante</option>
              </select>
            </div>
            <div className="field"><label>Quantité *</label><input type="number" min="0" value={form.quantite} onChange={e=>setForm({...form,quantite:e.target.value})}/></div>
            <div className="field"><label>Seuil min</label><input type="number" min="0" value={form.seuil_min} onChange={e=>setForm({...form,seuil_min:e.target.value})}/></div>
            <div className="field" style={{gridColumn:"span 2"}}><label>Péremption</label><input type="date" value={form.peremption} onChange={e=>setForm({...form,peremption:e.target.value})}/></div>
            <div className="field" style={{gridColumn:"span 2"}}><label>CSSB</label>
              <select value={form.cssb} onChange={e=>setForm({...form,cssb:e.target.value})} disabled={!isAdmin&&!!currentUser?.cssb}>
                <option value="">— Sélectionner —</option>
                {CSSB_LIST.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={()=>setShowAdd(false)}>Annuler</button>
            <button className="btn btn-primary" onClick={saveVaccin}>{editItem?"💾 Enregistrer":"➕ Ajouter"}</button>
          </div>
        </div></div>
      )}
      {useModal&&(
        <div className="modal-bg"><div className="modal">
          <div className="modal-title">📤 Sortie de vaccin — {useModal.nom}</div>
          <div style={{background:"#f8fafc",borderRadius:12,padding:"12px 16px",marginBottom:16,fontSize:13}}>
            <div>Stock actuel : <strong style={{color:useModal.quantite<=useModal.seuil_min?"#dc2626":"#059669"}}>{useModal.quantite} doses</strong></div>
            <div style={{fontSize:12,color:"#64748b",marginTop:4}}>CSSB : {useModal.cssb}</div>
          </div>
          <div className="form-grid" style={{gridTemplateColumns:"1fr"}}>
            <div className="field"><label>Quantité utilisée *</label>
              <input type="number" min="1" max={useModal.quantite} value={useQty} onChange={e=>setUseQty(e.target.value)}/>
            </div>
            <div className="field"><label>Observations</label>
              <input value={useObs} onChange={e=>setUseObs(e.target.value)} placeholder="Patient, campagne, ..."/>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={()=>setUseModal(null)}>Annuler</button>
            <button className="btn btn-purple" onClick={handleUse}>📤 Confirmer la sortie</button>
          </div>
        </div></div>
      )}
      {confirm&&<ConfirmModal msg="Supprimer ce vaccin ?" onConfirm={()=>deleteV(confirm)} onCancel={()=>setConfirm(null)}/>}
    </div>
  );
}

// ── FEUILLE DE TEMPÉRATURE ────────────────────────────────────────────────────
function RelevesTab({ releves, reload, toast, isAdmin, currentUser }) {
  const now=new Date();
  const [form,setForm]=useState({date:now.toISOString().split("T")[0],heure:now.toTimeString().slice(0,5),temp:"",nom:currentUser.nom,obs:"",cssb:currentUser?.cssb||CSSB_LIST[0]});
  const [confirm,setConfirm]=useState(null);
  const [filterCssb,setFilterCssb]=useState(isAdmin?"":currentUser?.cssb||"");
  const [pdfFrom,setPdfFrom]=useState("");
  const [pdfTo,setPdfTo]=useState("");
  const filtered=releves.filter(r=>!filterCssb||r.cssb===filterCssb);

  async function saveReleve(){
    if(!form.temp){alert("Température requise.");return;}
    if(!form.cssb){alert("Veuillez sélectionner une CSSB.");return;}
    const {error}=await supabase.from("releves").insert({...form,temp:parseFloat(form.temp)});
    if(error){alert("Erreur : "+error.message);return;}
    reload(); toast("Relevé enregistré !");
    setForm({date:now.toISOString().split("T")[0],heure:now.toTimeString().slice(0,5),temp:"",nom:currentUser.nom,obs:"",cssb:currentUser?.cssb||CSSB_LIST[0]});
  }

  return (
    <div>
      <div className="sec-label">🌡️ Feuille de température</div>
      <h2 className="sec-title">Feuille de température</h2>
      <p className="sec-sub">Saisissez vos relevés bi-quotidiens.</p>
      <div className="pdf-row">
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",flex:1}}>
          <span style={{fontWeight:700,fontSize:13,color:"#0a2540"}}>📄 Feuille de température PDF</span>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <label>Du</label>
            <input type="date" value={pdfFrom} onChange={e=>setPdfFrom(e.target.value)}/>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <label>Au</label>
            <input type="date" value={pdfTo} onChange={e=>setPdfTo(e.target.value)}/>
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={async()=>{toast("⏳ Génération...");await exportRelevesPDF(filtered,pdfFrom,pdfTo,filterCssb||undefined);}}>
          📄 Exporter
        </button>
      </div>
      <div className="releve-form">
        <h3 style={{fontSize:15,fontWeight:700,color:"#0a2540",marginBottom:14}}>📋 Nouveau relevé</h3>
        <div className="form-grid">
          <div className="field"><label>Date</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></div>
          <div className="field"><label>Heure</label><input type="time" value={form.heure} onChange={e=>setForm({...form,heure:e.target.value})}/></div>
          <div className="field"><label>Température °C *</label><input type="number" step="0.1" value={form.temp} onChange={e=>setForm({...form,temp:e.target.value})} placeholder="4.5"/></div>
          <div className="field"><label>Responsable</label><input value={form.nom} onChange={e=>setForm({...form,nom:e.target.value})}/></div>
          <div className="field"><label>CSSB</label>
            <select value={form.cssb} onChange={e=>setForm({...form,cssb:e.target.value})} disabled={!isAdmin&&!!currentUser?.cssb}>
              {CSSB_LIST.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field" style={{gridColumn:"span 2"}}><label>Observations</label><input value={form.obs} onChange={e=>setForm({...form,obs:e.target.value})} placeholder="..."/></div>
        </div>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={saveReleve}>💾 Enregistrer</button>
          <button className="btn btn-ghost" onClick={()=>setForm({date:now.toISOString().split("T")[0],heure:now.toTimeString().slice(0,5),temp:"",nom:currentUser.nom,obs:"",cssb:currentUser?.cssb||CSSB_LIST[0]})}>🔄 Effacer</button>
        </div>
      </div>
      {isAdmin&&(
        <div style={{marginBottom:16}}>
          <select style={{padding:"8px 12px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:13,outline:"none",maxWidth:220}}
            value={filterCssb} onChange={e=>setFilterCssb(e.target.value)}>
            <option value="">Toutes les CSSB</option>
            {CSSB_LIST.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}
      {filtered.length===0?<div className="empty"><div className="empty-icon">🌡️</div><h4>Aucun relevé</h4></div>:(
        <div className="tbl-wrap"><table>
          <thead><tr><th>Date</th><th>Heure</th><th>Température</th><th>Statut</th><th>CSSB</th><th>Responsable</th><th>Observations</th>{isAdmin&&<th></th>}</tr></thead>
          <tbody>{filtered.map(r=>{const {cls,txt}=tempStatus(r.temp);return(
            <tr key={r.id}>
              <td>{r.date}</td><td>{r.heure}</td>
              <td style={{fontWeight:700,fontSize:15}}>{r.temp}°C</td>
              <td><span className={`badge ${cls}`}>{txt}</span></td>
              <td style={{fontSize:12,color:"#64748b"}}>{r.cssb||"—"}</td>
              <td>{r.nom||"—"}</td>
              <td style={{maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.obs||"—"}</td>
              {isAdmin&&<td><button className="btn btn-danger btn-sm" onClick={()=>setConfirm(r.id)}>🗑️</button></td>}
            </tr>
          );})}</tbody>
        </table></div>
      )}
      {confirm&&<ConfirmModal msg="Supprimer ce relevé ?" onConfirm={async()=>{await supabase.from("releves").delete().eq("id",confirm);setConfirm(null);toast("Supprimé.");reload();}} onCancel={()=>setConfirm(null)}/>}
    </div>
  );
}

// ── UTILISATIONS ──────────────────────────────────────────────────────────────
function UtilisationsTab({ utilisations, reload, toast, isAdmin, currentUser }) {
  const myCssb=isAdmin?null:currentUser?.cssb||null;
  const [filterCssb,setFilterCssb]=useState(myCssb||"");
  const [confirm,setConfirm]=useState(null);
  const filtered=utilisations.filter(u=>!filterCssb||u.cssb===filterCssb);

  return (
    <div>
      <div className="sec-label">📤 Sorties</div>
      <h2 className="sec-title">Sorties des vaccins</h2>
      <p className="sec-sub">Historique des doses sorties, déduites du stock.</p>
      <div className="btn-row" style={{marginBottom:16}}>
        {isAdmin&&(
          <select style={{padding:"8px 12px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:13,outline:"none",maxWidth:220}}
            value={filterCssb} onChange={e=>setFilterCssb(e.target.value)}>
            <option value="">Toutes les CSSB</option>
            {CSSB_LIST.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <button className="btn btn-purple" onClick={async()=>{toast("⏳ Génération...");await exportSortiesPDF(filtered,filterCssb||undefined);}}>
          📄 Exporter PDF
        </button>
      </div>
      {filtered.length===0?<div className="empty"><div className="empty-icon">📤</div><h4>Aucune sortie enregistrée</h4><p>Cliquez sur "📤 Sortie" dans l'onglet Stock de vaccins pour enregistrer une sortie.</p></div>:(
        <div className="tbl-wrap"><table>
          <thead><tr><th>Date</th><th>Vaccin</th><th>Qté utilisée</th><th>CSSB</th><th>Responsable</th><th>Observations</th>{isAdmin&&<th></th>}</tr></thead>
          <tbody>{filtered.map(u=>(
            <tr key={u.id}>
              <td>{u.date||"—"}</td>
              <td>{u.vaccin_nom||"—"}</td>
              <td><span className="badge badge-purple">−{u.quantite} dose{u.quantite>1?"s":""}</span></td>
              <td style={{fontSize:12,color:"#64748b"}}>{u.cssb||"—"}</td>
              <td>{u.nom||"—"}</td>
              <td style={{maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.obs||"—"}</td>
              {isAdmin&&<td><button className="btn btn-danger btn-sm" onClick={()=>setConfirm(u.id)}>🗑️</button></td>}
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {confirm&&<ConfirmModal msg="Supprimer cet enregistrement ?" onConfirm={async()=>{await supabase.from("utilisations").delete().eq("id",confirm);setConfirm(null);toast("Supprimé.");reload();}} onCancel={()=>setConfirm(null)}/>}
    </div>
  );
}

// ── HISTORIQUE ALERTES ────────────────────────────────────────────────────────
function AlertesTab({ vaccins, releves, isAdmin, currentUser }) {
  const myCssb=isAdmin?null:currentUser?.cssb||null;
  const myVaccins=myCssb?vaccins.filter(v=>v.cssb===myCssb):vaccins;
  const myReleves=myCssb?releves.filter(r=>r.cssb===myCssb):releves;

  const tempAlertes=myReleves
    .filter(r=>r.temp<2||r.temp>8)
    .map(r=>({id:`t${r.id}`,type:"error",icon:"🌡️",titre:"Température hors norme",desc:`${r.temp}°C — ${r.cssb||"?"} — par ${r.nom||"?"}`,date:`${r.date} ${r.heure}`}));

  const stockAlertes=myVaccins
    .filter(v=>v.statut==="faible")
    .map(v=>({id:`s${v.id}`,type:"warn",icon:"⚠️",titre:"Stock faible",desc:`${v.nom} — ${v.quantite} doses (seuil: ${v.seuil_min}) — ${v.cssb||"?"}`,date:"Actuel"}));

  const peremAlertes=myVaccins
    .filter(v=>daysUntil(v.peremption)<30&&daysUntil(v.peremption)>=0)
    .map(v=>({id:`p${v.id}`,type:"error",icon:"📅",titre:"Péremption imminente",desc:`${v.nom} — ${daysUntil(v.peremption)} jours restants — ${v.cssb||"?"}`,date:v.peremption}));

  const all=[...tempAlertes,...stockAlertes,...peremAlertes];

  return (
    <div>
      <div className="sec-label">🔔 Alertes</div>
      <h2 className="sec-title">Historique des alertes</h2>
      <p className="sec-sub">Températures hors norme, stocks faibles et péremptions imminentes.</p>
      {all.length===0?(
        <div className="empty"><div className="empty-icon">✅</div><h4>Aucune alerte active</h4><p>Tout est en ordre.</p></div>
      ):(
        <>
          <div style={{marginBottom:10,fontSize:13,color:"#64748b"}}>{all.length} alerte{all.length>1?"s":""} active{all.length>1?"s":""}</div>
          <div className="card" style={{padding:0,overflow:"hidden"}}>
            {all.map(a=>(
              <div key={a.id} className="alert-hist-row">
                <div className={`alert-dot ${a.type==="error"?"dot-red":"dot-orange"}`}/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:13,color:"#0a2540"}}>{a.icon} {a.titre}</div>
                  <div style={{fontSize:12,color:"#475569",marginTop:2}}>{a.desc}</div>
                </div>
                <div style={{fontSize:11,color:"#94a3b8",whiteSpace:"nowrap"}}>{a.date}</div>
              </div>
            ))}
          </div>
        </>
      )}
      <div style={{marginTop:20}}>
        <div className="sec-label" style={{marginBottom:12}}>🌡️ Derniers relevés anormaux</div>
        {tempAlertes.length===0?(
          <div style={{fontSize:13,color:"#94a3b8",padding:"12px 0"}}>✅ Aucun relevé anormal.</div>
        ):(
          <div className="tbl-wrap"><table>
            <thead><tr><th>Date</th><th>Heure</th><th>Température</th><th>CSSB</th><th>Responsable</th></tr></thead>
            <tbody>{myReleves.filter(r=>r.temp<2||r.temp>8).map(r=>(
              <tr key={r.id}>
                <td>{r.date}</td><td>{r.heure}</td>
                <td style={{fontWeight:700,color:"#dc2626"}}>{r.temp}°C</td>
                <td style={{fontSize:12,color:"#64748b"}}>{r.cssb||"—"}</td>
                <td>{r.nom||"—"}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}

// ── GUIDE ─────────────────────────────────────────────────────────────────────
function GuideTab({ toast, isAdmin }) {
  const [sections, setSections] = useState([]);
  const [open, setOpen] = useState({});
  const [loading, setLoading] = useState(true);
  const [useDB, setUseDB] = useState(true);
  const [secModal, setSecModal] = useState(null);
  const [secForm, setSecForm] = useState({icone:"📋",titre:"",description:""});
  const [editingItem, setEditingItem] = useState(null);
  const [editItemText, setEditItemText] = useState("");
  const [addingItem, setAddingItem] = useState(null);
  const [newItemText, setNewItemText] = useState("");
  const [confirmSec, setConfirmSec] = useState(null);
  const [confirmItem, setConfirmItem] = useState(null);

  async function loadSections() {
    const { data: secs, error } = await supabase.from("guide_sections").select("*").order("ordre");
    if (error) { setUseDB(false); setSections(DEFAULT_SECTIONS.map((s,i)=>({...s,id:`local_${i}`,items:s.items.map((t,j)=>({id:`li_${i}_${j}`,texte:t,section_id:`local_${i}`}))}))); setLoading(false); return; }
    const { data: items } = await supabase.from("guide_items").select("*").order("ordre");
    const merged = (secs||[]).map(s=>({...s, items:(items||[]).filter(it=>it.section_id===s.id)}));
    setSections(merged); setLoading(false);
  }

  useEffect(()=>{ loadSections(); }, []);

  async function addSection() {
    if(!secForm.titre) return;
    if(useDB){
      const {data} = await supabase.from("guide_sections").insert({...secForm,ordre:sections.length}).select().single();
      setSections(p=>[...p,{...data,items:[]}]);
    } else {
      const id=`local_${Date.now()}`;
      setSections(p=>[...p,{...secForm,id,items:[]}]);
    }
    setSecModal(null); setSecForm({icone:"📋",titre:"",description:""}); toast("Section ajoutée !");
  }

  async function updateSection(id) {
    if(useDB) await supabase.from("guide_sections").update({titre:secForm.titre,icone:secForm.icone,description:secForm.description}).eq("id",id);
    setSections(p=>p.map(s=>s.id===id?{...s,...secForm}:s));
    setSecModal(null); toast("Section mise à jour !");
  }

  async function deleteSection(id) {
    if(useDB){ await supabase.from("guide_items").delete().eq("section_id",id); await supabase.from("guide_sections").delete().eq("id",id); }
    setSections(p=>p.filter(s=>s.id!==id)); setConfirmSec(null); toast("Section supprimée.");
  }

  async function addItem(secId) {
    if(!newItemText.trim()) return;
    if(useDB){
      const sec=sections.find(s=>s.id===secId);
      const {data}=await supabase.from("guide_items").insert({section_id:secId,texte:newItemText.trim(),ordre:sec.items.length}).select().single();
      setSections(p=>p.map(s=>s.id===secId?{...s,items:[...s.items,data]}:s));
    } else {
      const item={id:`li_${Date.now()}`,section_id:secId,texte:newItemText.trim()};
      setSections(p=>p.map(s=>s.id===secId?{...s,items:[...s.items,item]}:s));
    }
    setAddingItem(null); setNewItemText(""); toast("Information ajoutée !");
  }

  async function updateItem(secId, itemId) {
    if(useDB) await supabase.from("guide_items").update({texte:editItemText}).eq("id",itemId);
    setSections(p=>p.map(s=>s.id===secId?{...s,items:s.items.map(it=>it.id===itemId?{...it,texte:editItemText}:it)}:s));
    setEditingItem(null); toast("Modifié !");
  }

  async function deleteItem(secId, itemId) {
    if(useDB) await supabase.from("guide_items").delete().eq("id",itemId);
    setSections(p=>p.map(s=>s.id===secId?{...s,items:s.items.filter(it=>it.id!==itemId)}:s));
    setConfirmItem(null); toast("Supprimé.");
  }

  function openSecModal(sec=null) {
    if(sec) setSecForm({icone:sec.icone,titre:sec.titre,description:sec.description||""});
    else setSecForm({icone:"📋",titre:"",description:""});
    setSecModal(sec||"new");
  }

  if(loading) return <div style={{textAlign:"center",padding:40}}><div className="spinner" style={{margin:"0 auto"}}/></div>;

  return (
    <div>
      <div className="sec-label">📘 Guide et consignes</div>
      <h2 className="sec-title">Guide et consignes — Chaîne du froid</h2>
      <p className="sec-sub">Référentiel éducatif I.S.S.I.G Gabes · Cliquez sur une section pour l'ouvrir</p>

      {!useDB&&(
        <div style={{background:"#fef3c7",border:"1.5px solid #fcd34d",borderRadius:12,padding:"10px 16px",fontSize:12,color:"#92400e",marginBottom:16}}>
          ⚠️ Tables Supabase non trouvées — mode hors-ligne. Créez les tables <code>guide_sections</code> et <code>guide_items</code> pour activer la persistance.
        </div>
      )}

      {isAdmin&&(
        <div className="guide-hint">
          ✏️ En tant qu'admin, vous pouvez modifier le contenu
          <button className="btn btn-primary btn-sm" style={{marginLeft:"auto"}} onClick={()=>openSecModal()}>+ Nouvelle section</button>
        </div>
      )}

      {sections.map((sec,si)=>(
        <div key={sec.id} className="accord">
          <div className="accord-head" onClick={()=>setOpen(p=>({...p,[sec.id]:!p[sec.id]}))}>
            <div className="accord-head-left">
              <span className="accord-icon">{sec.icone}</span>
              <div>
                <div className="accord-title">{si+1}. {sec.titre}</div>
                {sec.description&&<div className="accord-desc">{sec.description}</div>}
              </div>
            </div>
            <div className="accord-actions" onClick={e=>e.stopPropagation()}>
              {isAdmin&&<>
                <button className="btn btn-ghost btn-xs" onClick={()=>openSecModal(sec)}>✏️</button>
                <button className="btn btn-danger btn-xs" onClick={()=>setConfirmSec(sec.id)}>🗑️</button>
              </>}
              <span style={{fontSize:18,color:"#94a3b8",marginLeft:4}}>{open[sec.id]?"▼":"▶"}</span>
            </div>
          </div>

          {open[sec.id]&&(
            <div className="accord-body">
              {sec.items.length===0&&<div style={{color:"#94a3b8",fontSize:13,padding:"8px 0"}}>Aucune information pour l'instant.</div>}
              {sec.items.map(item=>(
                <div key={item.id} className="accord-item">
                  <div className="accord-bullet"/>
                  {editingItem===item.id ? (
                    <div style={{flex:1,display:"flex",gap:6,alignItems:"center"}}>
                      <input className="inline-input" value={editItemText} onChange={e=>setEditItemText(e.target.value)}
                        onKeyDown={e=>{if(e.key==="Enter")updateItem(sec.id,item.id);if(e.key==="Escape")setEditingItem(null);}}
                        autoFocus/>
                      <button className="btn btn-primary btn-xs" onClick={()=>updateItem(sec.id,item.id)}>💾</button>
                      <button className="btn btn-ghost btn-xs" onClick={()=>setEditingItem(null)}>✕</button>
                    </div>
                  ) : (
                    <>
                      <span className="accord-item-text">• {item.texte}</span>
                      {isAdmin&&(
                        <div className="accord-item-edit">
                          <button className="btn btn-ghost btn-xs" onClick={()=>{setEditingItem(item.id);setEditItemText(item.texte);}}>✏️</button>
                          <button className="btn btn-danger btn-xs" onClick={()=>setConfirmItem({secId:sec.id,itemId:item.id})}>🗑️</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}

              {isAdmin&&(
                addingItem===sec.id ? (
                  <div style={{display:"flex",gap:6,marginTop:10,alignItems:"center"}}>
                    <input className="inline-input" value={newItemText} onChange={e=>setNewItemText(e.target.value)} placeholder="Nouvelle information..."
                      onKeyDown={e=>{if(e.key==="Enter")addItem(sec.id);if(e.key==="Escape"){setAddingItem(null);setNewItemText("");}}}
                      autoFocus/>
                    <button className="btn btn-primary btn-xs" onClick={()=>addItem(sec.id)}>Ajouter</button>
                    <button className="btn btn-ghost btn-xs" onClick={()=>{setAddingItem(null);setNewItemText("");}}>✕</button>
                  </div>
                ) : (
                  <button className="btn btn-ghost btn-xs" style={{marginTop:10}} onClick={()=>{setAddingItem(sec.id);setNewItemText("");}}>
                    + Ajouter une information
                  </button>
                )
              )}
            </div>
          )}
        </div>
      ))}

      {sections.length===0&&(
        <div className="empty"><div className="empty-icon">📘</div><h4>Aucune section</h4><p>Cliquez sur "+ Nouvelle section" pour commencer.</p></div>
      )}

      {secModal&&(
        <div className="modal-bg"><div className="modal">
          <div className="modal-title">{secModal==="new"?"➕ Nouvelle section":"✏️ Modifier la section"}</div>
          <div className="form-grid" style={{gridTemplateColumns:"80px 1fr"}}>
            <div className="field"><label>Icône</label><input value={secForm.icone} onChange={e=>setSecForm({...secForm,icone:e.target.value})} style={{fontSize:22,textAlign:"center"}}/></div>
            <div className="field"><label>Titre *</label><input value={secForm.titre} onChange={e=>setSecForm({...secForm,titre:e.target.value})} placeholder="ex: Températures recommandées"/></div>
          </div>
          <div className="field" style={{marginBottom:16}}><label>Description (optionnel)</label>
            <input value={secForm.description} onChange={e=>setSecForm({...secForm,description:e.target.value})} placeholder="Brève description de la section"/>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={()=>setSecModal(null)}>Annuler</button>
            <button className="btn btn-primary" onClick={()=>secModal==="new"?addSection():updateSection(secModal.id)}>
              {secModal==="new"?"➕ Créer":"💾 Enregistrer"}
            </button>
          </div>
        </div></div>
      )}

      {confirmSec&&<ConfirmModal msg="Supprimer cette section et tout son contenu ?" onConfirm={()=>deleteSection(confirmSec)} onCancel={()=>setConfirmSec(null)}/>}
      {confirmItem&&<ConfirmModal msg="Supprimer cette information ?" onConfirm={()=>deleteItem(confirmItem.secId,confirmItem.itemId)} onCancel={()=>setConfirmItem(null)}/>}
    </div>
  );
}

// ── USERS ─────────────────────────────────────────────────────────────────────
function UsersTab({ toast, currentUser }) {
  const [users,setUsers]=useState([]); const [pending,setPending]=useState([]);
  const [showAdd,setShowAdd]=useState(false);
  const [confirm,setConfirm]=useState(null);
  const [form,setForm]=useState({nom:"",email:"",password:"",role:"user",cssb:""});
  const [pwdModal,setPwdModal]=useState(null);
  const [newPwd,setNewPwd]=useState("");

  async function load(){
    const {data}=await supabase.from("users").select("*").order("created_at");
    const all=data||[];
    setUsers(all.filter(u=>u.statut!=="pending"));
    setPending(all.filter(u=>u.statut==="pending"));
  }

  useEffect(()=>{load();},[]);

  async function addUser(){
    if(!form.nom||!form.email||!form.password){alert("Tous les champs requis.");return;}
    const {data:existing}=await supabase.from("users").select("id").eq("email",form.email.trim().toLowerCase()).maybeSingle();
    if(existing){alert("Email déjà utilisé par un autre compte.");return;}
    const {error}=await supabase.from("users").insert({...form,email:form.email.trim().toLowerCase(),statut:"active"});
    if(error){
      if(error.code==="23505"||error.message?.includes("duplicate")||error.message?.includes("unique")){
        alert("Email déjà utilisé par un autre compte.");
      } else {
        alert("Erreur lors de la création : "+error.message);
      }
      return;
    }
    toast("Utilisateur ajouté !"); setShowAdd(false); setForm({nom:"",email:"",password:"",role:"user",cssb:""});
    load();
  }

  async function deleteUser(id){
    await supabase.from("users").delete().eq("id",id);
    setConfirm(null); toast("Supprimé."); load();
  }

  async function approveUser(id){
    await supabase.from("users").update({statut:"active"}).eq("id",id);
    toast("Compte approuvé !"); load();
  }

  async function rejectUser(id){
    await supabase.from("users").update({statut:"rejected"}).eq("id",id);
    toast("Demande refusée."); load();
  }

  async function changePassword(){
    if(!newPwd||newPwd.length<4){alert("Mot de passe trop court (min 4 caractères).");return;}
    await supabase.from("users").update({password:newPwd}).eq("id",pwdModal.id);
    toast("Mot de passe modifié !"); setPwdModal(null); setNewPwd("");
  }

  return (
    <div>
      <div className="sec-label">👥 Utilisateurs</div>
      <h2 className="sec-title">Gestion des comptes</h2>
      <p className="sec-sub">Gérez les accès à Gestion Vaccinale Intelligente.</p>

      {pending.length>0&&(
        <div style={{marginBottom:24}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <span style={{fontWeight:700,fontSize:15,color:"#dc2626"}}>🕐 Demandes en attente ({pending.length})</span>
          </div>
          {pending.map(u=>(
            <div key={u.id} className="user-row" style={{borderColor:"#fecaca",background:"#fff5f5"}}>
              <div className="user-big-avatar avatar-user">{u.nom.charAt(0).toUpperCase()}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14,color:"#0a2540"}}>{u.nom}</div>
                <div style={{fontSize:12,color:"#64748b"}}>{u.email}{u.cssb?` — ${u.cssb}`:""}</div>
              </div>
              <span className="badge badge-warn">En attente</span>
              <button className="btn btn-primary btn-sm" onClick={()=>approveUser(u.id)}>✅ Approuver</button>
              <button className="btn btn-danger btn-sm" onClick={()=>rejectUser(u.id)}>❌ Refuser</button>
            </div>
          ))}
        </div>
      )}

      <div className="btn-row" style={{marginBottom:20}}>
        <button className="btn btn-primary" onClick={()=>setShowAdd(true)}>➕ Ajouter</button>
      </div>
      {users.map(u=>(
        <div key={u.id} className="user-row">
          <div className={`user-big-avatar ${u.role==="admin"?"avatar-admin":"avatar-user"}`}>{u.nom.charAt(0).toUpperCase()}</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:14,color:"#0a2540"}}>{u.nom}</div>
            <div style={{fontSize:12,color:"#64748b"}}>{u.email}{u.cssb?` — ${u.cssb}`:""}</div>
          </div>
          <span className={`role-tag ${u.role==="admin"?"role-admin":"role-user"}`}>{u.role==="admin"?"👑 Admin":"👤 User"}</span>
          <button className="btn btn-ghost btn-sm" onClick={()=>{setPwdModal(u);setNewPwd("");}}>🔑 Mot de passe</button>
          <button className="btn btn-danger btn-sm" onClick={()=>setConfirm(u.id)}>🗑️</button>
        </div>
      ))}
      {showAdd&&(
        <div className="modal-bg"><div className="modal">
          <div className="modal-title">➕ Nouvel utilisateur</div>
          <div className="form-grid" style={{gridTemplateColumns:"1fr"}}>
            <div className="field"><label>Nom</label><input value={form.nom} onChange={e=>setForm({...form,nom:e.target.value})} placeholder="Infirmier Ahmed"/></div>
            <div className="field"><label>Email</label><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="ahmed@issig.tn"/></div>
            <div className="field"><label>Mot de passe</label><input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></div>
            <div className="field"><label>Rôle</label>
              <select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
                <option value="user">👤 Utilisateur</option>
                <option value="admin">👑 Administrateur</option>
              </select>
            </div>
            <div className="field"><label>CSSB</label>
              <select value={form.cssb} onChange={e=>setForm({...form,cssb:e.target.value})}>
                <option value="">— Aucune (admin) —</option>
                {CSSB_LIST.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={()=>setShowAdd(false)}>Annuler</button>
            <button className="btn btn-primary" onClick={addUser}>➕ Créer</button>
          </div>
        </div></div>
      )}
      {pwdModal&&(
        <div className="modal-bg"><div className="modal">
          <div className="modal-title">🔑 Modifier le mot de passe — {pwdModal.nom}</div>
          <div className="field" style={{marginBottom:16}}>
            <label>Nouveau mot de passe *</label>
            <input type="password" value={newPwd} onChange={e=>setNewPwd(e.target.value)} placeholder="Nouveau mot de passe" autoFocus/>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={()=>setPwdModal(null)}>Annuler</button>
            <button className="btn btn-primary" onClick={changePassword}>💾 Enregistrer</button>
          </div>
        </div></div>
      )}
      {confirm&&<ConfirmModal msg="Supprimer cet utilisateur ?" onConfirm={()=>deleteUser(confirm)} onCancel={()=>setConfirm(null)}/>}
    </div>
  );
}

// ── MON PROFIL (changer son propre mot de passe) ──────────────────────────────
function ProfilTab({ currentUser, onUpdateUser, toast }) {
  const [pwd,setPwd]=useState(""); const [pwd2,setPwd2]=useState("");
  const [loading,setLoading]=useState(false);

  async function handleChange(){
    if(!pwd||pwd.length<4){alert("Mot de passe trop court (min 4 caractères).");return;}
    if(pwd!==pwd2){alert("Les mots de passe ne correspondent pas.");return;}
    setLoading(true);
    const {error}=await supabase.from("users").update({password:pwd}).eq("id",currentUser.id);
    setLoading(false);
    if(error){alert("Erreur : "+error.message);return;}
    const updated={...currentUser,password:pwd};
    localStorage.setItem("vc_user",JSON.stringify(updated));
    onUpdateUser(updated);
    toast("Mot de passe modifié !"); setPwd(""); setPwd2("");
  }

  return (
    <div>
      <div className="sec-label">👤 Profil</div>
      <h2 className="sec-title">Mon profil</h2>
      <p className="sec-sub">Modifiez votre mot de passe de connexion.</p>
      <div className="card" style={{maxWidth:440}}>
        <div style={{marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
            <div className={`user-big-avatar ${currentUser.role==="admin"?"avatar-admin":"avatar-user"}`} style={{width:52,height:52,fontSize:22}}>
              {currentUser.nom.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{fontWeight:700,fontSize:16,color:"#0a2540"}}>{currentUser.nom}</div>
              <div style={{fontSize:13,color:"#64748b"}}>{currentUser.email}</div>
              {currentUser.cssb&&<div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>{currentUser.cssb}</div>}
            </div>
          </div>
        </div>
        <div className="form-grid" style={{gridTemplateColumns:"1fr"}}>
          <div className="field"><label>Nouveau mot de passe *</label>
            <input type="password" value={pwd} onChange={e=>setPwd(e.target.value)} placeholder="••••••••"/>
          </div>
          <div className="field"><label>Confirmer le mot de passe *</label>
            <input type="password" value={pwd2} onChange={e=>setPwd2(e.target.value)} placeholder="••••••••"
              onKeyDown={e=>e.key==="Enter"&&handleChange()}/>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleChange} disabled={loading}>
          {loading?"⏳ Enregistrement...":"🔑 Changer le mot de passe"}
        </button>
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [currentUser,setCurrentUser]=useState(null);
  const [tab,setTab]=useState("dashboard");
  const [vaccins,setVaccins]=useState([]);
  const [releves,setReleves]=useState([]);
  const [utilisations,setUtilisations]=useState([]);
  const [loading,setLoading]=useState(true);
  const [toastMsg,setToastMsg]=useState(null);
  const [notifs,setNotifs]=useState([]);
  const [showNotifs,setShowNotifs]=useState(false);

  useEffect(()=>{
    const saved=localStorage.getItem("vc_user");
    if(saved) setCurrentUser(JSON.parse(saved));
    setLoading(false);
  },[]);

  const loadData = async () => {
    const [{data:v},{data:r},{data:u}] = await Promise.all([
      supabase.from("vaccins").select("*").order("nom"),
      supabase.from("releves").select("*").order("created_at",{ascending:false}),
      supabase.from("utilisations").select("*").order("created_at",{ascending:false})
    ]);
    setVaccins(v||[]); setReleves(r||[]); setUtilisations(u||[]);
  };

  useEffect(()=>{if(currentUser) loadData();},[currentUser]);

  useEffect(()=>{
    if(!currentUser) return;
    const list=[];
    const t=new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
    const myCssb=currentUser.role==="admin"?null:currentUser.cssb;
    const myVaccins=myCssb?vaccins.filter(v=>v.cssb===myCssb):vaccins;
    const myReleves=myCssb?releves.filter(r=>r.cssb===myCssb):releves;
    myVaccins.filter(v=>v.statut==="faible").forEach(v=>{
      list.push({id:`s${v.id}`,type:"warn",icon:"⚠️",title:"Stock faible",body:`${v.nom} : ${v.quantite} doses (seuil: ${v.seuil_min})`,time:t});
    });
    myVaccins.filter(v=>daysUntil(v.peremption)<30).forEach(v=>{
      list.push({id:`p${v.id}`,type:"error",icon:"📅",title:"Péremption proche",body:`${v.nom} — ${daysUntil(v.peremption)} jours restants`,time:t});
    });
    if(myReleves.length>0&&(myReleves[0].temp>8||myReleves[0].temp<2)){
      list.push({id:"temp",type:"error",icon:"🌡️",title:"Température hors norme",body:`Dernier relevé : ${myReleves[0].temp}°C !`,time:t});
    }
    setNotifs(list);
  },[vaccins,releves,currentUser]);

  function toast(msg){setToastMsg(msg);}
  function handleLogout(){setCurrentUser(null);localStorage.removeItem("vc_user");setTab("dashboard");}
  const isAdmin=currentUser?.role==="admin";

  const tabs=[
    {id:"dashboard",label:"📊 Tableau de bord"},
    {id:"stock",label:"💉 Stock de vaccins"},
    {id:"releves",label:"🌡️ Feuille de température"},
    {id:"utilisations",label:"📤 Sorties des vaccins"},
    {id:"alertes",label:"🔔 Alertes"},
    {id:"guide",label:"📘 Guide et consignes"},
    {id:"profil",label:"👤 Mon profil"},
    ...(isAdmin?[{id:"users",label:"👥 Utilisateurs"}]:[]),
  ];

  if(loading) return <div className="loading-screen"><div className="spinner"/><div style={{fontFamily:"Poppins",fontSize:18,fontWeight:700}}>Chargement...</div></div>;
  if(!currentUser) return (<><style>{CSS}</style><LoginPage onLogin={u=>{setCurrentUser(u);}} /></>);

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <nav>
          <div className="nav-inner">
            <div className="logo">
              <img src={LOGO_APP} alt="" style={{height:28,borderRadius:6}}/>
              Gestion Vaccinale Intelligente
            </div>
            <div className="nav-tabs">
              {tabs.map(t=><button key={t.id} className={`nav-tab ${tab===t.id?"active":""}`} onClick={()=>setTab(t.id)}>{t.label}</button>)}
            </div>
            <div className="nav-right">
              <div className="notif-bell" onClick={()=>setShowNotifs(!showNotifs)}>
                🔔{notifs.length>0&&<div className="notif-dot"/>}
              </div>
              <div className="user-chip" onClick={handleLogout} title="Déconnexion">
                <div className={`user-avatar ${isAdmin?"avatar-admin":"avatar-user"}`}>{currentUser.nom.charAt(0).toUpperCase()}</div>
                <div className="user-name">{currentUser.nom.split(" ")[0]}</div>
                <span className={`role-tag ${isAdmin?"role-admin":"role-user"}`}>{isAdmin?"👑":"👤"}</span>
              </div>
            </div>
          </div>
        </nav>

        <div style={{width:"100%",lineHeight:0,borderBottom:"3px solid #1a56db"}}>
          <img src={COVER} alt="cover" style={{width:"100%",display:"block",maxHeight:380,objectFit:"cover",objectPosition:"center"}}/>
        </div>

        {showNotifs&&(
          <div className="notif-panel">
            {notifs.length===0?(
              <div style={{background:"white",borderRadius:14,padding:"16px 20px",boxShadow:"0 8px 30px rgba(0,0,0,.15)",fontSize:13,color:"#64748b"}}>✅ Aucune alerte</div>
            ):notifs.map(n=>(
              <div key={n.id} className={`notif-card ${n.type}`}>
                <div className="notif-top">
                  <div className="notif-title">{n.icon} {n.title}</div>
                  <button className="notif-close" onClick={()=>setNotifs(p=>p.filter(x=>x.id!==n.id))}>×</button>
                </div>
                <div className="notif-body">{n.body}</div>
                <div style={{fontSize:11,color:"#94a3b8",marginTop:4}}>{n.time}</div>
              </div>
            ))}
          </div>
        )}

        <main>
          <div className="tabs">
            {tabs.map(t=><button key={t.id} className={`tab-btn ${tab===t.id?"active":""}`} onClick={()=>setTab(t.id)}>{t.label}</button>)}
          </div>
          {tab==="dashboard"&&<DashboardTab vaccins={vaccins} releves={releves} utilisations={utilisations} toast={toast} isAdmin={isAdmin} currentUser={currentUser}/>}
          {tab==="stock"&&<StockTab vaccins={vaccins} reload={loadData} toast={toast} isAdmin={isAdmin} currentUser={currentUser}/>}
          {tab==="releves"&&<RelevesTab releves={releves} reload={loadData} toast={toast} isAdmin={isAdmin} currentUser={currentUser}/>}
          {tab==="utilisations"&&<UtilisationsTab utilisations={utilisations} reload={loadData} toast={toast} isAdmin={isAdmin} currentUser={currentUser}/>}
          {tab==="alertes"&&<AlertesTab vaccins={vaccins} releves={releves} isAdmin={isAdmin} currentUser={currentUser}/>}
          {tab==="guide"&&<GuideTab toast={toast} isAdmin={isAdmin}/>}
          {tab==="profil"&&<ProfilTab currentUser={currentUser} onUpdateUser={setCurrentUser} toast={toast}/>}
          {tab==="users"&&isAdmin&&<UsersTab toast={toast} currentUser={currentUser}/>}
        </main>

        <footer style={{background:"#0a2540",color:"rgba(255,255,255,.6)",padding:"20px",textAlign:"center",fontSize:12}}>
          🧊 Gestion Vaccinale Intelligente — I.S.S.I.G Gabès · Conforme OMS
        </footer>
      </div>
      {toastMsg&&<Toast msg={toastMsg} onDone={()=>setToastMsg(null)}/>}
    </>
  );
}
