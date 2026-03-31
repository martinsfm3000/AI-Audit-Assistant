/**
 * Risk & Controls Matrix (RCM) Panel
 * Aligned with IIA Standards, COSO Internal Control Framework, and COBIT.
 */
import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Chip, Divider, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Grid, Stack, IconButton, Table,
  TableHead, TableBody, TableRow, TableCell, TableContainer,
  Collapse, Alert,
} from '@mui/material';
import {
  Add, EditOutlined, DeleteOutline, ExpandMore, ExpandLess,
  FileDownload, ContentCopy,
} from '@mui/icons-material';
import { log, LOG_ACTIONS, LOG_RESOURCES } from '../services/auditLogger';

// ── IIA-aligned lookup data ──────────────────────────────────────────────────
export const RISK_CATEGORIES = [
  'Strategic', 'Operational', 'Financial Reporting', 'Compliance / Regulatory',
  'Technology / IT', 'Fraud', 'Legal', 'Reputational', 'Environmental & Social',
];

export const CONTROL_TYPES = [
  { value: 'Preventive',  desc: 'Designed to stop an error or irregularity from occurring' },
  { value: 'Detective',   desc: 'Designed to discover errors or irregularities after they occur' },
  { value: 'Corrective',  desc: 'Designed to correct errors or irregularities once detected' },
  { value: 'Directive',   desc: 'Designed to encourage desirable events (policies, training)' },
];

export const CONTROL_FREQUENCIES = [
  'Continuous', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'Ad-hoc',
];

export const RISK_RATINGS = ['Critical', 'High', 'Medium', 'Low'];

export const TESTING_APPROACHES = [
  'Walkthrough', 'Inspection of Documents', 'Observation', 'Re-performance',
  'Computer-Assisted Audit Technique (CAAT)', 'Inquiry', 'Analytical Review',
];

export const CONTROL_NATURE = ['Manual', 'Automated', 'Semi-Automated (IT-Dependent Manual)'];

export const COSO_COMPONENTS = [
  'Control Environment', 'Risk Assessment', 'Control Activities',
  'Information & Communication', 'Monitoring Activities',
];

