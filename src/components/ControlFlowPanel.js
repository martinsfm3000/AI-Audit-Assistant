/**
 * ControlFlowPanel
 * Renders the RCM controls inside every audit step so that work is always
 * tied to a specific control area — making the audit truly continuous.
 *
 * Per-control, per-step data is stored independently so each phase has its
 * own notes, status, and fields without overwriting another phase's work.
 */
import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Chip, Collapse, Divider, TextField,
  IconButton, Tooltip, Alert, Stack, Button, MenuItem, Grid,
} from '@mui/material';
import {
  ExpandMore, ExpandLess, CloudDone, Sync, ErrorOutline,
  RadioButtonUnchecked, PlayArrow, CheckCircle, FiberManualRecord,
} from '@mui/icons-material';
import useAutoSave from '../hooks/useAutoSave';
import { log, LOG_ACTIONS, LOG_RESOURCES } from '../services/auditLogger';

const RCM_KEY = (auditId) => `mkopa_rcm_${auditId}`;
const CTRL_KEY = (auditId, stepId, controlId) => `mkopa_ctrl_${auditId}_${stepId}_${controlId}`;

const RATING_COLORS = { Critical: 'error', High: 'warning', Medium: 'info', Low: 'success' };

// ── Step-specific field definitions ─────────────────────────────────────────
const STEP_FIELDS = {
  '1.2': [
    { key: 'walkthroughDate',   label: 'Walkthrough Date',      type: 'date' },
    { key: 'processOwner',      label: 'Process Owner',         type: 'text' },
    { key: 'walkthroughResult', label: 'Walkthrough Outcome',   type: 'select',
      options: ['Adequate – Control is well designed', 'Gap identified – Control design weakness', 'Not yet performed'] },
  ],
  '1.3': [
    { key: 'auditProcedure',    label: 'Audit Procedure',       type: 'multiline' },
    { key: 'testingObjective',  label: 'Testing Objective',     type: 'multiline' },
    { key: 'iiaStandard',       label: 'IIA Standard / Ref',    type: 'text' },
  ],
  '2.1': [
    { key: 'documentRequested', label: 'Document(s) Requested', type: 'multiline' },
    { key: 'requestedFrom',     label: 'Requested From',        type: 'text' },
    { key: 'dueDate',           label: 'Due Date',              type: 'date' },
    { key: 'pbcStatus',         label: 'PBC Status',            type: 'select',
      options: ['Not Requested', 'Requested', 'Partially Received', 'Received', 'Not Required'] },
  ],
  '2.2': [
    { key: 'followUpDate',      label: 'Follow-up Date',        type: 'date' },
    { key: 'followUpNote',      label: 'Follow-up Note',        type: 'multiline' },
    { key: 'followUpStatus',    label: 'Follow-up Status',      type: 'select',
      options: ['No Follow-up Needed', 'Follow-up Sent', 'Awaiting Response', 'Resolved'] },
  ],
  '2.3': [
    { key: 'evidenceRef',       label: 'Evidence Reference',    type: 'text' },
    { key: 'evidenceType',      label: 'Evidence Type',         type: 'select',
      options: ['Policy / Procedure', 'System Report', 'Approval Record', 'Interview Note', 'Physical Observation', 'Third-Party Confirmation', 'Other'] },
    { key: 'evidenceLocation',  label: 'File / Location',       type: 'text' },
    { key: 'evidenceAdequacy',  label: 'Adequacy Assessment',   type: 'select',
      options: ['Sufficient & Appropriate', 'Partially Sufficient', 'Insufficient', 'Not Yet Assessed'] },
  ],
  '3.1': [
    { key: 'population',        label: 'Population Size',       type: 'text' },
    { key: 'samplingMethod',    label: 'Sampling Method',       type: 'select',
      options: ['Random', 'Systematic', 'Stratified', 'Judgmental', 'Monetary Unit Sampling'] },
    { key: 'sampleSize',        label: 'Sample Size',           type: 'text' },
    { key: 'samplingRationale', label: 'Sampling Rationale',    type: 'multiline' },
  ],
  '3.2': [
    { key: 'testingProcedure',  label: 'Testing Procedure',     type: 'multiline' },
    { key: 'samplesTested',     label: 'Samples Tested',        type: 'text' },
    { key: 'exceptionsFound',   label: 'Exceptions Found',      type: 'text' },
    { key: 'exceptionRate',     label: 'Exception Rate (%)',     type: 'text' },
    { key: 'oetConclusion',     label: 'OET Conclusion',        type: 'select',
      options: ['Operating Effectively', 'Operating with Exceptions', 'Not Operating Effectively', 'Testing Incomplete'] },
  ],
  '3.3': [
    { key: 'exceptionDescription', label: 'Exception Description', type: 'multiline' },
    { key: 'exceptionSeverity',    label: 'Exception Severity',    type: 'select',
      options: ['Critical', 'High', 'Medium', 'Low', 'No Exception'] },
    { key: 'rootCause',            label: 'Root Cause',            type: 'multiline' },
    { key: 'managementResponse',   label: 'Management Response',   type: 'multiline' },
  ],
  '4.1': [
    { key: 'dataSource',        label: 'Data Source',           type: 'text' },
    { key: 'analyticPerformed', label: 'Analytic Performed',    type: 'multiline' },
    { key: 'analyticsResult',   label: 'Analytics Result / Finding', type: 'multiline' },
    { key: 'anomaliesFound',    label: 'Anomalies Identified',  type: 'select',
      options: ['None', 'Minor', 'Significant', 'Critical'] },
  ],
  '4.2': [
    { key: 'priorIssueRef',     label: 'Prior Issue Reference', type: 'text' },
    { key: 'remediationStatus', label: 'Remediation Status',    type: 'select',
      options: ['Not Applicable', 'Fully Remediated', 'Partially Remediated', 'Not Remediated', 'Not Yet Assessed'] },
    { key: 'closureEvidence',   label: 'Closure Evidence',      type: 'multiline' },
  ],
  '5.1': [
    { key: 'findingTitle',      label: 'Finding Title',         type: 'text' },
    { key: 'condition',         label: 'Condition (What is)',   type: 'multiline' },
    { key: 'criteria',          label: 'Criteria (What should be)', type: 'multiline' },
    { key: 'cause',             label: 'Cause (Why)',           type: 'multiline' },
    { key: 'effect',            label: 'Effect / Impact',       type: 'multiline' },
    { key: 'recommendation',    label: 'Recommendation',        type: 'multiline' },
    { key: 'managementAction',  label: 'Management Action Plan', type: 'multiline' },
    { key: 'targetDate',        label: 'Target Remediation Date', type: 'date' },
    { key: 'findingSeverity',   label: 'Finding Severity',      type: 'select',
      options: ['Critical', 'High', 'Medium', 'Low', 'Observation / Advisory'] },
  ],
  '5.2': [
    { key: 'exportFormat',      label: 'Export Format',         type: 'select',
      options: ['PDF', 'Word', 'Excel', 'CSV'] },
    { key: 'reportSection',     label: 'Report Section',        type: 'text' },
    { key: 'includeInReport',   label: 'Include in Report',     type: 'select',
      options: ['Yes', 'No', 'Pending Review'] },
  ],
};

