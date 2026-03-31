/**
 * Audit Requests Panel – PBC (Provided-By-Client) List (Step 2.1)
 *
 * Single flat list of all document requests across all control areas.
 * Evidence items are pulled from the Audit Program (Step 1.3).
 * Supports single or multi-select email sending, grouped by recipient.
 */
import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Button, Chip, Divider, TextField,
  Stack, Alert, IconButton, Tooltip, MenuItem, Table, TableHead,
  TableBody, TableRow, TableCell, TableContainer, Checkbox,
  Dialog, DialogTitle, DialogContent, DialogActions, Grid,
  Collapse,
} from '@mui/material';
import {
  Email, ExpandMore, ExpandLess, Add, DeleteOutline,
  SelectAll, CheckBox, CheckBoxOutlineBlank, FileDownload,
} from '@mui/icons-material';
import { log, LOG_ACTIONS, LOG_RESOURCES } from '../services/auditLogger';

// ── Storage ───────────────────────────────────────────────────────────────────
const RCM_KEY      = (id)  => `mkopa_rcm_${id}`;
const PROG_KEY     = (id, cid) => `mkopa_prog_${id}_${cid}`;
const REQUESTS_KEY = (id)  => `mkopa_pbc_requests_${id}`;

const PBC_STATUSES = ['Not Requested', 'Requested', 'Partially Received', 'Received', 'Not Required'];

const STATUS_COLORS = {
  'Not Requested':      'default',
  'Requested':          'warning',
  'Partially Received': 'info',
  'Received':           'success',
  'Not Required':       'default',
};

// ── Parse evidence text into individual lines ─────────────────────────────────
const parseEvidence = (text) =>
  (text || '')
    .split('\n')
    .map((l) => l.replace(/^[-•\d.)\s]+/, '').trim())
    .filter(Boolean);

// ── Build requests from RCM + Audit Program data ─────────────────────────────
const buildDefaultRequests = (controls, auditId) => {
  const requests = [];
  controls.forEach((control) => {
    const prog = JSON.parse(localStorage.getItem(PROG_KEY(auditId, control.id)) || '{}');
    const items = parseEvidence(prog.evidenceRequired);

    if (items.length) {
      items.forEach((doc, idx) => {
        requests.push({
          id: `${control.id}_${idx}`,
          controlId: control.id,
          controlArea: control.controlArea,
          riskRating: control.riskRating || '',
          document: doc,
          recipientName: control.controlOwner || '',
          recipientEmail: '',
          dueDate: '',
          status: 'Not Requested',
          notes: '',
        });
      });
    } else {
      // No audit program yet — create one placeholder per control
      requests.push({
        id: `${control.id}_0`,
        controlId: control.id,
        controlArea: control.controlArea,
        riskRating: control.riskRating || '',
        document: '',
        recipientName: control.controlOwner || '',
        recipientEmail: '',
        dueDate: '',
        status: 'Not Requested',
        notes: '',
      });
    }
  });
  return requests;
};

// ── Email builder ─────────────────────────────────────────────────────────────
const buildMailto = (recipientEmail, recipientName, items, auditName, dueDate) => {
  const to = encodeURIComponent(recipientEmail || '');

  const controlGroups = items.reduce((acc, item) => {
    if (!acc[item.controlArea]) acc[item.controlArea] = [];
    acc[item.controlArea].push(item.document);
    return acc;
  }, {});

  const bodyLines = Object.entries(controlGroups)
    .map(([area, docs]) =>
      `${area}:\n${docs.map((d, i) => `  ${i + 1}. ${d}`).join('\n')}`
    )
    .join('\n\n');

  const dueText = dueDate ? `\nPlease provide all items by ${dueDate}.` : '';

  const subject = encodeURIComponent(
    `Audit Request – ${Object.keys(controlGroups).join(', ')} – ${auditName || 'Internal Audit'}`
  );

  const body = encodeURIComponent(
    `Dear ${recipientName || 'Team'},\n\n` +
    `We are currently conducting an internal audit and require the following documents/information:\n\n` +
    `${bodyLines}\n` +
    `${dueText}\n\n` +
    `Please do not hesitate to contact us if you have any questions.\n\n` +
    `Best regards,\nM-KOPA Internal Audit Team`
  );

  return `mailto:${to}?subject=${subject}&body=${body}`;
};

