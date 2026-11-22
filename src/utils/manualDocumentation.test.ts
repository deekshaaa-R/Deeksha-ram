import assert from 'node:assert/strict';
import test from 'node:test';
import * as manualDocs from './manualDocumentation.ts';

const { ROLE_ACCESS_MATRIX, VEHICLE_ONBOARDING_FIELDS, buildUserManualSpec } = manualDocs;

test('buildUserManualSpec covers client login, live tracking, registering new vehicles, and reports', () => {
  const manual = buildUserManualSpec({
    preparedFor: 'Mehta Logistics Pvt. Ltd.',
    generatedAt: '2026-11-17 23:05',
  });

  assert.equal(manual.audience, 'user');
  assert.equal(manual.filename, 'vs-technology-user-manual.pdf');
  assert.equal(manual.preparedFor, 'Mehta Logistics Pvt. Ltd.');
  assert.ok(manual.chapters.length >= 4);

  const combinedText = manual.chapters
    .map((c) => `${c.title} ${c.summary} ${c.steps.map((s) => `${s.action} ${s.details}`).join(' ')}`)
    .join(' ');
  assert.match(combinedText, /Google/i);
  assert.match(combinedText, /Demo Fleet Account/i);
  assert.match(combinedText, /IMEI/i);
  assert.match(combinedText, /Register Vehicle/i);
  assert.match(combinedText, /Tracking/i);
});

test('reference matrices remain intact and admin manual builder is removed', () => {
  assert.equal('buildAdminManualSpec' in manualDocs, false);
  assert.ok(ROLE_ACCESS_MATRIX.length >= 6);
  assert.ok(VEHICLE_ONBOARDING_FIELDS.length >= 5);
});
