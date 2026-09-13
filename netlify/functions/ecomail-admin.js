'use strict';

const E = require('./_ecomail');

async function status() {
  const [list, pipelines, webhook, segments] = await Promise.all([
    E.ecomail(`/lists/${encodeURIComponent(process.env.ECOMAIL_LIST_ID)}`),
    E.ecomail('/pipelines'),
    E.ecomail('/account/settings/webhook').catch(function () { return null; }),
    E.listSegments().catch(function () { return []; })
  ]);
  const currentWebhookUrl = webhook && (webhook.url || (webhook.webhook && webhook.webhook.url) || (webhook.data && webhook.data.url));
  const expectedWebhookUrl = webhookUrl();
  return {
    list,
    segments,
    pipelines: Array.isArray(pipelines) ? pipelines : (pipelines && (pipelines.pipelines || pipelines.data)) || [],
    webhook: {
      configured: !!currentWebhookUrl,
      matches: !!currentWebhookUrl && currentWebhookUrl === expectedWebhookUrl
    }
  };
}

function webhookUrl() {
  const base = String(process.env.URL || process.env.SITE_URL || 'https://kenjiacademy.cz').replace(/\/+$/, '');
  const secret = String(process.env.ECOMAIL_WEBHOOK_SECRET || '');
  return secret ? `${base}/.netlify/functions/ecomail-webhook?token=${encodeURIComponent(secret)}` : '';
}

