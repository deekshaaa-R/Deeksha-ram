import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ManualDocumentSpec } from './manualDocumentation';

export function buildManualPdfDocument(spec: ManualDocumentSpec): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 36;

  // Branded Top Header Band
  doc.setFillColor(10, 17, 40);
  doc.rect(0, 0, pageWidth, 94, 'F');

  doc.setTextColor(0, 212, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(`VS TECHNOLOGY · ${spec.badgeText}`, marginX, 26);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(17);
  doc.text(spec.title, marginX, 49);

  doc.setTextColor(169, 180, 208);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const subtitleLines = doc.splitTextToSize(spec.subtitle, pageWidth - marginX * 2);
  doc.text(subtitleLines, marginX, 66);

  // Document Metadata Strip
  let cursorY = 112;
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(`Prepared For: ${spec.preparedFor}`, marginX, cursorY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Generated: ${spec.generatedAt}`, pageWidth - marginX, cursorY, {
    align: 'right',
  });
  cursorY += 16;

  // Quick Contents Summary
  doc.setDrawColor(203, 213, 225);
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
  cursorY += 16;

  const getLastTableFinalY = (fallback: number): number => {
    const meta = doc as unknown as { lastAutoTable?: { finalY: number } };
    return meta.lastAutoTable?.finalY ?? fallback;
  };

  // Render Each Chapter Cleanly
  for (const chapter of spec.chapters) {
    if (cursorY > pageHeight - 140) {
      doc.addPage();
      cursorY = 44;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(10, 17, 40);
    doc.text(`${chapter.code}: ${chapter.title}`, marginX, cursorY);
    cursorY += 13;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const sumLines = doc.splitTextToSize(chapter.summary, pageWidth - marginX * 2);
    doc.text(sumLines, marginX, cursorY);
    cursorY += sumLines.length * 11 + 6;

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      head: [['Step', 'Procedure', 'Instructions']],
      body: chapter.steps.map((s) => [s.step, s.action, s.details]),
      columnStyles: {
        0: { cellWidth: 42, fontStyle: 'bold', textColor: [0, 120, 160] },
        1: { cellWidth: 138, fontStyle: 'bold', textColor: [15, 23, 42] },
        2: { cellWidth: 'auto', textColor: [51, 65, 85] },
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 5.5,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [17, 27, 58],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });

    cursorY = getLastTableFinalY(cursorY + 60) + 18;
  }

  // Role Access & Login Comparison Matrix
  if (cursorY > pageHeight - 170) {
    doc.addPage();
    cursorY = 44;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(10, 17, 40);
  doc.text('Client Login vs. Admin Login - Access Matrix', marginX, cursorY);
  cursorY += 8;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX },
    head: [['Capability', 'Client (Google / Verified)', 'Demo Account (Local)', 'Admin / Fleet Manager']],
    body: spec.roleMatrix.map((row) => [
      row.capability,
      row.clientVerified,
      row.demoClient,
      row.adminManager,
    ]),
    styles: { fontSize: 8, cellPadding: 5, overflow: 'linebreak', textColor: [30, 41, 59] },
    headStyles: { fillColor: [17, 27, 58], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  cursorY = getLastTableFinalY(cursorY + 90) + 18;

  // New Vehicle Onboarding Field Reference
  if (cursorY > pageHeight - 160) {
    doc.addPage();
    cursorY = 44;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(10, 17, 40);
  doc.text('Vehicle Registration Field Reference (Include New Vehicles)', marginX, cursorY);
  cursorY += 8;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX },
    head: [['Field', 'Validation & Rules', 'Example']],
    body: spec.onboardingFields.map((f) => [f.field, f.validationRule, f.exampleValue]),
    styles: { fontSize: 8, cellPadding: 5, overflow: 'linebreak', textColor: [30, 41, 59] },
    headStyles: { fillColor: [17, 27, 58], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  cursorY = getLastTableFinalY(cursorY + 80) + 18;

  // Support Footer Box
  if (cursorY > pageHeight - 90) {
    doc.addPage();
    cursorY = 44;
  }
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(marginX, cursorY, pageWidth - marginX * 2, 46, 6, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('VS Technology Engineering & Dispatch Support Desk', marginX + 12, cursorY + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `Phone / WhatsApp: ${spec.supportContacts.phone}   |   Email: ${spec.supportContacts.email}   |   HQ: ${spec.supportContacts.headOffice}`,
    marginX + 12,
    cursorY + 34
  );

  // Page numbering across all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `VS Technology · User & Client Manual · Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 18,
      { align: 'center' }
    );
  }

  return doc;
}

export function downloadManualPdf(spec: ManualDocumentSpec): void {
  const doc = buildManualPdfDocument(spec);
  doc.save(spec.filename);
}