// ── IIA standard control area templates ─────────────────────────────────────
const IIA_TEMPLATES = [
  {
    controlArea: 'Entity-Level Controls (ELC)',
    riskCategory: 'Operational',
    cosoComponent: 'Control Environment',
    controlObjective: 'Ensure an appropriate tone at the top, ethical culture, and governance framework that supports effective internal controls across the organisation.',
    riskDescription: 'Absence of a strong control environment may undermine all process-level controls.',
    controlDescription: 'Board oversight, code of conduct, competency frameworks, segregation of duties policy, and periodic management certification of controls.',
    controlType: 'Preventive', controlNature: 'Manual', controlFrequency: 'Annual',
    riskRating: 'High', testingApproach: 'Inquiry',
    controlOwner: '', controlOperator: '', regulatoryReference: 'IIA Standard 2120; COSO Principle 1–5',
  },
  {
    controlArea: 'IT General Controls – Access Management',
    riskCategory: 'Technology / IT',
    cosoComponent: 'Control Activities',
    controlObjective: 'Ensure only authorised users have access to systems and data in line with least-privilege principles.',
    riskDescription: 'Unauthorised access may lead to data breaches, fraud, or manipulation of financial records.',
    controlDescription: 'User access provisioning/de-provisioning process, periodic user access reviews (UAR), privileged access management (PAM), and MFA enforcement.',
    controlType: 'Preventive', controlNature: 'Automated', controlFrequency: 'Quarterly',
    riskRating: 'Critical', testingApproach: 'Inspection of Documents',
    controlOwner: '', controlOperator: '', regulatoryReference: 'IIA GTAG 9; COBIT DSS05.04; SOX ITGC',
  },
  {
    controlArea: 'IT General Controls – Change Management',
    riskCategory: 'Technology / IT',
    cosoComponent: 'Control Activities',
    controlObjective: 'Ensure all system changes are authorised, tested, and approved before migration to production.',
    riskDescription: 'Unauthorised or untested changes can introduce errors or vulnerabilities into financial systems.',
    controlDescription: 'Formal change request and approval workflow, separation of development/production environments, post-implementation review.',
    controlType: 'Preventive', controlNature: 'Semi-Automated (IT-Dependent Manual)', controlFrequency: 'Ad-hoc',
    riskRating: 'High', testingApproach: 'Inspection of Documents',
    controlOwner: '', controlOperator: '', regulatoryReference: 'IIA GTAG 2; COBIT BAI06; SOX ITGC',
  },
  {
    controlArea: 'Financial Reporting – Revenue Recognition',
    riskCategory: 'Financial Reporting',
    cosoComponent: 'Control Activities',
    controlObjective: 'Ensure revenue is recognised in accordance with applicable accounting standards (IFRS 15 / ASC 606).',
    riskDescription: 'Premature or incorrect revenue recognition may result in material misstatement of financial statements.',
    controlDescription: 'Revenue recognition policy, contract review checklist, management review of monthly revenue schedules, system-enforced recognition rules.',
    controlType: 'Detective', controlNature: 'Semi-Automated (IT-Dependent Manual)', controlFrequency: 'Monthly',
    riskRating: 'High', testingApproach: 'Re-performance',
    controlOwner: '', controlOperator: '', regulatoryReference: 'IFRS 15; IIA Standard 2130',
  },
  {
    controlArea: 'Financial Reporting – Accounts Payable',
    riskCategory: 'Financial Reporting',
    cosoComponent: 'Control Activities',
    controlObjective: 'Ensure all payables are valid, accurately recorded, and approved before payment.',
    riskDescription: 'Duplicate, fictitious, or unauthorised payments may result in financial loss.',
    controlDescription: '3-way matching (PO, GRN, invoice), payment approval thresholds, vendor master file change controls, and AP ageing review.',
    controlType: 'Preventive', controlNature: 'Semi-Automated (IT-Dependent Manual)', controlFrequency: 'Monthly',
    riskRating: 'High', testingApproach: 'Re-performance',
    controlOwner: '', controlOperator: '', regulatoryReference: 'IIA Standard 2120; COSO Principle 10',
  },
  {
    controlArea: 'Financial Reporting – Payroll',
    riskCategory: 'Financial Reporting',
    cosoComponent: 'Control Activities',
    controlObjective: 'Ensure payroll is processed accurately, timely, and only for valid employees.',
    riskDescription: 'Ghost employees, incorrect pay rates, or unauthorised changes may cause financial loss or regulatory penalties.',
    controlDescription: 'HR-to-payroll change reconciliation, payroll variance analysis, dual authorisation for payroll runs, leavers\' final pay review.',
    controlType: 'Detective', controlNature: 'Manual', controlFrequency: 'Monthly',
    riskRating: 'High', testingApproach: 'Re-performance',
    controlOwner: '', controlOperator: '', regulatoryReference: 'IIA Standard 2120',
  },
  {
    controlArea: 'Operations – Procurement & Purchasing',
    riskCategory: 'Operational',
    cosoComponent: 'Control Activities',
    controlObjective: 'Ensure procurement activities are conducted competitively, transparently, and within approved budgets.',
    riskDescription: 'Lack of competitive tendering may lead to inflated costs, conflicts of interest, or fraud.',
    controlDescription: 'Procurement policy (tender thresholds), vendor pre-qualification, conflict of interest declarations, contract review and approval.',
    controlType: 'Preventive', controlNature: 'Manual', controlFrequency: 'Ad-hoc',
    riskRating: 'Medium', testingApproach: 'Inspection of Documents',
    controlOwner: '', controlOperator: '', regulatoryReference: 'IIA Standard 2120; COSO Principle 10',
  },
  {
    controlArea: 'Compliance – Regulatory Reporting',
    riskCategory: 'Compliance / Regulatory',
    cosoComponent: 'Monitoring Activities',
    controlObjective: 'Ensure all regulatory returns and filings are accurate, complete, and submitted on time.',
    riskDescription: 'Inaccurate or late regulatory submissions may result in fines, sanctions, or reputational damage.',
    controlDescription: 'Regulatory reporting calendar, management review and sign-off of submissions, tracking of regulatory changes.',
    controlType: 'Detective', controlNature: 'Manual', controlFrequency: 'Monthly',
    riskRating: 'High', testingApproach: 'Inspection of Documents',
    controlOwner: '', controlOperator: '', regulatoryReference: 'IIA Standard 2130',
  },
  {
    controlArea: 'Fraud Risk – Anti-Fraud Controls',
    riskCategory: 'Fraud',
    cosoComponent: 'Risk Assessment',
    controlObjective: 'Deter, prevent, and detect fraudulent activities across the organisation.',
    riskDescription: 'Inadequate anti-fraud controls increase the risk of asset misappropriation, financial statement fraud, or corruption.',
    controlDescription: 'Fraud risk assessment, anonymous whistleblower hotline, data analytics for anomaly detection, segregation of duties matrix.',
    controlType: 'Detective', controlNature: 'Semi-Automated (IT-Dependent Manual)', controlFrequency: 'Annual',
    riskRating: 'Critical', testingApproach: 'Computer-Assisted Audit Technique (CAAT)',
    controlOwner: '', controlOperator: '', regulatoryReference: 'IIA Standard 1210.A2; ACFE Fraud Framework',
  },
  {
    controlArea: 'Monitoring – Management Review Controls',
    riskCategory: 'Operational',
    cosoComponent: 'Monitoring Activities',
    controlObjective: 'Ensure senior management regularly reviews key financial and operational reports to identify and investigate anomalies.',
    riskDescription: 'Without management review, errors or irregularities may remain undetected.',
    controlDescription: 'Monthly management accounts review, KPI dashboard review, variance analysis with documented sign-off.',
    controlType: 'Detective', controlNature: 'Manual', controlFrequency: 'Monthly',
    riskRating: 'Medium', testingApproach: 'Inquiry',
    controlOwner: '', controlOperator: '', regulatoryReference: 'COSO Principle 16; IIA Standard 2120',
  },
];

