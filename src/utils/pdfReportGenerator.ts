import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AdministrativeReportBundle } from './reportExportLogic';

function formatInrPlain(amount: number): string {
  return `INR ${Math.round(amount).toLocaleString('en-IN')}`;
}

export function buildAdministrativePdfDocument(
  bundle: AdministrativeReportBundle
): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 36;

  // Header band
  doc.setFillColor(10, 17, 40);
  doc.rect(0, 0, pageWidth, 74, 'F');

  doc.setTextColor(0, 212, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('VS TECHNOLOGY · ADMINISTRATIVE FLEET TELEMATICS REPORT', marginX, 26);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  const reportTitle =
    bundle.scope === 'combined'
      ? 'Fleet Tracking Logs & Fuel Efficiency Audit'
      : bundle.scope === 'tracking'
      ? 'Vehicle GPS Tracking & Odometer Log'
      : 'Fuel Efficiency & Diesel Savings Report';
  doc.text(reportTitle, marginX, 49);

  doc.setTextColor(169, 180, 208);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Generated: ${bundle.generatedAt}`, pageWidth - marginX, 30, {
    align: 'right',
  });
  doc.text(
    `Scope: ${bundle.vehicleScopeLabel} · Window: ${bundle.timeRange.toUpperCase()}`,
    pageWidth - marginX,
    46,
    { align: 'right' }
  );

  // Account & Summary strip
  let cursorY = 92;
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(
    `Account: ${bundle.accountName}  |  Organization: ${bundle.companyName}`,
    marginX,
    cursorY
  );
  cursorY += 16;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Avg Efficiency: ${bundle.fuelSummary.avgKmPerL.toFixed(2)} km/L (+${bundle.fuelSummary.improvementPct.toFixed(1)}% vs baseline)   |   Diesel Saved: ${bundle.fuelSummary.totalFuelSavedLiters.toLocaleString('en-IN')} L   |   Est. Savings: ${formatInrPlain(bundle.fuelSummary.estimatedSavingsInr)}   |   Tracking Entries: ${bundle.trackingLogs.length}`,
    marginX,
    cursorY
  );
  cursorY += 18;

  if (bundle.scope === 'fuel' || bundle.scope === 'combined') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Fuel Efficiency & Cost Savings Breakdown', marginX, cursorY);
    cursorY += 8;

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      head: [
        [
          'Period',
          'Actual (km/L)',
          'Baseline (km/L)',
          'Distance (km)',
          'Fuel Used (L)',
          'Fuel Saved (L)',
          'Savings (INR)',
          'Idle (min)',
        ],
      ],
      body: bundle.fuelSeries.map((pt) => [
        pt.period,
        pt.actualKmPerL.toFixed(2),
        pt.baselineKmPerL.toFixed(2),
        pt.distanceKm.toLocaleString('en-IN'),
        pt.fuelUsedLiters.toFixed(1),
        pt.fuelSavedLiters.toFixed(1),
        formatInrPlain(pt.savingsInr),
        pt.idleMinutes.toLocaleString('en-IN'),
      ]),
      styles: { fontSize: 8.5, cellPadding: 5, textColor: [30, 41, 59] },
      headStyles: { fillColor: [17, 27, 58], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    const tableMeta = doc as unknown as { lastAutoTable?: { finalY: number } };
    cursorY = (tableMeta.lastAutoTable?.finalY ?? cursorY + 80) + 24;
  }

  if (bundle.scope === 'tracking' || bundle.scope === 'combined') {
    if (cursorY > doc.internal.pageSize.getHeight() - 120) {
      doc.addPage();
      cursorY = 44;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Vehicle Tracking & Odometer Telemetry Logs', marginX, cursorY);
    cursorY += 8;

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      head: [
        [
          'Timestamp',
          'Vehicle',
          'IMEI',
          'Event',
          'Status',
          'Speed',
          'Odometer',
          'Fuel',
          'Corridor / Zone',
        ],
      ],
      body: bundle.trackingLogs.map((log) => [
        log.timestamp,
        log.vehicleLabel,
        log.imei,
        log.eventType,
        log.status,
        `${log.speedKmh} km/h`,
        `${log.odometerKm.toLocaleString('en-IN')} km`,
        `${log.fuelPercent}%`,
        log.corridor,
      ]),
      styles: { fontSize: 8, cellPadding: 4.5, textColor: [30, 41, 59] },
      headStyles: { fillColor: [17, 27, 58], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
  }

  // Page footer numbering
  const totalPages = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `VS Technology Fleet Portal · Official Administrative Export · Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 18,
      { align: 'center' }
    );
  }

  return doc;
}

export function downloadAdministrativePdf(
  bundle: AdministrativeReportBundle,
  filename: string
): void {
  const doc = buildAdministrativePdfDocument(bundle);
  doc.save(filename);
}

export function downloadCsvFile(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
