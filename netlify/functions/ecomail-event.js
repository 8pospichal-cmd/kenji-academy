'use strict';

const E = require('./_ecomail');
const ALLOWED = new Set(['user.verified','profile.updated','preferences.updated','onboarding.completed','audit.completed','hourly_calculator.completed','quiz.completed','community.challenge.completed','purchase.completed']);

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') return E.json(405, { error: 'Method not allowed' });
  if (!E.requiredEnv()) return E.json(503, { error: 'Ecomail is not configured' });
  try {
    const auth = await E.verifiedUser(event);
    if (!auth) return E.json(401, { error: 'Unauthorized' });
    const body = JSON.parse(event.body || '{}');
    const action = String(body.action || '');
    if (!ALLOWED.has(action)) return E.json(400, { error: 'Unsupported event' });
    const row = await E.userRow(auth.email);
    if (!row) return E.json(404, { error: 'User not found' });

    if (!E.canMarket(row)) {
      if (action === 'preferences.updated' && row.marketing_unsubscribed_at) {
        try { await E.unsubscribe(row); } catch (err) { console.warn('Ecomail unsubscribe:', err.message); }
      }
      return E.json(200, { ok: true, skipped: 'no_consent' });
    }

    await E.syncContact(row);
    await E.trackerEvent(row, action, body.value && typeof body.value === 'object' ? body.value : {});
    return E.json(200, { ok: true });
  } catch (err) {
    console.error('ecomail-event', err);
    return E.json(500, { error: 'Ecomail synchronization failed' });
  }
};