exports.handler = async function handler(event) {
  if (!['GET','POST'].includes(event.httpMethod)) return E.json(405, { error: 'Method not allowed' });
  if (!E.discoveryEnv()) return E.json(200, { configured: false, missingApiKey: !process.env.ECOMAIL_API_KEY });
  try {
    const admin = await E.adminUser(event);
    if (!admin) return E.json(403, { error: 'Forbidden' });
    if (!process.env.ECOMAIL_LIST_ID) {
      const lists = await E.ecomail('/lists');
      return E.json(200, { configured: false, needsListId: true, lists: Array.isArray(lists) ? lists : [] });
    }
    if (event.httpMethod === 'GET') return E.json(200, Object.assign({ configured: true }, await status()));

    const body = JSON.parse(event.body || '{}');
    if (body.action === 'configure-webhook') {
      const url = webhookUrl();
      if (!url) return E.json(503, { error: 'ECOMAIL_WEBHOOK_SECRET is missing' });
      await E.ecomail('/account/settings/webhook', { method: 'POST', body: JSON.stringify({ url }) });
      return E.json(200, { ok: true });
    }
    if (body.action === 'audience-audit') {
      // Jen čtení: porovná Ecomail se Supabase a vrátí, komu se smí poslat.
      return E.json(200, Object.assign({ ok: true }, await E.auditAudience()));
    }
    if (body.action === 'tag-audience') {
      const tag = String(body.tag || '').trim().toLowerCase();
      if (!/^[a-z0-9][a-z0-9-]{1,49}$/.test(tag)) return E.json(400, { error: 'Štítek smí mít jen malá písmena, čísla a pomlčky (2–50 znaků).' });
      return E.json(200, Object.assign({ ok: true, tag }, await E.tagSafeAudience(tag)));
    }
    // Sdílené načtení sekvence a kroku pro akce nad jedním e-mailem.
    async function loadStep() {
      const sequenceId = String(body.sequenceId || '');
      const stepId = String(body.stepId || '');
      if (!/^[0-9a-f-]{36}$/i.test(sequenceId) || !stepId) return null;
      const sequences = await E.supabase(`email_sequences?id=eq.${encodeURIComponent(sequenceId)}&select=*&limit=1`);
      const sequence = Array.isArray(sequences) ? sequences[0] : null;
      const steps = sequence && Array.isArray(sequence.steps) ? sequence.steps : [];
      const index = steps.findIndex(function (step) { return String(step.id) === stepId; });
      if (!sequence || index < 0) return null;
      return { sequence, steps, index, step: steps[index] };
    }
    async function patchStep(ctx, patch) {
      ctx.steps[ctx.index] = Object.assign({}, ctx.step, patch);
      await E.supabase(`email_sequences?id=eq.${encodeURIComponent(ctx.sequence.id)}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ steps: ctx.steps, updated_at: new Date().toISOString() })
      });
    }
    if (body.action === 'send-test') {
      const ctx = await loadStep();
      if (!ctx) return E.json(404, { error: 'E-mail nenalezen' });
      if (!String(ctx.step.subject || '').trim() || !String(ctx.step.body || '').trim()) return E.json(400, { error: 'Chybí předmět nebo tělo e-mailu' });
      const result = await E.sendTestEmail(ctx.sequence, ctx.step, admin.email);   // vždy jen na přihlášeného admina
      return E.json(200, { ok: true, to: admin.email, result });
    }
    if (body.action === 'create-campaign') {
      const ctx = await loadStep();
      if (!ctx) return E.json(404, { error: 'E-mail nenalezen' });
      if (!String(ctx.step.subject || '').trim() || !String(ctx.step.body || '').trim()) return E.json(400, { error: 'Chybí předmět nebo tělo e-mailu' });
      const segmentId = String(body.segmentId || '').replace(/[^0-9a-z_-]/gi, '');
      const created = await E.createCampaign(ctx.sequence, ctx.step, segmentId || null);
      await patchStep(ctx, { ecomail_campaign_id: created.id, ecomail_segment_id: segmentId || null, ecomail_campaign_created_at: new Date().toISOString(), ecomail_campaign_sent_at: null });
      return E.json(200, { ok: true, campaignId: created.id });
    }
    if (body.action === 'send-campaign') {
      const ctx = await loadStep();
      if (!ctx) return E.json(404, { error: 'E-mail nenalezen' });
      if (!ctx.step.ecomail_campaign_id) return E.json(400, { error: 'Nejdřív vytvoř koncept kampaně' });
      if (ctx.step.ecomail_campaign_sent_at) return E.json(400, { error: 'Tahle kampaň už byla odeslána' });
      if (String(body.confirm || '') !== 'ODESLAT') return E.json(400, { error: 'Chybí potvrzení' });
      await E.sendCampaign(ctx.step.ecomail_campaign_id);
      await patchStep(ctx, { ecomail_campaign_sent_at: new Date().toISOString() });
      return E.json(200, { ok: true });
    }
    if (body.action === 'export-template') {
      const sequenceId = String(body.sequenceId || '');
      const stepId = String(body.stepId || '');
      if (!/^[0-9a-f-]{36}$/i.test(sequenceId) || !stepId) return E.json(400, { error: 'Invalid sequence or step' });
      const sequences = await E.supabase(`email_sequences?id=eq.${encodeURIComponent(sequenceId)}&select=*&limit=1`);
      const sequence = Array.isArray(sequences) ? sequences[0] : null;
      const steps = sequence && Array.isArray(sequence.steps) ? sequence.steps : [];
      const index = steps.findIndex(function (step) { return String(step.id) === stepId; });
      if (!sequence || index < 0) return E.json(404, { error: 'Email step not found' });
      const step = steps[index];
      if (!String(step.subject || '').trim() || !String(step.body || '').trim()) return E.json(400, { error: 'Subject and email body are required' });
      const html = E.emailTemplateHtml(sequence, step);
      const payload = { name: `[Kenji] ${sequence.name} - ${step.position}. ${step.subject}`, html };
      let template;
      if (step.ecomail_template_id) {
        template = await E.ecomail(`/templates/${encodeURIComponent(step.ecomail_template_id)}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        template = await E.ecomail('/templates', { method: 'POST', body: JSON.stringify(payload) });
      }
      const templateId = template && (template.id || (template.data && template.data.id));
      if (!templateId) throw new Error('Ecomail did not return template ID');
      steps[index] = Object.assign({}, step, { ecomail_template_id: templateId, ecomail_synced_at: new Date().toISOString() });
      await E.supabase(`email_sequences?id=eq.${encodeURIComponent(sequenceId)}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ steps, updated_at: new Date().toISOString() })
      });
      return E.json(200, { ok: true, templateId });
    }
    if (body.action !== 'sync-consented') return E.json(400, { error: 'Unsupported action' });
    const rows = await E.supabase('users?marketing_consent_at=not.is.null&marketing_unsubscribed_at=is.null&account_status=eq.active&select=email,tier,account_status,display_name,instagram,profile,ai_context,last_seen_at,acquisition_source,marketing_consent_at,marketing_unsubscribed_at,email_preferences,email_status,ecomail_synced_at&limit=500');
    let synced = 0, failed = 0;
    const eligible = (rows || []).filter(E.canMarket);
    for (let index = 0; index < eligible.length; index += 100) {
      const batch = eligible.slice(index, index + 100);
      try {
        const result = await E.syncContacts(batch);
        synced += result.synced;
      }
      catch (err) {
        failed += batch.length;
        const values = encodeURIComponent(`(${batch.map(function (row) { return `"${E.email(row.email).replace(/["\\]/g, '')}"`; }).join(',')})`);
        await E.supabase(`users?email=in.${values}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ ecomail_sync_error: String(err.message || err).slice(0, 500), updated_at: new Date().toISOString() }) });
      }
    }
    return E.json(200, { ok: true, synced, failed });
  } catch (err) {
    console.error('ecomail-admin', err);
    return E.json(500, { error: 'Ecomail admin request failed' });
  }
};
