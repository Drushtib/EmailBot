import mongoose from 'mongoose';

const CampaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    listId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeadList', required: true },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailTemplate', required: false },
    draftType: { type: String, default: '' },
    inlineTemplate: {
      subject: { type: String, default: '' },
      body: { type: String, default: '' }
    },
    senderAccount: {
      provider: { type: String, default: '' },
      label: { type: String, default: '' },
      from: { type: String, default: '' },
      host: { type: String, default: '' },
      port: { type: Number, default: null },
      secure: { type: Boolean, default: false },
      user: { type: String, default: '' },
      pass: { type: String, default: '' },
      tenantId: { type: String, default: '' },
      clientId: { type: String, default: '' },
      clientSecret: { type: String, default: '' }
    },
    status: {
      type: String,
      enum: ['Draft', 'Running', 'Paused', 'Completed', 'Failed'],
      default: 'Draft'
    },
    stats: {
      total: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      pending: { type: Number, default: 0 }
    },
    options: {
      batchSize: { type: Number, default: 1 },
      delaySeconds: { type: Number, default: 5 }
    },
    logs: [{
      at: { type: Date, default: Date.now },
      level: { type: String, default: 'info' },
      message: String
    }],
    startedAt: Date,
    finishedAt: Date
  },
  { timestamps: true }
);

export default mongoose.models.Campaign || mongoose.model('Campaign', CampaignSchema);
