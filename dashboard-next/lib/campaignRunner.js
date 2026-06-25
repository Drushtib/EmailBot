import connectDB from './mongodb';
import Campaign from '../models/Campaign';
import LeadList from '../models/LeadList';
import EmailTemplate from '../models/EmailTemplate';
import { getAvailableAccounts, sendEmailForLead } from './emailSender';
import { resolveSenderAccountById } from './senderAccounts';

const runners = global.campaignRunners || new Map();
global.campaignRunners = runners;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function appendLog(campaign, message, level = 'info') {
  campaign.logs = campaign.logs || [];
  campaign.logs.push({ message, level, at: new Date() });
  if (campaign.logs.length > 200) {
    campaign.logs = campaign.logs.slice(-200);
  }
}

export async function startCampaignRunner(campaignId) {
  await connectDB();

  const existing = runners.get(campaignId);
  if (existing?.running) {
    return {
      started: false,
      message: 'Campaign already running'
    };
  }

  const campaign = await Campaign.findById(campaignId);
  if (!campaign) {
    throw new Error('Campaign not found');
  }

  const list = await LeadList.findById(campaign.listId);
  if (!list) {
    throw new Error('Lead list not found');
  }

  const dbTemplate = campaign.templateId ? await EmailTemplate.findById(campaign.templateId) : null;
  const template = dbTemplate || (campaign.inlineTemplate?.subject && campaign.inlineTemplate?.body ? campaign.inlineTemplate : null);
  if (!template || !template.subject || !template.body) {
    throw new Error('Campaign has no email template configured');
  }

  let accounts = [];
  if (campaign.senderAccountId) {
    const resolved = await resolveSenderAccountById(campaign.senderAccountId);
    if (resolved) {
      accounts = [resolved];
    }
  }

  if (!accounts.length && campaign.senderAccount?.provider) {
    accounts = [campaign.senderAccount];
  }

  if (!accounts.length) {
    accounts = getAvailableAccounts();
  }

  if (!accounts.length) {
    throw new Error('No email provider account configured. Set Graph (TENANT_ID/CLIENT_ID/CLIENT_SECRET/GRAPH_SENDER_EMAIL) or SMTP env values.');
  }

  const state = {
    running: true,
    paused: false,
    stop: false
  };
  runners.set(campaignId, state);

  campaign.logs = campaign.logs || [];
  campaign.status = 'Running';
  campaign.startedAt = new Date();
  campaign.stats = campaign.stats || {};
  campaign.stats.total = list.leads.length;
  campaign.stats.sent = list.leads.filter((lead) => lead.status === 'Sent').length;
  campaign.stats.failed = list.leads.filter((lead) => lead.status === 'Failed').length;
  campaign.stats.pending = list.leads.filter((lead) => lead.status !== 'Sent').length;
  appendLog(campaign, `Provider: ${accounts[0].provider || 'smtp'} | Sender: ${accounts[0].from || accounts[0].user || ''}`);
  await campaign.save();

  (async () => {
    try {
      for (let index = 0; index < list.leads.length; index += 1) {
        if (state.stop) {
          appendLog(campaign, 'Stop requested');
          campaign.status = 'Paused';
          break;
        }

        while (state.paused) {
          await wait(1000);
        }

        const lead = list.leads[index];
        if (lead.status === 'Sent') {
          continue;
        }

        const account = accounts[index % accounts.length];
        try {
          await sendEmailForLead({ template, lead, account });
          lead.status = 'Sent';
          lead.error = '';
          lead.sentAt = new Date();
          campaign.stats.sent = (campaign.stats.sent || 0) + 1;
          appendLog(campaign, `Sent ${lead.Email || lead.email || 'lead'} via ${account.provider || 'smtp'}`);
        } catch (error) {
          lead.status = 'Failed';
          lead.error = error?.message || String(error);
          campaign.stats.failed = (campaign.stats.failed || 0) + 1;
          appendLog(campaign, `Failed ${lead.Email || lead.email || 'lead'}: ${error?.message || String(error)}`, 'error');
        }

        campaign.stats.pending = Math.max(0, campaign.stats.total - campaign.stats.sent - campaign.stats.failed);
        campaign.leads = list.leads;
        await campaign.save();
        await wait(1000);
      }

      if (!state.stop) {
        campaign.status = 'Completed';
        campaign.finishedAt = new Date();
        appendLog(campaign, 'Campaign completed');
        await campaign.save();
      } else {
        await campaign.save();
      }
    } catch (error) {
      campaign.status = 'Failed';
      appendLog(campaign, `Fatal campaign error: ${error?.message || String(error)}`, 'error');
      await campaign.save();
    } finally {
      state.running = false;
    }
  })();

  return {
    started: true
  };
}

export async function pauseCampaignRunner(campaignId) {
  const state = runners.get(campaignId);
  if (!state || !state.running) {
    return {
      ok: false,
      message: 'Campaign is not running'
    };
  }
  state.paused = true;
  return { ok: true };
}

export async function resumeCampaignRunner(campaignId) {
  const state = runners.get(campaignId);
  if (!state || !state.running) {
    return {
      ok: false,
      message: 'Campaign is not running'
    };
  }
  state.paused = false;
  return { ok: true };
}

export async function stopCampaignRunner(campaignId) {
  const state = runners.get(campaignId);
  if (!state || !state.running) {
    return {
      ok: false,
      message: 'Campaign is not running'
    };
  }
  state.stop = true;
  state.paused = false;
  return { ok: true };
}

export function getRunnerState(campaignId) {
  return runners.get(campaignId) || { running: false, paused: false };
}
