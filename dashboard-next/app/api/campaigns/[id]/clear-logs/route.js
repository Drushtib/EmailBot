import { NextResponse } from 'next/server';
import connectDB from '../../../../../lib/mongodb';
import Campaign from '../../../../../models/Campaign';

export async function POST(_, { params }) {
  await connectDB();
  const campaign = await Campaign.findById(params.id);
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  campaign.logs = [];
  campaign.stats = {
    total: 0,
    sent: 0,
    failed: 0,
    pending: 0
  };
  campaign.startedAt = null;
  campaign.finishedAt = null;
  if (campaign.status !== 'Running' && campaign.status !== 'Paused') {
    campaign.status = 'Draft';
  }
  await campaign.save();

  return NextResponse.json({ ok: true, campaignId: String(campaign._id) });
}
