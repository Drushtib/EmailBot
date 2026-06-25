import connectDB from './mongodb';
import SenderAccount from '../models/SenderAccount';
import GraphOAuthAccount from '../models/GraphOAuthAccount';

function getPresetSenderEmails() {
  const raw = String(process.env.PRESET_SENDER_EMAILS || process.env.SENDER_EMAILS || '').trim();
  if (!raw) {
    return [];
  }

  return raw
    .split(/[\,\n\r]+/g)
    .map((s) => String(s || '').trim().toLowerCase())
    .filter(Boolean)
    .filter((s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s));
}

export function getRuntimeSenderAccounts() {
  const accounts = [];
  const tenantId = process.env.TENANT_ID;
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;
  const graphSender = String(process.env.GRAPH_SENDER_EMAIL || '').trim().toLowerCase();

  if (tenantId && clientId && clientSecret && graphSender) {
    accounts.push({
      id: 'outlook-graph',
      provider: 'graph',
      label: 'Outlook / Microsoft 365 (Graph App)',
      from: graphSender,
      tenantId,
      clientId,
      clientSecret
    });

    const presetEmails = getPresetSenderEmails();
    for (const email of presetEmails) {
      if (email && email !== graphSender) {
        accounts.push({
          id: `graph:${email}`,
          provider: 'graph',
          label: 'Outlook / Microsoft 365 (Graph App)',
          from: email,
          tenantId,
          clientId,
          clientSecret
        });
      }
    }
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER;
  if (smtpHost && smtpUser && smtpPass && smtpFrom) {
    const isGmail = String(smtpHost || '').toLowerCase().includes('gmail');
    accounts.push({
      id: isGmail ? 'gmail-default' : 'smtp-default',
      provider: isGmail ? 'gmail' : 'smtp',
      label: isGmail ? 'Gmail SMTP' : 'Default SMTP',
      from: smtpFrom,
      host: smtpHost,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      user: smtpUser,
      pass: smtpPass
    });
  }

  return accounts;
}

export async function resolveSenderAccountById(accountId) {
  const rawId = String(accountId || '').trim();
  if (!rawId) {
    return null;
  }

  if (rawId.startsWith('db:')) {
    const id = rawId.slice(3).trim();
    if (!id) {
      return null;
    }
    await connectDB();
    return SenderAccount.findById(id).lean();
  }

  if (rawId.startsWith('oauth:')) {
    const id = rawId.slice(6).trim();
    if (!id) {
      return null;
    }
    await connectDB();
    const doc = await GraphOAuthAccount.findById(id).lean();
    if (!doc) {
      return null;
    }
    return {
      provider: 'graph_oauth',
      oauthAccountId: String(doc._id),
      from: String(doc.email || '').toLowerCase(),
      tenantId: doc.tenantId,
      scopes: doc.scopes || []
    };
  }

  if (rawId.startsWith('graphapp:')) {
    const email = rawId.slice('graphapp:'.length).trim().toLowerCase();
    if (!email) {
      return null;
    }
    return getRuntimeSenderAccounts().find((acct) => String(acct.from || '').toLowerCase() === email) || null;
  }

  const runtimeAccounts = getRuntimeSenderAccounts();
  const runtimeMatch = runtimeAccounts.find((acct) => acct.id === rawId || String(acct.from || '').toLowerCase() === String(rawId).toLowerCase());
  if (runtimeMatch) {
    return runtimeMatch;
  }

  await connectDB();
  return SenderAccount.findById(rawId).lean();
}
