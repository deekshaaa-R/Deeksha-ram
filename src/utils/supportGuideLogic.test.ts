import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GUIDE_SECTIONS,
  SAMPLE_REPORT_ROWS,
  buildGeofenceRuleSummary,
  filterGuideSections,
  generateTelemetryCsv,
} from './supportGuideLogic';

test('filterGuideSections returns all sections on blank query and narrows matches accurately', () => {
  assert.equal(filterGuideSections(GUIDE_SECTIONS, '').length, 4);
  const geo = filterGuideSections(GUIDE_SECTIONS, 'geofence');
  assert.ok(geo.some((s) => s.id === 'geofence'));
  const csv = filterGuideSections(GUIDE_SECTIONS, 'CSV');
  assert.equal(csv.length, 1);
  assert.equal(csv[0].id, 'reports');
  assert.equal(filterGuideSections(GUIDE_SECTIONS, 'nonexistent_xyz_term').length, 0);
});

test('buildGeofenceRuleSummary validates zone name and clamps radius and speed thresholds', () => {
  const invalid = buildGeofenceRuleSummary({
    zoneName: ' ',
    radiusMeters: 500,
    trigger: 'exit',
    speedLimitKmh: 80,
    notifyWhatsApp: true,
    notifyDashboard: true,
    autoImmobilize: false,
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.error);

  const valid = buildGeofenceRuleSummary({
    zoneName: 'Tumkuru Depot B',
    radiusMeters: 25,
    trigger: 'both',
    speedLimitKmh: 200,
    notifyWhatsApp: true,
    notifyDashboard: true,
    autoImmobilize: true,
  });
  assert.equal(valid.valid, true);
  assert.match(valid.summary, /100 m radius/);
  assert.match(valid.summary, /120 km\/h/);
  assert.match(valid.summary, /WhatsApp/);
  assert.match(valid.summary, /Safe relay cut-off/);
});

test('generateTelemetryCsv formats header and rows cleanly across report types', () => {
  const csv = generateTelemetryCsv(SAMPLE_REPORT_ROWS, 'fuel');
  const lines = csv.split('\n');
  assert.equal(lines.length, 1 + SAMPLE_REPORT_ROWS.length);
  assert.match(lines[0], /^Report Type,Vehicle Plate,Driver,Corridor,Distance \(km\),Fuel Used \(L\),Status$/);
  assert.match(lines[1], /^Fuel Audit,KA-01-FL-4821,/);

  const safetyCsv = generateTelemetryCsv(SAMPLE_REPORT_ROWS.slice(0, 1), 'safety');
  assert.match(safetyCsv, /Safety & ADAS/);
});