const STEP_CONTROL_STATUSES = [
  { key: 'not_started', label: 'Not Started', color: 'default',  Icon: RadioButtonUnchecked },
  { key: 'in_progress', label: 'In Progress', color: 'warning',  Icon: PlayArrow },
  { key: 'completed',   label: 'Completed',   color: 'success',  Icon: CheckCircle },
];

// ── Save indicator ────────────────────────────────────────────────────────────
const SaveIndicator = ({ state }) => {
  if (state === 'idle') return null;
  const cfg = {
    pending: { Icon: Sync,         label: 'Unsaved…', color: 'text.disabled' },
    saving:  { Icon: Sync,         label: 'Saving…',  color: 'text.secondary' },
    saved:   { Icon: CloudDone,    label: 'Saved',     color: 'success.main' },
    error:   { Icon: ErrorOutline, label: 'Error',     color: 'error.main' },
  }[state];
  if (!cfg) return null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: cfg.color }}>
      <cfg.Icon sx={{ fontSize: 13 }} />
      <Typography variant="caption" color="inherit">{cfg.label}</Typography>
    </Box>
  );
};

// ── Per-control work card ─────────────────────────────────────────────────────
const ControlCard = ({ control, stepId, auditId }) => {
  const storageKey = CTRL_KEY(auditId, stepId, control.id);
  const initial = JSON.parse(localStorage.getItem(storageKey) || '{}');

  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState(initial);

  const stepFields = STEP_FIELDS[stepId] || [];

  const saveState = useAutoSave(data, (value) => {
    localStorage.setItem(storageKey, JSON.stringify(value));
    log({
      action: LOG_ACTIONS.UPDATE, resource: LOG_RESOURCES.AUDIT,
      resourceId: String(auditId),
      details: `Auto-saved step ${stepId} work for control: "${control.controlArea}"`,
    });
  }, 800, !expanded);

  const setField = (key) => (e) => setData((p) => ({ ...p, [key]: e.target.value }));

  const setStatus = (key) => {
    setData((p) => ({ ...p, __status: key }));
    log({
      action: LOG_ACTIONS.UPDATE, resource: LOG_RESOURCES.AUDIT,
      resourceId: String(auditId),
      details: `Step ${stepId} control "${control.controlArea}" marked as ${key}`,
    });
  };

  const status = data.__status || 'not_started';
  const statusCfg = STEP_CONTROL_STATUSES.find((s) => s.key === status) || STEP_CONTROL_STATUSES[0];

  return (
    <Paper
      variant="outlined"
      sx={{
        mb: 1.5,
        borderLeft: `4px solid ${
          status === 'completed' ? '#2e7d32' :
          status === 'in_progress' ? '#e65100' : '#bdbdbd'
        }`,
      }}
    >
      {/* Header row */}
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.2, cursor: 'pointer' }}
        onClick={() => setExpanded((v) => !v)}
      >
        <FiberManualRecord sx={{ fontSize: 10, color: RATING_COLORS[control.riskRating] ? `${RATING_COLORS[control.riskRating]}.main` : 'text.disabled', flexShrink: 0 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap>{control.controlArea}</Typography>
          <Typography variant="caption" color="text.secondary">
            {control.riskCategory}{control.controlType ? ` · ${control.controlType}` : ''}
            {control.controlFrequency ? ` · ${control.controlFrequency}` : ''}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
          {control.riskRating && (
            <Chip label={control.riskRating} size="small" color={RATING_COLORS[control.riskRating] || 'default'} sx={{ height: 20, fontSize: '0.65rem' }} />
          )}
          <Chip
            icon={<statusCfg.Icon sx={{ fontSize: '0.75rem !important' }} />}
            label={statusCfg.label}
            size="small"
            color={statusCfg.color}
            variant={status === 'not_started' ? 'outlined' : 'filled'}
            sx={{ height: 20, fontSize: '0.65rem' }}
          />
          <SaveIndicator state={saveState} />
          <IconButton size="small">
            {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          </IconButton>
        </Stack>
      </Box>

      {/* Expanded work area */}
      <Collapse in={expanded} unmountOnExit>
        <Divider />
        <Box sx={{ px: 2, py: 2 }}>
          {/* Status buttons */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            {STEP_CONTROL_STATUSES.map(({ key, label, color, Icon: SIcon }) => (
              <Button
                key={key} size="small"
                variant={status === key ? 'contained' : 'outlined'}
                color={color === 'default' ? 'inherit' : color}
                startIcon={<SIcon sx={{ fontSize: 14 }} />}
                onClick={() => setStatus(key)}
              >
                {label}
              </Button>
            ))}
          </Box>

          {/* Step-specific fields */}
          {stepFields.length > 0 && (
            <Grid container spacing={2}>
              {stepFields.map(({ key, label, type, options }) => (
                <Grid item xs={12} sm={type === 'multiline' ? 12 : 6} key={key}>
                  {type === 'select' ? (
                    <TextField select label={label} fullWidth size="small" value={data[key] || ''} onChange={setField(key)}>
                      {options.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                    </TextField>
                  ) : (
                    <TextField
                      label={label} fullWidth size="small"
                      type={type === 'date' ? 'date' : 'text'}
                      multiline={type === 'multiline'} rows={type === 'multiline' ? 3 : 1}
                      InputLabelProps={type === 'date' ? { shrink: true } : undefined}
                      value={data[key] || ''} onChange={setField(key)}
                    />
                  )}
                </Grid>
              ))}
            </Grid>
          )}

          {/* General notes always available */}
          <Box sx={{ mt: stepFields.length ? 2 : 0 }}>
            <TextField
              label="Working Notes" fullWidth multiline rows={3} size="small"
              placeholder="Add any additional notes for this control area…"
              value={data.__notes || ''} onChange={(e) => setData((p) => ({ ...p, __notes: e.target.value }))}
            />
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
};

// ── Main export ───────────────────────────────────────────────────────────────
const ControlFlowPanel = ({ auditId, stepId }) => {
  const [controls, setControls] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem(RCM_KEY(auditId)) || '[]');
    setControls(stored);
  }, [auditId]);

  if (controls.length === 0) {
    return (
      <Alert severity="info">
        No controls in the Risk &amp; Controls Matrix yet.
        Go to <strong>Phase 1 › Risk &amp; Controls Matrix</strong> to add control areas — they will automatically appear here.
      </Alert>
    );
  }

  const completedCount = controls.filter((c) => {
    const d = JSON.parse(localStorage.getItem(CTRL_KEY(auditId, stepId, c.id)) || '{}');
    return d.__status === 'completed';
  }).length;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="caption" color="text.secondary">
          {controls.length} control area{controls.length !== 1 ? 's' : ''} from RCM &nbsp;·&nbsp;
          <strong>{completedCount}/{controls.length}</strong> completed in this step
        </Typography>
        <Typography variant="caption" color="text.secondary">Changes auto-save as you type</Typography>
      </Box>
      {controls.map((control) => (
        <ControlCard key={control.id} control={control} stepId={stepId} auditId={auditId} />
      ))}
    </Box>
  );
};

export default ControlFlowPanel;