// ── Inline editable cell ──────────────────────────────────────────────────────
const EditCell = ({ value, onChange, type = 'text', options, placeholder, width }) => {
  if (options) {
    return (
      <TextField select value={value || ''} onChange={(e) => onChange(e.target.value)}
        size="small" variant="standard" sx={{ minWidth: width || 130 }}>
        {options.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
      </TextField>
    );
  }
  return (
    <TextField value={value || ''} onChange={(e) => onChange(e.target.value)}
      size="small" variant="standard" type={type}
      placeholder={placeholder} sx={{ minWidth: width || 120 }}
      InputLabelProps={type === 'date' ? { shrink: true } : undefined} />
  );
};

// ── Email Preview Dialog ──────────────────────────────────────────────────────
const EmailPreviewDialog = ({ open, onClose, onSend, recipient, items, auditName }) => {
  const [dueDate, setDueDate] = useState('');

  const controlGroups = useMemo(() => items.reduce((acc, item) => {
    if (!acc[item.controlArea]) acc[item.controlArea] = [];
    acc[item.controlArea].push(item.document);
    return acc;
  }, {}), [items]);

  const bodyText =
    `Dear ${recipient.name || 'Team'},\n\n` +
    `We are currently conducting an internal audit and require the following documents/information:\n\n` +
    Object.entries(controlGroups)
      .map(([area, docs]) => `${area}:\n${docs.map((d, i) => `  ${i + 1}. ${d}`).join('\n')}`)
      .join('\n\n') +
    (dueDate ? `\n\nPlease provide all items by ${dueDate}.` : '') +
    `\n\nPlease do not hesitate to contact us if you have any questions.\n\nBest regards,\nM-KOPA Internal Audit Team`;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Email Preview — {items.length} item{items.length !== 1 ? 's' : ''}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={1} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6}>
            <TextField label="To (email)" fullWidth size="small"
              value={recipient.email || ''}
              onChange={(e) => recipient.onEmailChange?.(e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Due Date" type="date" fullWidth size="small"
              InputLabelProps={{ shrink: true }} value={dueDate}
              onChange={(e) => setDueDate(e.target.value)} />
          </Grid>
        </Grid>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.78rem', bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
          {bodyText}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" startIcon={<Email />}
          onClick={() => { onSend(recipient.email, recipient.name, dueDate); onClose(); }}>
          Open in Email Client
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Main panel ────────────────────────────────────────────────────────────────
const AuditRequestsPanel = ({ auditId, auditName }) => {
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [previewData, setPreviewData] = useState(null);
  const [bulkEmail, setBulkEmail] = useState('');
  const [bulkName, setBulkName] = useState('');
  const [bulkDue, setBulkDue] = useState('');
  const [showBulk, setShowBulk] = useState(false);

  useEffect(() => {
    const controls = JSON.parse(localStorage.getItem(RCM_KEY(auditId)) || '[]');
    const saved = JSON.parse(localStorage.getItem(REQUESTS_KEY(auditId)) || '[]');

    // Find control IDs already represented in saved requests
    const coveredControlIds = new Set(saved.map((r) => r.controlId).filter(Boolean));

    // Build rows only for controls not yet in the list
    const newControls = controls.filter((c) => !coveredControlIds.has(c.id));
    const newRows = buildDefaultRequests(newControls, auditId);

    const merged = [...saved, ...newRows];
    setRequests(merged);
    if (newRows.length) {
      localStorage.setItem(REQUESTS_KEY(auditId), JSON.stringify(merged));
    }
    log({ action: LOG_ACTIONS.READ, resource: LOG_RESOURCES.AUDIT, resourceId: String(auditId), details: 'Viewed Audit Requests (PBC List)' });
  }, [auditId]);

  const persist = (updated) => {
    setRequests(updated);
    localStorage.setItem(REQUESTS_KEY(auditId), JSON.stringify(updated));
  };

  const updateField = (id, field, value) => {
    persist(requests.map((r) => r.id === id ? { ...r, [field]: value } : r));
  };

  const addRow = () => {
    const controls = JSON.parse(localStorage.getItem(RCM_KEY(auditId)) || '[]');
    const newRow = {
      id: `manual_${Date.now()}`,
      controlId: null,
      controlArea: controls[0]?.controlArea || '',
      riskRating: '',
      document: '',
      recipientName: '',
      recipientEmail: '',
      dueDate: '',
      status: 'Not Requested',
      notes: '',
    };
    persist([...requests, newRow]);
  };

  const deleteRow = (id) => {
    persist(requests.filter((r) => r.id !== id));
    setSelected((prev) => { const s = new Set(prev); s.delete(id); return s; });
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const toggleAll = () => {
    setSelected(selected.size === requests.length ? new Set() : new Set(requests.map((r) => r.id)));
  };

  const applyBulk = () => {
    const targets = selected.size ? requests.filter((r) => selected.has(r.id)) : requests;
    persist(requests.map((r) => {
      if (!targets.find((t) => t.id === r.id)) return r;
      return {
        ...r,
        ...(bulkEmail ? { recipientEmail: bulkEmail } : {}),
        ...(bulkName  ? { recipientName:  bulkName  } : {}),
        ...(bulkDue   ? { dueDate:        bulkDue   } : {}),
      };
    }));
    setBulkEmail(''); setBulkName(''); setBulkDue('');
    setShowBulk(false);
  };

  const sendEmails = (items, nameOverride, emailOverride, dueOverride) => {
    // Group by recipient email
    const groups = items.reduce((acc, item) => {
      const email = emailOverride || item.recipientEmail || '';
      const name  = nameOverride  || item.recipientName  || 'Team';
      const key   = email || '__no_email__';
      if (!acc[key]) acc[key] = { email, name, items: [] };
      acc[key].items.push(item);
      return acc;
    }, {});

    const entries = Object.values(groups);
    if (entries.length === 1 && !entries[0].email) {
      alert('Please set a recipient email address on the selected items before sending.');
      return;
    }

    entries.forEach(({ email, name, items: grpItems }) => {
      if (!email) return;
      const url = buildMailto(email, name, grpItems, auditName, dueOverride || grpItems[0]?.dueDate || '');
      window.open(url, '_blank');
    });

    // Mark as Requested
    persist(requests.map((r) =>
      items.find((i) => i.id === r.id) ? { ...r, status: 'Requested' } : r
    ));
    log({ action: LOG_ACTIONS.UPDATE, resource: LOG_RESOURCES.AUDIT, resourceId: String(auditId), details: `Sent ${items.length} audit request email(s)` });
  };

  const handleSendSelected = () => {
    const items = selected.size ? requests.filter((r) => selected.has(r.id)) : requests;
    if (!items.length) return;

    // Check if all selected share one recipient → single email via preview
    const emails = [...new Set(items.map((r) => r.recipientEmail).filter(Boolean))];
    if (emails.length <= 1) {
      const email = emails[0] || '';
      const name  = items[0]?.recipientName || '';
      setPreviewData({ email, name, items, onEmailChange: (v) => setPreviewData((p) => ({ ...p, email: v })) });
    } else {
      // Multiple recipients → send grouped directly
      sendEmails(items);
    }
  };

  const exportCSV = () => {
    const headers = ['Control Area', 'Document Requested', 'Recipient Name', 'Recipient Email', 'Due Date', 'Status'];
    const rows = requests.map((r) => [r.controlArea, r.document, r.recipientName, r.recipientEmail, r.dueDate, r.status]
      .map((v) => `"${(v || '').replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `pbc-list-${auditId}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const summary = {
    total: requests.length,
    requested: requests.filter((r) => r.status === 'Requested').length,
    received:  requests.filter((r) => r.status === 'Received').length,
    pending:   requests.filter((r) => r.status === 'Not Requested').length,
  };

  const activeItems = selected.size ? requests.filter((r) => selected.has(r.id)) : requests;

  if (!requests.length && JSON.parse(localStorage.getItem(RCM_KEY(auditId)) || '[]').length === 0) {
    return <Alert severity="info">No control areas yet. Go to <strong>Phase 1 › Risk &amp; Controls Matrix</strong> first.</Alert>;
  }

  return (
    <Box>
      {/* Summary */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap" alignItems="center">
        {[
          { label: 'Total',     value: summary.total,     color: 'text.primary'  },
          { label: 'Pending',   value: summary.pending,   color: 'error.main'    },
          { label: 'Requested', value: summary.requested, color: 'warning.main'  },
          { label: 'Received',  value: summary.received,  color: 'success.main'  },
        ].map(({ label, value, color }) => (
          <Paper key={label} variant="outlined" sx={{ px: 2, py: 0.75 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="h6" fontWeight={700} color={color}>{value}</Typography>
          </Paper>
        ))}
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button size="small" variant="outlined" startIcon={<Add />} onClick={addRow}>Add Row</Button>
          <Button size="small" variant="outlined" onClick={() => setShowBulk((v) => !v)}>
            Bulk Edit {selected.size ? `(${selected.size})` : ''}
          </Button>
          <Button size="small" variant="outlined" startIcon={<FileDownload />} onClick={exportCSV}>CSV</Button>
          <Button
            size="small" variant="contained" startIcon={<Email />}
            onClick={handleSendSelected}
            disabled={!requests.length}
          >
            {selected.size ? `Send Selected (${selected.size})` : 'Send All'}
          </Button>
        </Box>
      </Stack>

      {/* Bulk edit bar */}
      <Collapse in={showBulk}>
        <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#f9f9f9' }}>
          <Typography variant="caption" fontWeight={700} display="block" sx={{ mb: 1 }}>
            Apply to {selected.size ? `${selected.size} selected` : 'all'} rows:
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap">
            <TextField size="small" label="Recipient Name" value={bulkName} onChange={(e) => setBulkName(e.target.value)} sx={{ minWidth: 160 }} />
            <TextField size="small" label="Recipient Email" value={bulkEmail} onChange={(e) => setBulkEmail(e.target.value)} sx={{ minWidth: 200 }} />
            <TextField size="small" label="Due Date" type="date" value={bulkDue} onChange={(e) => setBulkDue(e.target.value)} InputLabelProps={{ shrink: true }} />
            <Button variant="contained" size="small" onClick={applyBulk}>Apply</Button>
            <Button size="small" onClick={() => setShowBulk(false)}>Cancel</Button>
          </Stack>
        </Paper>
      </Collapse>

      {/* Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell padding="checkbox">
                <Checkbox
                  size="small"
                  indeterminate={selected.size > 0 && selected.size < requests.length}
                  checked={selected.size === requests.length && requests.length > 0}
                  onChange={toggleAll}
                  icon={<CheckBoxOutlineBlank fontSize="small" />}
                  checkedIcon={<CheckBox fontSize="small" />}
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>Control Area</TableCell>
              <TableCell sx={{ fontWeight: 700, minWidth: 200 }}>Document / Information Requested</TableCell>
              <TableCell sx={{ fontWeight: 700, minWidth: 130 }}>Recipient Name</TableCell>
              <TableCell sx={{ fontWeight: 700, minWidth: 170 }}>Recipient Email</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Due Date</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 80 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map((req) => (
              <TableRow
                key={req.id}
                hover
                selected={selected.has(req.id)}
                sx={{ '&.Mui-selected': { bgcolor: '#e3f2fd' } }}
              >
                <TableCell padding="checkbox">
                  <Checkbox size="small" checked={selected.has(req.id)} onChange={() => toggleSelect(req.id)}
                    icon={<CheckBoxOutlineBlank fontSize="small" />} checkedIcon={<CheckBox fontSize="small" />} />
                </TableCell>
                <TableCell>
                  <Typography variant="caption" fontWeight={600} display="block">{req.controlArea}</Typography>
                  {req.riskRating && <Chip label={req.riskRating} size="small" color={STATUS_COLORS[req.riskRating] || 'default'} sx={{ height: 16, fontSize: '0.6rem', mt: 0.25 }} />}
                </TableCell>
                <TableCell>
                  <EditCell value={req.document} onChange={(v) => updateField(req.id, 'document', v)} placeholder="Document or data required…" width={200} />
                </TableCell>
                <TableCell>
                  <EditCell value={req.recipientName} onChange={(v) => updateField(req.id, 'recipientName', v)} placeholder="Contact name" width={130} />
                </TableCell>
                <TableCell>
                  <EditCell value={req.recipientEmail} onChange={(v) => updateField(req.id, 'recipientEmail', v)} type="email" placeholder="email@mkopa.com" width={170} />
                </TableCell>
                <TableCell>
                  <EditCell value={req.dueDate} onChange={(v) => updateField(req.id, 'dueDate', v)} type="date" width={130} />
                </TableCell>
                <TableCell>
                  <EditCell value={req.status} onChange={(v) => updateField(req.id, 'status', v)} options={PBC_STATUSES} width={130} />
                </TableCell>
                <TableCell>
                  <Tooltip title="Send email for this item">
                    <IconButton size="small" color="primary"
                      onClick={() => setPreviewData({
                        email: req.recipientEmail, name: req.recipientName,
                        items: [req],
                        onEmailChange: (v) => updateField(req.id, 'recipientEmail', v),
                      })}>
                      <Email fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete row">
                    <IconButton size="small" color="error" onClick={() => deleteRow(req.id)}>
                      <DeleteOutline fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}

            {requests.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No requests yet. Click <strong>Add Row</strong> or generate an Audit Program in Step 1.3.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Email preview dialog */}
      {previewData && (
        <EmailPreviewDialog
          open
          onClose={() => setPreviewData(null)}
          onSend={(email, name, due) => sendEmails(previewData.items, name, email, due)}
          recipient={{ email: previewData.email, name: previewData.name, onEmailChange: previewData.onEmailChange }}
          items={previewData.items}
          auditName={auditName}
        />
      )}
    </Box>
  );
};

export default AuditRequestsPanel;
