// =========================================================
// GERAÇÃO DE PDF — usa jsPDF + jspdf-autotable (carregados via CDN no HTML)
// =========================================================

function novoPdf(titulo, subtitulo) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFillColor(11, 61, 36);
  doc.rect(0, 0, 210, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(titulo, 14, 14);
  doc.setFontSize(10);
  doc.text(subtitulo || "Núcleo SCP Castelo Branco", 14, 21);
  doc.setTextColor(20, 20, 20);
  return doc;
}

function tabelaPdf(doc, startY, head, body, opts = {}) {
  doc.autoTable({
    startY,
    head: [head],
    body,
    headStyles: { fillColor: [23, 138, 78], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [244, 251, 247] },
    styles: { fontSize: 8.5, cellPadding: 3 },
    margin: { left: 14, right: 14 },
    ...opts,
  });
  return doc.lastAutoTable.finalY + 8;
}

function guardarPdf(doc, nomeFicheiro) {
  doc.save(nomeFicheiro);
}