const RATING_COLORS = { Critical: 'error', High: 'warning', Medium: 'info', Low: 'success' };


// All fields that must be filled for a control area to be "Completed"
const REQUIRED_FIELDS = [
  'controlArea', 'riskCategory', 'cosoComponent', 'controlObjective',
  'riskDescription', 'controlType', 'controlNature',
  'controlOwner', 'controlOperator', 'riskRating',
];

/**
 * Derives the control status from the completeness of the control's own fields.
 * - Not Started : control has no data (shouldn't normally happen)
 * - In Progress : at least required fields filled but some optional fields missing
 * - Completed   : all fields are filled
 */
const deriveControlStatus = (control) => {
  const filled = REQUIRED_FIELDS.filter((f) => control[f] && String(control[f]).trim() !== '');
  if (filled.length === 0) return 'not_started';
  if (filled.length === REQUIRED_FIELDS.length) return 'completed';
  return 'in_progress';
};

const STATUS_CHIP = {
  not_started: { label: 'Not Started', color: 'default',  variant: 'outlined' },
  in_progress:  { label: 'In Progress', color: 'warning',  variant: 'filled'   },
  completed:    { label: 'Completed',   color: 'success',  variant: 'filled'   },
};

const storageKey = (auditId) => `mkopa_rcm_${auditId}`;

const emptyControl = {
  controlArea: '', riskCategory: '', cosoComponent: '', controlObjective: '',
  riskDescription: '', controlType: '', controlNature: '',
  controlOwner: '', controlOperator: '', riskRating: '',
};

// ── Expandable row detail ────────────────────────────────────────────────────
const ControlDetail = ({ control }) => (
  <Box sx={{ px: 2, py: 1.5, bgcolor: '#f9fbe7', borderTop: '1px solid #e0e0e0' }}>
    <Grid container spacing={2}>
      {[
        ['Risk Description', control.riskDescription],
        ['Control Objective', control.controlObjective],
        ['COSO Component', control.cosoComponent],
        ['Control Owner', control.controlOwner],
        ['Control Operator', control.controlOperator],
      ].map(([label, value]) => value ? (
        <Grid item xs={12} sm={6} key={label}>
          <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
          <Typography variant="body2">{value}</Typography>
        </Grid>
      ) : null)}
    </Grid>
  </Box>
);

