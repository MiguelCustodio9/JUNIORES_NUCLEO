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

  // tentar usar logo carregado (window.logoDataUrl) — se disponível usa; senão desenha emblema simples
  try {
    const emblemaW = 28;
    const emblemaH = 28;
    const emblemaX = 210 - 14 - emblemaW; // margem direita
    const emblemaY = 6;
    if (window.logoDataUrl) {
      // detecta tipo de imagem a partir do dataURL (image/png ou image/jpeg)
      const match = window.logoDataUrl.match(/^data:(image\/\w+);base64,/i);
      const mime = match ? match[1].toLowerCase() : 'image/png';
      const type = mime.includes('jpeg') || mime.includes('jpg') ? 'JPEG' : 'PNG';
      doc.addImage(window.logoDataUrl, type, emblemaX, emblemaY, emblemaW, emblemaH);
    } else {
      doc.setDrawColor(0,0,0);
      doc.setFillColor(31, 174, 99);
      doc.circle(emblemaX + 14, emblemaY + 14, 14, 'F');
      doc.setTextColor(255,255,255);
      doc.setFontSize(12);
      doc.text('SC', emblemaX + 14, emblemaY + 18, { align: 'center', baseline: 'middle' });
      doc.setTextColor(20,20,20);
    }
  } catch (e) {
    // silencioso — se addImage falhar ou jsPDF não suportar operação, ignorar
  }

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

// Preload do logo.png (se existir) em background; popula `window.logoDataUrl` com um dataURL.
(function preloadLogo() {
  const path = 'logo.png';
  fetch(path).then(res => {
    if (!res.ok) throw new Error('no-logo');
    return res.blob();
  }).then(blob => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  })).then(dataUrl => {
    window.logoDataUrl = dataUrl;
  }).catch(() => {
    // sem logo, fallback continuará a desenhar o emblema
  });
})();
