import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";

// PRINT — imprime exatamente o documento oficial
export const printDocument = (elementId: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error("Elemento não encontrado para impressão:", elementId);
    return;
  }

  // Clone the element to avoid modifying the DOM, or just get innerHTML
  // We need to ensure styles are present. We'll grab the tailwind CDN from the main document
  const styles = document.getElementsByTagName('head')[0].innerHTML;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Imprimir Documento</title>
            ${styles}
            <style>
                body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 20px; }
                @media print { 
                    @page { margin: 5mm; size: auto; }
                    body { margin: 0; padding: 0; }
                    .no-print { display: none !important; } 
                }
            </style>
          </head>
          <body>
            ${element.outerHTML}
            <script>
                setTimeout(() => {
                    window.print();
                    window.close();
                }, 1000);
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
  }
};

// PDF — BAIXA o documento exatamente como está (A4)
export const downloadPDF = async (elementId: string, fileName = "documento.pdf") => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error("Elemento PDF não encontrado");
    return;
  }

  try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10; // Top margin

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, (imgHeight * pdfWidth) / imgWidth);
      pdf.save(fileName);
  } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Erro ao gerar PDF. Tente novamente.");
  }
};

// EXCEL — baixa tudo exatamente como está na lista ou tabela
export const downloadExcel = (tableId: string, fileName = "documento.xlsx") => {
  const table = document.getElementById(tableId);
  if (!table) {
    console.error("Tabela não encontrada:", tableId);
    return;
  }

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.table_to_sheet(table);
  XLSX.utils.book_append_sheet(workbook, sheet, "Dados");

  XLSX.writeFile(workbook, fileName);
};
