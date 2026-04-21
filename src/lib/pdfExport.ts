import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { domToCanvas } from 'modern-screenshot';

export interface PDFTransaction {
  date: string;
  merchant: string;
  category: string;
  type: string;
  amount: string;
}

export function exportTransactionsToPDF(transactions: PDFTransaction[], filename: string = 'PennyWise-Transactions.pdf') {
  const doc = new jsPDF();

  // Add Title
  doc.setFontSize(18);
  doc.text('PennyWise AI - Verified Transactions Audit', 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  const dateStr = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.text(`Generated on: ${dateStr}`, 14, 30);

  // Define Table Columns
  const tableColumn = ["Date", "Merchant / Source", "Category", "Type", "Amount (INR)"];
  
  // Format Data for Table
  const tableRows = transactions.map(t => [
    t.date,
    t.merchant,
    t.category,
    t.type,
    t.amount
  ]);

  // Generate Table
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 40,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
    styles: { fontSize: 9, cellPadding: 4 },
    alternateRowStyles: { fillColor: [248, 250, 252] } // Slate 50
  });

  doc.save(filename);
}

export async function exportToPDF(elementId: string, filename: string = 'PennyWise-Report.pdf') {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  try {
    const canvas = await domToCanvas(element, {
      scale: 2,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
    // Fallback to print if library fails
    window.print();
  }
}
