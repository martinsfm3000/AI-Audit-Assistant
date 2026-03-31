import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { log, LOG_ACTIONS, LOG_RESOURCES } from '../services/auditLogger';
import RCMPanel from './RCMPanel';
import AuditProgramPanel from './AuditProgramPanel';
import AuditRequestsPanel from './AuditRequestsPanel';
import ControlFlowPanel from './ControlFlowPanel';
import {
  Box, Typography, Paper, Grid, TextField, MenuItem,
  Button, Divider, Chip, Collapse, IconButton, Tooltip,
} from '@mui/material';
import {
  Add, CheckCircle, RadioButtonUnchecked, ArrowForward,
  ExpandMore, ExpandLess, PlayArrow, FiberManualRecord,
} from '@mui/icons-material';

// ── Audit phases & steps definition ─────────────────────────────────────────
const PHASES = [
  {
    id: 1, label: 'Audit Planning', color: '#1565c0', lightColor: '#e3f2fd',
    steps: [
      { id: '1.1', label: 'Risk & Controls Matrix', description: 'Identify relevant risks and map them to controls. Build the RCM that will guide all subsequent testing.' },
      { id: '1.2', label: 'Process Walkthroughs', description: 'Document and walkthrough key business processes with the auditee to understand the control environment.' },
      { id: '1.3', label: 'Audit Program Generator', description: 'Generate a tailored audit program based on identified risks and applicable standards.' },
    ],
  },
  {
    id: 2, label: 'Evidence Collection', color: '#6a1b9a', lightColor: '#f3e5f5',
    steps: [
      { id: '2.1', label: 'Audit Requests (PBC List)', description: 'Issue and track Provided-By-Client document requests to the auditee.' },
      { id: '2.2', label: 'Auto Follow-ups', description: 'Monitor outstanding requests and send automated follow-up reminders.' },
      { id: '2.3', label: 'Evidence Management', description: 'Organise, label, and store all collected evidence files.' },
    ],
  },
  {
    id: 3, label: 'Testing', color: '#e65100', lightColor: '#fff3e0',
    steps: [
      { id: '3.1', label: 'Sample Selection', description: 'Use statistical or judgmental sampling to select items for testing.' },
      { id: '3.2', label: 'OET Workpaper', description: 'Complete the Operating Effectiveness Testing workpaper for each control.' },
      { id: '3.3', label: 'Exception Tracker', description: 'Log and classify any exceptions or deviations found during testing.' },
    ],
  },
  {
    id: 4, label: 'Data Analysis', color: '#2e7d32', lightColor: '#e8f5e9',
    steps: [
      { id: '4.1', label: 'Statistical Analysis', description: 'Run data analytics to identify anomalies, trends, and outliers in the population.' },
      { id: '4.2', label: 'Issue Closure Validation', description: 'Verify that prior audit issues have been adequately remediated.' },
    ],
  },
  {
    id: 5, label: 'Reporting', color: '#c62828', lightColor: '#ffebee',
    steps: [
      { id: '5.1', label: 'Report Drafting', description: 'Draft audit findings, recommendations, and management responses.' },
      { id: '5.2', label: 'Export Options', description: 'Export the final audit report in PDF, Word, or CSV format.' },
    ],
  },
];

const AUDIT_TYPES = ['Financial', 'Operational', 'Compliance', 'IT/Systems', 'Fraud Investigation', 'Special Purpose'];
const DEPARTMENTS = ['Finance', 'IT', 'Treasury', 'Operations', 'HR', 'Sales', 'Risk & Compliance', 'Supply Chain'];
const emptyForm = { auditName: '', auditType: '', department: '', startDate: '', endDate: '', leadAuditor: '', objective: '' };

// ── Step status helpers ──────────────────────────────────────────────────────
const getStepKey = (auditId, stepId) => `mkopa_step_${auditId}_${stepId}`;

const getStepStatus = (auditId, stepId) => {
  return localStorage.getItem(getStepKey(auditId, stepId)) || 'not_started';
};

const setStepStatus = (auditId, stepId, status) => {
  localStorage.setItem(getStepKey(auditId, stepId), status);
};

const STEP_STATUS_CONFIG = {
  not_started: { label: 'Not Started', color: 'default', icon: <RadioButtonUnchecked sx={{ fontSize: 14 }} /> },
  in_progress: { label: 'In Progress', color: 'warning', icon: <PlayArrow sx={{ fontSize: 14 }} /> },
  completed:   { label: 'Completed',   color: 'success', icon: <CheckCircle sx={{ fontSize: 14 }} /> },
};

