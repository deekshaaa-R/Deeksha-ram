import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLiveTrackHref,
  lookupVehicleRecordByRto,
  parseTrackRtoFromSearch,
  resolveVehicleSearchAction,
  searchVehicleDatabaseByRto,
} from './vehicleSearchLogic';

test('buildLiveTrackHref and parseTrackRtoFromSearch round-trip RTO registration numbers cleanly', () => {
  const href = buildLiveTrackHref('ka-06-tr-4821');
  assert.equal(href, '/?view=platform&trackRto=KA-06-TR-4821');

  const parsed = parseTrackRtoFromSearch('?view=platform&trackRto=ka-06-tr-4821');
  assert.equal(parsed, 'KA-06-TR-4821');
  assert.equal(parseTrackRtoFromSearch('?view=platform'), null);
});

test('resolveVehicleSearchAction links authenticated users directly to live map and gates unauthenticated users', () => {
  const sample = { vehicleNumber: 'TN-01-BL-4410', rtoOffice: 'Chennai Central (Ayanavaram) RTO' };

  const authedClient = resolveVehicleSearchAction({
    record: sample,
    isAuthenticated: true,
    userRole: 'client',
  });
  assert.equal(authedClient.action, 'track-live');
  assert.equal(authedClient.targetScreen, 'live-map');
  assert.equal(authedClient.ctaLabel, 'Open Live Map');
  assert.equal(authedClient.href, '/?view=platform&trackRto=TN-01-BL-4410');

  const authedCustomer = resolveVehicleSearchAction({
    record: sample,
    isAuthenticated: true,
    userRole: 'customer',
  });
  assert.equal(authedCustomer.action, 'track-live');
  assert.equal(authedCustomer.targetScreen, 'live-tracking');

  const guest = resolveVehicleSearchAction({
    record: sample,
    isAuthenticated: false,
    userRole: null,
  });
  assert.equal(guest.action, 'require-auth');
  assert.equal(guest.ctaLabel, 'Sign In to Track');
  assert.equal(guest.trackRto, 'TN-01-BL-4410');
});

test('searchVehicleDatabaseByRto supports rtoOnly strict mode and full database queries', () => {
  const rtoOnlyHit = searchVehicleDatabaseByRto({
    query: 'mh12ev9045',
    rtoOnly: true,
  });
  assert.ok(rtoOnlyHit.exactMatch);
  assert.equal(rtoOnlyHit.exactMatch.vehicleNumber, 'MH-12-EV-9045');

  // Non-RTO text returns 0 in strict rtoOnly mode, but finds driver in default mode
  const rtoOnlyDriver = searchVehicleDatabaseByRto({
    query: 'Murugan Selvam',
    rtoOnly: true,
  });
  assert.equal(rtoOnlyDriver.results.length, 0);

  const broadDriver = searchVehicleDatabaseByRto({
    query: 'Murugan Selvam',
    rtoOnly: false,
  });
  assert.equal(broadDriver.results.length, 1);
  assert.equal(broadDriver.results[0].vehicleNumber, 'TN-01-BL-4410');

  const direct = lookupVehicleRecordByRto('gj 01 ht 6192');
  assert.ok(direct);
  assert.equal(direct.vehicleNumber, 'GJ-01-HT-6192');
});
