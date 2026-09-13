'use strict';

const E = require('./_ecomail');

function readEvent(item) {
  const msys = item && item.msys ? item.msys : {};
  const data = msys.message_event || msys.track_event || msys.unsubscribe_event || null;
  if (!data || !data.type) return null;
  const timestamp = Number(data.timestamp || 0);
  const meta = data.rcpt_meta || {};
  return {
    provider: 'ecomail', provider_event_id: data.event_id || data.message_id || null,
    email: E.email(data.rcpt_to), event_type: String(data.type),
    campaign_id: data.campaign_id != null ? String(data.campaign_id) : null,
    pipeline_id: meta.pipeline_id != null ? String(meta.pipeline_id) : null,
    subject: data.subject || null,
    occurred_at: timestamp ? new Date(timestamp * 1000).toISOString() : null,
    payload: item
  };
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') return E.json(405, { error: 'Method not allowed' });
  const token = String((event.queryStringParameters && event.queryStringParameters.token) || '');
  if (!process.env.ECOMAIL_WEBHOOK_SECRET || token !== process.env.ECOMAIL_WEBHOOK_SECRET) return E.json(403, { error: 'Forbidden' });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return E.json(503, { error: 'Storage is not configured' });
  try {
    const batchId = String((event.headers && (event.headers['x-messagesystems-batch-id'] || event.headers['X-MessageSystems-Batch-ID'])) || '');
    const input = JSON.parse(event.body || '[]');
    const rows = (Array.isArray(input) ? input : [input]).map(readEvent).filter(Boolean).map(function (row) { row.batch_id = batchId || null; return row; });
    if (rows.length) await E.supabase('email_delivery_events?on_conflict=provider,provider_event_id', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify(rows) });

    for (const row of rows) {
      let patch = null;
      if (row.event_type === 'delivery') patch = { email_status: 'active' };
      if (row.event_type === 'list_unsubscribe' || row.event_type === 'link_unsubscribe') patch = { email_status: 'unsubscribed', marketing_unsubscribed_at: row.occurred_at || new Date().toISOString() };
      if (row.event_type === 'spam_complaint') patch = { email_status: 'complained', marketing_unsubscribed_at: row.occurred_at || new Date().toISOString() };
      if (row.event_type === 'bounce' || row.event_type === 'out_of_band') patch = { email_status: 'bounced' };
      if (patch && row.email) {
        patch.updated_at = new Date().toISOString();
        await E.supabase(`users?email=eq.${encodeURIComponent(row.email)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch) });
      }
    }
    return E.json(200, { ok: true, accepted: rows.length });
  } catch (err) {
    console.error('ecomail-webhook', err);
    return E.json(500, { error: 'Webhook processing failed' });
  }
};