// ── Phase node in flowchart ──────────────────────────────────────────────────
const PhaseNode = ({ phase, isActive, onClick, auditId }) => {
  const completedSteps = phase.steps.filter(
    (s) => getStepStatus(auditId, s.id) === 'completed'
  ).length;
  const allDone = completedSteps === phase.steps.length;
  const anyStarted = phase.steps.some((s) => getStepStatus(auditId, s.id) !== 'not_started');

  return (
    <Paper
      elevation={isActive ? 6 : 2}
      onClick={onClick}
      sx={{
        p: 2, cursor: 'pointer', minWidth: 150, flex: 1,
        border: `2px solid ${isActive ? phase.color : 'transparent'}`,
        bgcolor: isActive ? phase.lightColor : '#fff',
        transition: 'all 0.2s',
        '&:hover': { boxShadow: 6, borderColor: phase.color },
        textAlign: 'center',
        position: 'relative',
      }}
    >
      {/* Status dot */}
      <FiberManualRecord
        sx={{
          position: 'absolute', top: 8, right: 8, fontSize: 12,
          color: allDone ? '#2e7d32' : anyStarted ? '#e65100' : '#bdbdbd',
        }}
      />
      {/* Phase number badge */}
      <Box
        sx={{
          width: 36, height: 36, borderRadius: '50%', display: 'flex',
          alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1,
          bgcolor: isActive ? phase.color : '#eeeeee',
          color: isActive ? '#fff' : '#666',
          fontWeight: 'bold', fontSize: 16,
        }}
      >
        {phase.id}
      </Box>
      <Typography variant="body2" fontWeight={isActive ? 700 : 500} color={isActive ? phase.color : 'text.primary'}>
        {phase.label}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {completedSteps}/{phase.steps.length} done
      </Typography>
    </Paper>
  );
};

// ── Sub-step node ─────────────────────────────────────────────────────────────
const StepNode = ({ step, phaseColor, phaseLightColor, isActive, auditId, onClick }) => {
  const status = getStepStatus(auditId, step.id);
  const cfg = STEP_STATUS_CONFIG[status];

  return (
    <Paper
      elevation={isActive ? 4 : 1}
      onClick={onClick}
      sx={{
        p: 1.5, cursor: 'pointer', minWidth: 130, flex: 1,
        border: `2px solid ${isActive ? phaseColor : status === 'completed' ? '#2e7d32' : '#e0e0e0'}`,
        bgcolor: isActive ? phaseLightColor : status === 'completed' ? '#f1f8e9' : '#fafafa',
        transition: 'all 0.2s',
        '&:hover': { boxShadow: 4, borderColor: phaseColor },
        textAlign: 'center',
      }}
    >
      <Typography variant="caption" fontWeight={700} color={isActive ? phaseColor : 'text.secondary'} display="block">
        {step.id}
      </Typography>
      <Typography variant="body2" fontWeight={isActive ? 700 : 400} sx={{ my: 0.5 }}>
        {step.label}
      </Typography>
      <Chip
        icon={cfg.icon}
        label={cfg.label}
        size="small"
        color={cfg.color}
        variant={status === 'not_started' ? 'outlined' : 'filled'}
        sx={{ fontSize: '0.65rem', height: 20 }}
      />
    </Paper>
  );
};

// ── Arrow connector ───────────────────────────────────────────────────────────
const Arrow = ({ color = '#9e9e9e' }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, px: 0.5 }}>
    <ArrowForward sx={{ color, fontSize: 20 }} />
  </Box>
);

// ── Save state indicator ──────────────────────────────────────────────────────
const SaveIndicator = ({ state }) => {
  if (state === 'idle') return null;
  const map = {
    pending: { icon: <Sync sx={{ fontSize: 14 }} />, label: 'Unsaved…', color: 'text.disabled' },
    saving:  { icon: <Sync sx={{ fontSize: 14, animation: 'spin 1s linear infinite' }} />, label: 'Saving…', color: 'text.secondary' },
    saved:   { icon: <CloudDone sx={{ fontSize: 14 }} />, label: 'Saved', color: 'success.main' },
    error:   { icon: <ErrorOutline sx={{ fontSize: 14 }} />, label: 'Save failed', color: 'error.main' },
  };
  const { icon, label, color } = map[state] || map.saved;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color }}>
      {icon}
      <Typography variant="caption" color="inherit">{label}</Typography>
    </Box>
  );
};

