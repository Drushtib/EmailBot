'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

function StatCard({ title, value }) {
  return (
    <div className="card">
      <h3>{value}</h3>
      <p>{title}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const k = (status || '').toLowerCase();
  return <span className={`badge ${k}`}>{status}</span>;
}

function RichTextEditor({ value, onChange, placeholder }) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== (value || '')) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const updateValue = () => {
    onChange(editorRef.current?.innerHTML || '');
  };

  const runCommand = (command, val = null) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, val);
    updateValue();
  };

  const onPaste = (e) => {
    const html = e.clipboardData?.getData('text/html');
    if (html) {
      e.preventDefault();
      runCommand('insertHTML', html);
      return;
    }

    const text = e.clipboardData?.getData('text/plain');
    if (text) {
      e.preventDefault();
      const escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
      runCommand('insertHTML', escaped);
    }
  };

  return (
    <div className="wysiwyg-wrap">
      <div className="wysiwyg-toolbar row">
        <select className="select wysiwyg-select" defaultValue="" onChange={(e) => runCommand('fontName', e.target.value)}>
          <option value="" disabled>Font</option>
          <option value="Arial">Arial</option>
          <option value="'Times New Roman'">Times New Roman</option>
          <option value="Calibri">Calibri</option>
          <option value="Georgia">Georgia</option>
          <option value="Verdana">Verdana</option>
        </select>
        <select className="select wysiwyg-select" defaultValue="" onChange={(e) => runCommand('fontSize', e.target.value)}>
          <option value="" disabled>Size</option>
          <option value="2">Small</option>
          <option value="3">Normal</option>
          <option value="4">Medium</option>
          <option value="5">Large</option>
          <option value="6">XL</option>
        </select>
        <button type="button" className="button secondary" onClick={() => runCommand('bold')}>B</button>
        <button type="button" className="button secondary" onClick={() => runCommand('italic')}><i>I</i></button>
        <button type="button" className="button secondary" onClick={() => runCommand('underline')}><u>U</u></button>
        <button type="button" className="button secondary" onClick={() => runCommand('insertUnorderedList')}>List</button>
        <button type="button" className="button secondary" onClick={() => runCommand('justifyLeft')}>Left</button>
        <button type="button" className="button secondary" onClick={() => runCommand('justifyCenter')}>Center</button>
        <button type="button" className="button secondary" onClick={() => runCommand('justifyRight')}>Right</button>
        <button type="button" className="button secondary" onClick={() => runCommand('removeFormat')}>Clear Format</button>
      </div>
      <div
        ref={editorRef}
        className="wysiwyg-editor"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder || 'Compose your draft here...'}
        onInput={updateValue}
        onBlur={updateValue}
        onPaste={onPaste}
      />
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState({ totalUploaded: 0, sent: 0, pending: 0, failed: 0 });
  const [lists, setLists] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [preview, setPreview] = useState([]);
  const [selectedListId, setSelectedListId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [campaignName, setCampaignName] = useState('New Campaign');
  const [delaySeconds, setDelaySeconds] = useState(5);
  const [batchSize, setBatchSize] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [activeAccount, setActiveAccount] = useState('');
  const [testEmailTo, setTestEmailTo] = useState('');
  const [selectedDraft, setSelectedDraft] = useState('cover_story');
  const [draftSubject, setDraftSubject] = useState('');
  const [draftBody, setDraftBody] = useState('');

  const activeCampaign = useMemo(() => campaigns.find((c) => c.status === 'Running' || c.status === 'Paused'), [campaigns]);
  const progressText = activeCampaign ? `${activeCampaign.stats?.sent || 0}/${activeCampaign.stats?.total || 0} emails sent` : '0/0 emails sent';

  const draftTemplates = {
    cover_story: {
      label: 'Cover Story',
      subject: 'Cover Story Opportunity for {{Name}} at {{Company}}',
      body: '<div style="font-family:Calibri, Arial, sans-serif;font-size:15px;line-height:1.55;"><p style="margin:0 0 12px;">Hi {{Name}},</p><p style="margin:0 0 12px;">We would love to feature <strong>{{Company}}</strong> in our upcoming cover story edition.</p><p style="margin:0 0 12px;">Please let us know if you are available for a short interaction.</p><p style="margin:0;">Regards,<br/>Team</p></div>'
    },
    reminder: {
      label: 'Reminder',
      subject: 'Reminder: Cover Story Opportunity',
      body: '<div style="font-family:Calibri, Arial, sans-serif;font-size:15px;line-height:1.55;"><p style="margin:0 0 12px;">Hi {{Name}},</p><p style="margin:0 0 12px;">This is a quick reminder regarding our cover story invitation for <strong>{{Company}}</strong>.</p><p style="margin:0;">Regards,<br/>Team</p></div>'
    },
    follow_up: {
      label: 'Follow Up',
      subject: 'Follow-up: Quick Response Requested',
      body: '<div style="font-family:Calibri, Arial, sans-serif;font-size:15px;line-height:1.55;"><p style="margin:0 0 12px;">Hi {{Name}},</p><p style="margin:0 0 12px;">Following up for your response on the opportunity shared earlier.</p><p style="margin:0;">Regards,<br/>Team</p></div>'
    },
    updated_cost: {
      label: 'Updated Cost',
      subject: 'Updated Cost Details for {{Company}}',
      body: '<div style="font-family:Calibri, Arial, sans-serif;font-size:15px;line-height:1.55;"><p style="margin:0 0 12px;">Hi {{Name}},</p><p style="margin:0 0 12px;">Please find the updated cost details for your participation.</p><p style="margin:0;">Regards,<br/>Team</p></div>'
    },
    final_cost: {
      label: 'Final Cost',
      subject: 'Final Cost Confirmation',
      body: '<div style="font-family:Calibri, Arial, sans-serif;font-size:15px;line-height:1.55;"><p style="margin:0 0 12px;">Hi {{Name}},</p><p style="margin:0 0 12px;">This is the final cost confirmation for your selected plan.</p><p style="margin:0;">Regards,<br/>Team</p></div>'
    }
  };

  const safeFetchJson = async (url, options) => {
    const res = await fetch(url, options);
    const text = await res.text();
    let data = {};

    if (text) {
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        data = {};
      }
    }

    if (!res.ok) {
      throw new Error(data.error || `Request failed: ${url}`);
    }

    return data;
  };

  const loadAll = async () => {
    try {
      const [st, tpl, cps, accRes] = await Promise.all([
        safeFetchJson('/api/stats'),
        safeFetchJson('/api/templates'),
        safeFetchJson('/api/campaigns'),
        safeFetchJson('/api/accounts')
      ]);

      setError('');
      setStats(st);
      setLists(st.lists || []);
      setTemplates(tpl.templates || []);
      setCampaigns(cps.campaigns || []);
      setAccounts(accRes.accounts || []);

      if (!selectedListId && st.lists?.[0]?._id) {
        setSelectedListId(st.lists[0]._id);
      }
      if (!selectedTemplateId && tpl.templates?.[0]?._id) {
        setSelectedTemplateId(tpl.templates[0]._id);
      }
      if (!selectedAccount && accRes.accounts?.[0]?.id) {
        setSelectedAccount(accRes.accounts[0].id);
        setActiveAccount(accRes.accounts[0].from || '');
      }
    } catch (e) {
      setError(e.message || 'Failed to load dashboard data');
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    const t = draftTemplates[selectedDraft];
    if (t) {
      setDraftBody(t.body);
      setDraftSubject((prev) => (prev ? prev : t.subject));
    }
  }, [selectedDraft]);

  useEffect(() => {
    const id = setInterval(loadAll, 5000);
    return () => clearInterval(id);
  }, [selectedListId, selectedTemplateId]);

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const form = new FormData();
    form.append('file', file);

    try {
      const data = await safeFetchJson('/api/uploads', { method: 'POST', body: form });
      setLoading(false);
      setPreview(data.preview || []);
      setSelectedListId(data.listId);
      await loadAll();
    } catch (e) {
      setLoading(false);
      alert(e.message || 'Upload failed');
    }
  };

  const createCampaign = async () => {
    try {
      await safeFetchJson('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName,
          listId: selectedListId,
          templateId: null,
          draftType: selectedDraft,
          inlineTemplate: { subject: draftSubject, body: draftBody },
          senderAccountId: selectedAccount || null,
          options: { batchSize: Number(batchSize), delaySeconds: Number(delaySeconds) }
        })
      });
      await loadAll();
    } catch (e) {
      alert(e.message || 'Failed to create campaign');
    }
  };

  const connectSelectedAccount = async () => {
    const acc = accounts.find((a) => a.id === selectedAccount);
    if (!acc) return alert('Select sender account');
    try {
      await safeFetchJson('/api/accounts/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: acc.id })
      });
      setActiveAccount(acc.from || '');
      alert('Account connected');
    } catch (e) {
      alert(e.message || 'Account connection failed');
    }
  };

  const sendTestEmail = async () => {
    const acc = accounts.find((a) => a.id === selectedAccount);
    if (!acc) return alert('Select sender account');
    if (!testEmailTo) return alert('Enter test recipient email');
    try {
      await safeFetchJson('/api/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: acc.id,
          to: testEmailTo,
          subject: draftSubject,
          body: draftBody
        })
      });
      alert('Test email sent');
    } catch (e) {
      alert(e.message || 'Test email failed');
    }
  };

  const normalizeSelectedListEmails = async () => {
    if (!selectedListId) {
      alert('Select a list first');
      return;
    }
    try {
      const data = await safeFetchJson(`/api/lists/${selectedListId}/normalize-emails`, { method: 'POST' });
      alert(`Email normalization complete. Updated rows: ${data.changed || 0}`);
      await loadAll();
    } catch (e) {
      alert(e.message || 'Failed to normalize emails');
    }
  };

  const startCampaign = async (campaignId) => {
    try {
      const data = await safeFetchJson(`/api/campaigns/${campaignId}/start`, { method: 'POST' });
      if (data.started === false && data.message) {
        alert(data.message);
      }
      await loadAll();
    } catch (e) {
      alert(e.message || 'Failed to start campaign');
    }
  };

  const pauseCampaign = async (campaignId) => {
    try {
      await safeFetchJson(`/api/campaigns/${campaignId}/pause`, { method: 'POST' });
      await loadAll();
    } catch (e) {
      alert(e.message || 'Failed to pause campaign');
    }
  };

  const resumeCampaign = async (campaignId) => {
    try {
      await safeFetchJson(`/api/campaigns/${campaignId}/resume`, { method: 'POST' });
      await loadAll();
    } catch (e) {
      alert(e.message || 'Failed to resume campaign');
    }
  };

  const stopCampaign = async (campaignId) => {
    try {
      await safeFetchJson(`/api/campaigns/${campaignId}/stop`, { method: 'POST' });
      await loadAll();
    } catch (e) {
      alert(e.message || 'Failed to stop campaign');
    }
  };

  const clearCampaignLogs = async (campaignId) => {
    try {
      await safeFetchJson(`/api/campaigns/${campaignId}/clear-logs`, { method: 'POST' });
      await loadAll();
    } catch (e) {
      alert(e.message || 'Failed to clear campaign logs');
    }
  };

  const deleteCampaign = async (campaignId) => {
    if (!window.confirm('Delete this campaign? This cannot be undone.')) {
      return;
    }

    try {
      await safeFetchJson(`/api/campaigns/${campaignId}`, { method: 'DELETE' });
      await loadAll();
    } catch (e) {
      alert(e.message || 'Failed to delete campaign');
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <main className="container grid">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1>Email Automation Dashboard</h1>
          <p>Upload leads, run campaigns, track delivery in real-time.</p>
        </div>
        <button className="button secondary" onClick={logout}>Logout</button>
      </div>
      {error ? <p style={{ color: 'var(--danger)' }}>{error}</p> : null}

      <section className="grid stats-grid">
        <StatCard title="Total Emails Uploaded" value={stats.totalUploaded} />
        <StatCard title="Sent" value={stats.sent} />
        <StatCard title="Pending" value={stats.pending} />
        <StatCard title="Failed" value={stats.failed} />
      </section>

      <section className="card grid">
        <h3>Sender Email Account</h3>
        <div className="row">
          <select className="select" style={{ maxWidth: 360 }} value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}>
            <option value="">Select sender account</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.label} - {a.from}</option>)}
          </select>
          <button className="button secondary" onClick={connectSelectedAccount}>Login / Connect</button>
          <span className="badge sent">Active: {activeAccount || 'none'}</span>
        </div>
      </section>

      <section className="card grid">
        <h3>Select Email Draft</h3>
        <div className="row">
          <select className="select" style={{ maxWidth: 300 }} value={selectedDraft} onChange={(e) => setSelectedDraft(e.target.value)}>
            <option value="cover_story">Cover Story</option>
            <option value="reminder">Reminder</option>
            <option value="follow_up">Follow Up</option>
            <option value="updated_cost">Updated Cost</option>
            <option value="final_cost">Final Cost</option>
          </select>
        </div>
        <p style={{ fontWeight: 600, color: 'var(--text)' }}>Subject Line</p>
        <input className="input" value={draftSubject} onChange={(e) => setDraftSubject(e.target.value)} placeholder="Email Subject" />
        <p style={{ fontWeight: 600, color: 'var(--text)' }}>Draft / Email Body (HTML)</p>
        <RichTextEditor value={draftBody} onChange={setDraftBody} placeholder="Paste formatted draft here (Gmail/Word supported)" />
        <div className="row">
          <input className="input" style={{ maxWidth: 320 }} value={testEmailTo} onChange={(e) => setTestEmailTo(e.target.value)} placeholder="Test recipient email" />
          <button className="button secondary" onClick={sendTestEmail}>Test Email</button>
        </div>
      </section>

      <section className="card grid">
        <h3>Excel Upload (.xlsx / .csv)</h3>
        <div className="row">
          <input type="file" accept=".xlsx,.csv" onChange={onUpload} />
          {loading ? <p>Uploading...</p> : null}
        </div>
        {preview.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Name</th><th>Email</th><th>Company</th></tr>
              </thead>
              <tbody>
                {preview.slice(0, 10).map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.Name || ''}</td>
                    <td>{row.Email || ''}</td>
                    <td>{row.Company || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="card grid">
        <h3>Campaign Management</h3>
        <div className="grid" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', alignItems: 'end' }}>
          <input className="input" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="Campaign Name" />
          <select className="select" value={selectedListId} onChange={(e) => setSelectedListId(e.target.value)}>
            <option value="">Select List</option>
            {lists.map((l) => <option key={l._id} value={l._id}>{l.name} ({l.leadCount})</option>)}
          </select>
          <select className="select" value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)}>
            <option value="">Select Template</option>
            {templates.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
          <input className="input" type="number" min="1" value={batchSize} onChange={(e) => setBatchSize(e.target.value)} placeholder="Batch" />
          <input className="input" type="number" min="1" value={delaySeconds} onChange={(e) => setDelaySeconds(e.target.value)} placeholder="Delay(s)" />
        </div>
        <div className="row">
          <button className="button secondary" onClick={normalizeSelectedListEmails}>Normalize List Emails</button>
          <button className="button" onClick={createCampaign}>Create Campaign</button>
        </div>
      </section>

      <section className="card grid">
        <h3>Campaigns</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Stats</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const total = c.stats?.total || 0;
                const sent = c.stats?.sent || 0;
                const percent = total ? Math.round((sent / total) * 100) : 0;
                return (
                  <tr key={c._id}>
                    <td>{c.name}</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td>
                      <div className="progress"><div style={{ width: `${percent}%` }} /></div>
                      <small>{percent}%</small>
                    </td>
                    <td>{sent}/{total} sent, {c.stats?.failed || 0} failed</td>
                    <td className="row">
                      <button className="button" onClick={() => startCampaign(c._id)}>Start</button>
                      <button className="button warn" onClick={() => pauseCampaign(c._id)}>Pause</button>
                      <button className="button danger" onClick={() => stopCampaign(c._id)}>Stop</button>
                      <button className="button secondary" onClick={() => resumeCampaign(c._id)}>Resume</button>
                      <button className="button danger" onClick={() => clearCampaignLogs(c._id)}>Clear Logs</button>
                      <button className="button danger" onClick={() => deleteCampaign(c._id)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {activeCampaign ? (
        <section className="card grid">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3>Live Logs: {activeCampaign.name}</h3>
            <div className="row">
              <button className="button danger" onClick={() => stopCampaign(activeCampaign._id)}>Stop</button>
              <button className="button danger" onClick={() => clearCampaignLogs(activeCampaign._id)}>Clear Logs</button>
              <button className="button danger" onClick={() => deleteCampaign(activeCampaign._id)}>Delete</button>
            </div>
          </div>
          <p>{progressText}</p>
          <div style={{ maxHeight: 220, overflow: 'auto', background: '#0f172a', color: '#e2e8f0', borderRadius: 10, padding: 10 }}>
            {(activeCampaign.logs || []).slice(-40).map((log, idx) => (
              <div key={idx} style={{ fontSize: 13, marginBottom: 4 }}>
                [{new Date(log.at).toLocaleTimeString()}] {log.message}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