// ── Create / Edit dialog ─────────────────────────────────────────────────────
const ControlDialog = ({ open, initial, onSave, onClose }) => {
  const [form, setForm] = useState(initial || emptyControl);
  const [templateOpen, setTemplateOpen] = useState(false);

  useEffect(() => { setForm(initial || emptyControl); }, [initial, open]);

  const field = (key) => ({
    value: form[key] || '',
    onChange: (e) => setForm((p) => ({ ...p, [key]: e.target.value })),
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {initial?.id ? 'Edit Control Area' : 'Add Control Area'}
        {!initial?.id && (
          <Button size="small" startIcon={<ContentCopy />} onClick={() => setTemplateOpen(true)}>
            Load IIA Template
          </Button>
        )}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField label="Control Area Name *" fullWidth {...field('controlArea')}
              placeholder="e.g. Accounts Payable, IT Access Management" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select label="Risk Category *" fullWidth {...field('riskCategory')}>
              {RISK_CATEGORIES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select label="COSO Component" fullWidth {...field('cosoComponent')}>
              {COSO_COMPONENTS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField label="Risk Description *" fullWidth multiline rows={2} {...field('riskDescription')}
              placeholder="Describe the risk this control area addresses..." />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Control Objective *" fullWidth multiline rows={2} {...field('controlObjective')}
              placeholder="State what the control is designed to achieve..." />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField select label="Control Type *" fullWidth {...field('controlType')}>
              {CONTROL_TYPES.map((t) => (
                <MenuItem key={t.value} value={t.value}>
                  <Box><Typography variant="body2">{t.value}</Typography><Typography variant="caption" color="text.secondary">{t.desc}</Typography></Box>
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField select label="Control Nature" fullWidth {...field('controlNature')}>
              {CONTROL_NATURE.map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Control Owner" fullWidth {...field('controlOwner')}
              placeholder="Role or name responsible for the control" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Control Operator" fullWidth {...field('controlOperator')}
              placeholder="Who performs the control day-to-day" />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField select label="Inherent Risk Rating *" fullWidth {...field('riskRating')}>
              {RISK_RATINGS.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained"
          disabled={!form.controlArea?.trim() || !form.riskCategory || !form.controlObjective?.trim()}
          onClick={() => onSave(form)}>
          {initial?.id ? 'Save Changes' : 'Add Control Area'}
        </Button>
      </DialogActions>

      {/* Template picker */}
      <Dialog open={templateOpen} onClose={() => setTemplateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>IIA Control Area Templates</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select a template to pre-populate the form. You can edit all fields after loading.
          </Typography>
          <Stack spacing={1}>
            {IIA_TEMPLATES.map((t) => (
              <Paper key={t.controlArea} variant="outlined" sx={{ p: 1.5, cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }}
                onClick={() => { setForm({ ...emptyControl, ...t }); setTemplateOpen(false); }}>
                <Typography variant="body2" fontWeight={600}>{t.controlArea}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {t.riskCategory} · {t.controlType} · Risk: {t.riskRating}
                </Typography>
              </Paper>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

// ── Main RCM Panel ───────────────────────────────────────────────────────────
const RCMPanel = ({ auditId }) => {
  const [controls, setControls] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem(storageKey(auditId)) || '[]');
    setControls(stored);
    log({ action: LOG_ACTIONS.READ, resource: LOG_RESOURCES.AUDIT, resourceId: String(auditId), details: 'Viewed Risk & Controls Matrix' });
  }, [auditId]);

  const persist = (updated) => {
    localStorage.setItem(storageKey(auditId), JSON.stringify(updated));
    setControls(updated);
  };

  const handleAdd = (form) => {
    const record = { ...form, id: Date.now(), createdAt: new Date().toISOString() };
    const updated = [...controls, record];
    persist(updated);
    log({ action: LOG_ACTIONS.CREATE, resource: LOG_RESOURCES.AUDIT, resourceId: String(auditId), details: `Added control area: "${record.controlArea}" (${record.riskCategory})` });
    setDialogOpen(false);
  };

  const handleEdit = (form) => {
    const updated = controls.map((c) => c.id === editTarget.id ? { ...form, id: c.id, createdAt: c.createdAt, updatedAt: new Date().toISOString() } : c);
    persist(updated);
    log({ action: LOG_ACTIONS.UPDATE, resource: LOG_RESOURCES.AUDIT, resourceId: String(auditId), details: `Updated control area: "${form.controlArea}"` });
    setEditTarget(null);
  };

  const handleDelete = () => {
    const updated = controls.filter((c) => c.id !== deleteTarget.id);
    persist(updated);
    log({ action: LOG_ACTIONS.DELETE, resource: LOG_RESOURCES.AUDIT, resourceId: String(auditId), details: `Deleted control area: "${deleteTarget.controlArea}"` });
    setDeleteTarget(null);
  };

  const exportCSV = () => {
    const headers = ['Control Area', 'Risk Category', 'COSO Component', 'Control Type', 'Control Nature', 'Risk Rating', 'Control Owner', 'Control Operator'];
    const rows = controls.map((c) => [
      c.controlArea, c.riskCategory, c.cosoComponent, c.controlType, c.controlNature,
      c.riskRating, c.controlOwner, c.controlOperator,
    ].map((v) => `"${(v || '').replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rcm-audit-${auditId}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    log({ action: LOG_ACTIONS.EXPORT, resource: LOG_RESOURCES.AUDIT, resourceId: String(auditId), details: 'Exported RCM as CSV' });
  };

  const summary = {
    total: controls.length,
    critical: controls.filter((c) => c.riskRating === 'Critical').length,
    high: controls.filter((c) => c.riskRating === 'High').length,
  };

  return (
    <Box>
      {/* Summary bar */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
        <Paper variant="outlined" sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="text.secondary">Total Controls</Typography>
          <Typography variant="h6" fontWeight={700}>{summary.total}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="text.secondary">Critical Risk</Typography>
          <Typography variant="h6" fontWeight={700} color="error.main">{summary.critical}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="text.secondary">High Risk</Typography>
          <Typography variant="h6" fontWeight={700} color="warning.main">{summary.high}</Typography>
        </Paper>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button size="small" startIcon={<FileDownload />} variant="outlined" onClick={exportCSV} disabled={!controls.length}>
            Export CSV
          </Button>
          <Button size="small" startIcon={<Add />} variant="contained" onClick={() => { setEditTarget(null); setDialogOpen(true); }}>
            Add Control Area
          </Button>
        </Box>
      </Stack>

      {controls.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          No control areas yet. Click <strong>Add Control Area</strong> to build your RCM, or use the <strong>Load IIA Template</strong> option to start from an IIA-standard control area.
        </Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell sx={{ width: 32 }} />
                <TableCell sx={{ fontWeight: 700 }}>Control Area</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Risk Category</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Risk Rating</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 90 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {controls.map((control) => (
                <>
                  <TableRow
                    key={control.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => setExpandedId(expandedId === control.id ? null : control.id)}
                  >
                    <TableCell>
                      <IconButton size="small">
                        {expandedId === control.id ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{control.controlArea}</Typography>
                      {control.cosoComponent && (
                        <Typography variant="caption" color="text.secondary">{control.cosoComponent}</Typography>
                      )}
                    </TableCell>
                    <TableCell><Typography variant="body2">{control.riskCategory}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{control.controlType}</Typography></TableCell>
                    <TableCell>
                      <Chip label={control.riskRating || '—'} size="small"
                        color={RATING_COLORS[control.riskRating] || 'default'} />
                    </TableCell>
                    <TableCell>
                      {(() => { const s = deriveControlStatus(control); const cfg = STATUS_CHIP[s]; return <Chip label={cfg.label} size="small" color={cfg.color} variant={cfg.variant} />; })()}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => { setEditTarget(control); setDialogOpen(true); }}>
                          <EditOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => setDeleteTarget(control)}>
                          <DeleteOutline fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                  <TableRow key={`detail-${control.id}`}>
                    <TableCell colSpan={9} sx={{ p: 0, border: 0 }}>
                      <Collapse in={expandedId === control.id} unmountOnExit>
                        <ControlDetail control={control} />
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create / Edit dialog */}
      <ControlDialog
        open={dialogOpen}
        initial={editTarget}
        onSave={editTarget ? handleEdit : handleAdd}
        onClose={() => { setDialogOpen(false); setEditTarget(null); }}
      />

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Control Area</DialogTitle>
        <DialogContent>
          <Typography>
            Permanently delete <strong>{deleteTarget?.controlArea}</strong>? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RCMPanel;