// ── Work panel for a selected step ───────────────────────────────────────────
const WorkPanel = ({ step, phase, auditId, auditName, onStatusChange }) => {
  const [status, setStatus] = useState(getStepStatus(auditId, step.id));

  const changeStatus = (newStatus) => {
    setStepStatus(auditId, step.id, newStatus);
    setStatus(newStatus);
    log({ action: LOG_ACTIONS.UPDATE, resource: LOG_RESOURCES.AUDIT, resourceId: String(auditId), details: `Step ${step.id} "${step.label}" marked as ${newStatus}` });
    onStatusChange();
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mt: 2, borderLeft: `4px solid ${phase.color}` }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Box>
          <Typography variant="overline" color="text.secondary">{phase.label} › Step {step.id}</Typography>
          <Typography variant="h6" fontWeight={700}>{step.label}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{step.description}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {Object.entries(STEP_STATUS_CONFIG).map(([key, cfg]) => (
            <Button
              key={key}
              size="small"
              variant={status === key ? 'contained' : 'outlined'}
              color={cfg.color === 'default' ? 'inherit' : cfg.color}
              startIcon={cfg.icon}
              onClick={() => changeStatus(key)}
            >
              {cfg.label}
            </Button>
          ))}
        </Box>
      </Box>
      <Divider sx={{ mb: 2 }} />

      {step.id === '1.1' ? (
        <RCMPanel auditId={auditId} />
      ) : step.id === '1.3' ? (
        <AuditProgramPanel auditId={auditId} />
      ) : step.id === '2.1' ? (
        <AuditRequestsPanel auditId={auditId} auditName={auditName} />
      ) : (
        <ControlFlowPanel auditId={auditId} stepId={step.id} />
      )}
    </Paper>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const StartNewAudit = () => {
  const location = useLocation();
  const [form, setForm] = useState(emptyForm);
  const [audit, setAudit] = useState(location.state?.audit || null);
  const [errors, setErrors] = useState({});

  // Flowchart state
  const [activePhaseId, setActivePhaseId] = useState(null);
  const [activeStepId, setActiveStepId] = useState(null);
  const [, forceUpdate] = useState(0); // trigger re-render on status change

  const validate = () => {
    const e = {};
    if (!form.auditName.trim()) e.auditName = 'Audit name is required';
    if (!form.auditType) e.auditType = 'Audit type is required';
    if (!form.department) e.department = 'Department is required';
    if (!form.startDate) e.startDate = 'Start date is required';
    if (!form.leadAuditor.trim()) e.leadAuditor = 'Lead auditor is required';
    return e;
  };

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleStart = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const newAudit = { ...form, id: Date.now(), status: 'In Progress', createdAt: new Date().toISOString() };
    const existing = JSON.parse(localStorage.getItem('mkopa_audits') || '[]');
    localStorage.setItem('mkopa_audits', JSON.stringify([...existing, newAudit]));
    log({ action: LOG_ACTIONS.CREATE, resource: LOG_RESOURCES.AUDIT, resourceId: String(newAudit.id), details: `Created audit: "${newAudit.auditName}" (${newAudit.auditType} – ${newAudit.department})` });
    setAudit(newAudit);
    setForm(emptyForm);
    setErrors({});
  };

  const handlePhaseClick = (phase) => {
    if (activePhaseId === phase.id) {
      setActivePhaseId(null);
      setActiveStepId(null);
    } else {
      setActivePhaseId(phase.id);
      setActiveStepId(null);
      log({ action: LOG_ACTIONS.READ, resource: LOG_RESOURCES.AUDIT, resourceId: String(audit.id), details: `Opened Phase ${phase.id}: ${phase.label}` });
    }
  };

  const handleStepClick = (step, phase) => {
    if (activeStepId === step.id) {
      setActiveStepId(null);
    } else {
      setActiveStepId(step.id);
      log({ action: LOG_ACTIONS.READ, resource: LOG_RESOURCES.AUDIT, resourceId: String(audit.id), details: `Opened step ${step.id}: ${step.label}` });
    }
  };

  // ── Audit creation form ────────────────────────────────────────────────────
  if (!audit) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>Start New Audit</Typography>
        <Paper elevation={3} sx={{ p: 4, maxWidth: 800 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Add fontSize="small" /> Audit Details
          </Typography>
          <Divider sx={{ mb: 3 }} />
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField label="Audit Name" fullWidth required value={form.auditName} onChange={handleChange('auditName')}
                error={!!errors.auditName} helperText={errors.auditName} placeholder="e.g. Q2 2025 Finance Controls Review" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select label="Audit Type" fullWidth required value={form.auditType} onChange={handleChange('auditType')}
                error={!!errors.auditType} helperText={errors.auditType}>
                {AUDIT_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select label="Department" fullWidth required value={form.department} onChange={handleChange('department')}
                error={!!errors.department} helperText={errors.department}>
                {DEPARTMENTS.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Start Date" type="date" fullWidth required InputLabelProps={{ shrink: true }}
                value={form.startDate} onChange={handleChange('startDate')} error={!!errors.startDate} helperText={errors.startDate} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="End Date" type="date" fullWidth InputLabelProps={{ shrink: true }}
                value={form.endDate} onChange={handleChange('endDate')} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Lead Auditor" fullWidth required value={form.leadAuditor} onChange={handleChange('leadAuditor')}
                error={!!errors.leadAuditor} helperText={errors.leadAuditor} placeholder="Full name of the lead auditor" />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Audit Objective" fullWidth multiline rows={3} value={form.objective} onChange={handleChange('objective')}
                placeholder="Describe the scope and objectives of this audit..." />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" size="large" startIcon={<Add />} onClick={handleStart} sx={{ mt: 1 }}>
                Start Audit
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    );
  }

  // ── Inside the audit: flowchart view ──────────────────────────────────────
  const activePhase = PHASES.find((p) => p.id === activePhaseId);
  const activeStep = activePhase?.steps.find((s) => s.id === activeStepId);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h5" fontWeight={700}>{audit.auditName}</Typography>
        <Button variant="outlined" size="small" startIcon={<Add />} onClick={() => setAudit(null)}>New Audit</Button>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
        <Chip label={audit.auditType} color="primary" size="small" />
        <Chip label={audit.department} size="small" />
        <Chip label={`Lead: ${audit.leadAuditor}`} size="small" />
        {audit.startDate && <Chip label={`${audit.startDate}${audit.endDate ? ` → ${audit.endDate}` : ''}`} size="small" />}
        <Chip label="In Progress" color="warning" size="small" />
      </Box>

      {/* ── Phase flowchart ── */}
      <Typography variant="overline" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        Audit Phases — click a phase to expand
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'stretch', overflowX: 'auto', pb: 1, mb: 1 }}>
        {PHASES.map((phase, i) => (
          <React.Fragment key={phase.id}>
            {i > 0 && <Arrow color={activePhaseId === phase.id || activePhaseId === PHASES[i - 1].id ? phase.color : '#bdbdbd'} />}
            <PhaseNode
              phase={phase}
              isActive={activePhaseId === phase.id}
              onClick={() => handlePhaseClick(phase)}
              auditId={audit.id}
            />
          </React.Fragment>
        ))}
      </Box>

      {/* ── Expanded phase: sub-step flowchart ── */}
      <Collapse in={!!activePhase}>
        {activePhase && (
          <Box sx={{ mt: 2, p: 2, bgcolor: activePhase.lightColor, borderRadius: 2, border: `1px solid ${activePhase.color}22` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: activePhase.color, mr: 1 }} />
              <Typography variant="subtitle1" fontWeight={700} color={activePhase.color}>
                Phase {activePhase.id}: {activePhase.label}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                — click a step to work inside it
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'stretch', overflowX: 'auto', pb: 1 }}>
              {activePhase.steps.map((step, i) => (
                <React.Fragment key={step.id}>
                  {i > 0 && <Arrow color={activePhase.color} />}
                  <StepNode
                    step={step}
                    phaseColor={activePhase.color}
                    phaseLightColor="#fff"
                    isActive={activeStepId === step.id}
                    auditId={audit.id}
                    onClick={() => handleStepClick(step, activePhase)}
                  />
                </React.Fragment>
              ))}
            </Box>

            {/* ── Work panel ── */}
            <Collapse in={!!activeStep}>
              {activeStep && (
                <WorkPanel
                  key={activeStep.id}
                  step={activeStep}
                  phase={activePhase}
                  auditId={audit.id}
                  auditName={audit.auditName}
                  onStatusChange={() => forceUpdate((n) => n + 1)}
                />
              )}
            </Collapse>
          </Box>
        )}
      </Collapse>
    </Box>
  );
};

export default StartNewAudit;
