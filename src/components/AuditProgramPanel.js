/**
 * Audit Program Generator (Step 1.3)
 * Uses Claude AI to generate tailored audit procedures for each RCM control.
 * Manual input is available and optional — AI output is fully editable.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, Chip, Collapse, Divider,
  TextField, Stack, Alert, CircularProgress, Tooltip, IconButton,
  LinearProgress, Grid,
} from '@mui/material';
import {
  AutoAwesome, ExpandMore, ExpandLess, EditOutlined, Save,
  CloudDone, Sync, CheckCircle, RadioButtonUnchecked,
} from '@mui/icons-material';
import { log, LOG_ACTIONS, LOG_RESOURCES } from '../services/auditLogger';
import useAutoSave from '../hooks/useAutoSave';

// ── API config (reuse same keys as AIAssistant) ──────────────────────────────
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';
const MODEL = 'claude-sonnet-4-6';
const KEY_STORAGE = 'mkopa_claude_api_key';

const getApiKey = () => {
  const saved = localStorage.getItem(KEY_STORAGE) || '';
  return (saved || process.env.REACT_APP_ANTHROPIC_API_KEY || '').trim();
};

const RATING_COLORS = { Critical: 'error', High: 'warning', Medium: 'info', Low: 'success' };

const PROG_KEY       = (auditId, controlId) => `mkopa_prog_${auditId}_${controlId}`;
const RCM_KEY        = (auditId)            => `mkopa_rcm_${auditId}`;
const WALKTHROUGH_KEY = (auditId, controlId) => `mkopa_ctrl_${auditId}_1.2_${controlId}`;

const getWalkthrough = (auditId, controlId) => {
  try { return JSON.parse(localStorage.getItem(WALKTHROUGH_KEY(auditId, controlId)) || '{}'); }
  catch { return {}; }
};

const emptyProgram = {
  auditObjective: '',
  procedures: '',
  evidenceRequired: '',
  sampleGuidance: '',
  standards: '',
  manualNotes: '',
  generated: false,
};

// ── Save indicator (reused pattern) ─────────────────────────────────────────
const SaveIndicator = ({ state }) => {
  if (state === 'idle') return null;
  const cfg = {
    pending: { Icon: Sync,      label: 'Unsaved…', color: 'text.disabled'  },
    saving:  { Icon: Sync,      label: 'Saving…',  color: 'text.secondary' },
    saved:   { Icon: CloudDone, label: 'Saved',     color: 'success.main'  },
  }[state];
  if (!cfg) return null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: cfg.color }}>
      <cfg.Icon sx={{ fontSize: 13 }} />
      <Typography variant="caption" color="inherit">{cfg.label}</Typography>
    </Box>
  );
};

// ── AI generation ─────────────────────────────────────────────────────────────
const buildPrompt = (control, walkthrough) => {
  const hasWalkthrough = walkthrough && (walkthrough.walkthroughResult || walkthrough.__notes || walkthrough.processOwner);

  const walkthroughSection = hasWalkthrough ? `
PROCESS WALKTHROUGH FINDINGS (Step 1.2):
- Performed On: ${walkthrough.walkthroughDate || 'Not recorded'}
- Process Owner: ${walkthrough.processOwner || 'Not recorded'}
- Walkthrough Outcome: ${walkthrough.walkthroughResult || 'Not recorded'}
- Auditor Notes: ${walkthrough.__notes || 'None'}
` : `
PROCESS WALKTHROUGH: Not yet performed — derive procedures from RCM data only.
`;

  const riskFocus = walkthrough?.walkthroughResult?.startsWith('Gap')
    ? '\nIMPORTANT: A control design gap was identified in the walkthrough. Ensure procedures specifically test the design weakness and increase sample size accordingly.'
    : '';

  return `
You are an expert internal audit specialist. Generate a tailored audit program using BOTH the Risk & Controls Matrix entry AND the process walkthrough findings below.

RISK & CONTROLS MATRIX (RCM):
- Control Area: ${control.controlArea}
- Risk Category: ${control.riskCategory || 'N/A'}
- COSO Component: ${control.cosoComponent || 'N/A'}
- Control Objective: ${control.controlObjective || 'N/A'}
- Risk Description: ${control.riskDescription || 'N/A'}
- Control Type: ${control.controlType || 'N/A'} (${control.controlNature || 'N/A'})
- Inherent Risk Rating: ${control.riskRating || 'N/A'}
- Control Owner: ${control.controlOwner || 'N/A'}
- Control Operator: ${control.controlOperator || 'N/A'}
${walkthroughSection}${riskFocus}

Generate a structured audit program. Respond ONLY with valid JSON, no markdown:
{
  "auditObjective": "One clear sentence stating what the audit procedures aim to confirm",
  "procedures": "1. [procedure]\\n2. [procedure]\\n3. [procedure]\\n4. [procedure]\\n5. [procedure]",
  "evidenceRequired": "- [document/data item]\\n- [document/data item]\\n- [document/data item]",
  "sampleGuidance": "Recommended sample size with statistical or judgmental rationale (2-3 sentences)",
  "standards": "Applicable IIA Standards, COSO principles, or regulatory references"
}

Requirements:
- 4-6 specific, testable procedures aligned to control type (${control.controlType || 'General'}) and walkthrough outcome
- If a design gap was found in the walkthrough, prioritise procedures that test the gap
- Evidence items must directly support the procedures
- Sample guidance must reference IIA sampling standards or statistical methods
- Standards must cite specific IIA Standard numbers or COSO principles
`.trim();
};

const callClaudeApi = async (control, walkthrough, apiKey) => {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: 'You are an expert internal auditor. Always respond with valid JSON only, no extra text.',
      messages: [{ role: 'user', content: buildPrompt(control, walkthrough) }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || '';
  return JSON.parse(text);
};

// ── Per-control program card ──────────────────────────────────────────────────
const ProgramCard = ({ control, auditId, apiKey }) => {
  const stored = JSON.parse(localStorage.getItem(PROG_KEY(auditId, control.id)) || 'null');
  const walkthrough = getWalkthrough(auditId, control.id);
  const walkthroughDone = !!(walkthrough.walkthroughResult || walkthrough.__notes);
  const [program, setProgram] = useState(stored || emptyProgram);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const saveState = useAutoSave(program, (value) => {
    localStorage.setItem(PROG_KEY(auditId, control.id), JSON.stringify(value));
    log({ action: LOG_ACTIONS.UPDATE, resource: LOG_RESOURCES.AUDIT, resourceId: String(auditId), details: `Auto-saved audit program for: "${control.controlArea}"` });
  }, 800, !expanded);

  const generate = useCallback(async () => {
    if (!apiKey) { setError('No API key configured. Go to Settings to add your Claude API key.'); return; }
    setGenerating(true);
    setError('');
    try {
      const walkthrough = getWalkthrough(auditId, control.id);
      const result = await callClaudeApi(control, walkthrough, apiKey);
      const updated = {
        auditObjective:   result.auditObjective   || '',
        procedures:       result.procedures       || '',
        evidenceRequired: result.evidenceRequired || '',
        sampleGuidance:   result.sampleGuidance   || '',
        standards:        result.standards        || '',
        manualNotes:      program.manualNotes,
        generated:        true,
      };
      setProgram(updated);
      localStorage.setItem(PROG_KEY(auditId, control.id), JSON.stringify(updated));
      log({ action: LOG_ACTIONS.AI_QUERY, resource: LOG_RESOURCES.AUDIT, resourceId: String(auditId), details: `AI generated audit program for: "${control.controlArea}"` });
    } catch (e) {
      setError(`Generation failed: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  }, [control, apiKey, auditId, program.manualNotes]);

  const field = (key) => ({
    value: program[key] || '',
    onChange: (e) => setProgram((p) => ({ ...p, [key]: e.target.value })),
    disabled: !editing,
    size: 'small',
    fullWidth: true,
    variant: 'outlined',
  });

  const hasContent = program.auditObjective || program.procedures;

  return (
    <Paper
      variant="outlined"
      sx={{
        mb: 1.5,
        borderLeft: `4px solid ${hasContent ? (program.generated ? '#1565c0' : '#388e3c') : '#bdbdbd'}`,
      }}
    >
      {/* Header */}
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.2, cursor: 'pointer' }}
        onClick={() => setExpanded((v) => !v)}
      >
        {hasContent
          ? <CheckCircle sx={{ fontSize: 16, color: program.generated ? '#1565c0' : '#388e3c', flexShrink: 0 }} />
          : <RadioButtonUnchecked sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0 }} />
        }
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap>{control.controlArea}</Typography>
          <Typography variant="caption" color="text.secondary">
            {control.riskCategory}{control.controlType ? ` · ${control.controlType}` : ''}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
          {control.riskRating && (
            <Chip label={control.riskRating} size="small" color={RATING_COLORS[control.riskRating] || 'default'} sx={{ height: 20, fontSize: '0.65rem' }} />
          )}
          {program.generated && <Chip label="AI Generated" size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} icon={<AutoAwesome sx={{ fontSize: '0.75rem !important' }} />} />}
          {hasContent && !program.generated && <Chip label="Manual" size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />}
          <SaveIndicator state={saveState} />
          <IconButton size="small">{expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}</IconButton>
        </Stack>
      </Box>

      {/* Expanded content */}
      <Collapse in={expanded} unmountOnExit>
        <Divider />
        <Box sx={{ px: 2, py: 2 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

          {/* Data sources banner */}
          <Alert
            severity={walkthroughDone ? 'success' : 'info'}
            sx={{ mb: 2, py: 0.5 }}
            icon={false}
          >
            <Typography variant="caption">
              <strong>AI sources:</strong> RCM data (risk, objective, control type)
              {walkthroughDone
                ? ` + Walkthrough (${walkthrough.walkthroughResult || 'notes available'})`
                : ' · Walkthrough not yet performed — complete Step 1.2 for richer output'}
            </Typography>
          </Alert>

          {/* Action bar */}
          <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
            <Button
              size="small" variant="contained" startIcon={generating ? <CircularProgress size={14} color="inherit" /> : <AutoAwesome />}
              onClick={generate} disabled={generating}
            >
              {generating ? 'Generating…' : program.generated ? 'Re-generate with AI' : 'Generate with AI'}
            </Button>
            <Button
              size="small" variant={editing ? 'contained' : 'outlined'} color="success"
              startIcon={editing ? <Save /> : <EditOutlined />}
              onClick={() => setEditing((v) => !v)}
            >
              {editing ? 'Done Editing' : 'Edit Manually'}
            </Button>
          </Stack>

          {generating && <LinearProgress sx={{ mb: 2 }} />}

          {/* Program fields */}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>AUDIT OBJECTIVE</Typography>
              <TextField {...field('auditObjective')} multiline rows={2} placeholder="State what this audit program aims to confirm…" sx={{ mt: 0.5 }} />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>AUDIT PROCEDURES</Typography>
              <TextField {...field('procedures')} multiline rows={6} placeholder="1. Obtain and review…&#10;2. Select a sample of…&#10;3. Verify that…" sx={{ mt: 0.5 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>EVIDENCE REQUIRED</Typography>
              <TextField {...field('evidenceRequired')} multiline rows={4} placeholder="- Policy document&#10;- System-generated report&#10;- Approval records" sx={{ mt: 0.5 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>SAMPLE SIZE GUIDANCE</Typography>
              <TextField {...field('sampleGuidance')} multiline rows={4} placeholder="Recommended sample size and rationale…" sx={{ mt: 0.5 }} />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>APPLICABLE STANDARDS</Typography>
              <TextField {...field('standards')} multiline rows={2} placeholder="IIA Standard 2240; COSO Principle 10…" sx={{ mt: 0.5 }} />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>ADDITIONAL NOTES (optional)</Typography>
              <TextField
                value={program.manualNotes || ''} multiline rows={2} size="small" fullWidth variant="outlined"
                placeholder="Any additional context or manual notes…"
                onChange={(e) => setProgram((p) => ({ ...p, manualNotes: e.target.value }))}
                sx={{ mt: 0.5 }}
              />
            </Grid>
          </Grid>
        </Box>
      </Collapse>
    </Paper>
  );
};

// ── Main panel ────────────────────────────────────────────────────────────────
const AuditProgramPanel = ({ auditId }) => {
  const [controls, setControls] = useState([]);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [allProgress, setAllProgress] = useState({ done: 0, total: 0 });
  const [apiKey, setApiKey] = useState(
    (localStorage.getItem('mkopa_claude_api_key') || process.env.REACT_APP_ANTHROPIC_API_KEY || '').trim()
  );
  const [showKeyInput, setShowKeyInput] = useState(false);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem(RCM_KEY(auditId)) || '[]');
    setControls(stored);
    log({ action: LOG_ACTIONS.READ, resource: LOG_RESOURCES.AUDIT, resourceId: String(auditId), details: 'Viewed Audit Program Generator' });
  }, [auditId]);

  const generatedCount = controls.filter((c) => {
    const p = JSON.parse(localStorage.getItem(PROG_KEY(auditId, c.id)) || '{}');
    return p.generated || p.auditObjective;
  }).length;

  const handleGenerateAll = async () => {
    if (!apiKey) { setShowKeyInput(true); return; }
    setGeneratingAll(true);
    setAllProgress({ done: 0, total: controls.length });
    for (let i = 0; i < controls.length; i++) {
      const control = controls[i];
      try {
        const existing = JSON.parse(localStorage.getItem(PROG_KEY(auditId, control.id)) || '{}');
        const walkthrough = getWalkthrough(auditId, control.id);
        const result = await callClaudeApi(control, walkthrough, apiKey);
        const updated = {
          auditObjective:   result.auditObjective   || '',
          procedures:       result.procedures       || '',
          evidenceRequired: result.evidenceRequired || '',
          sampleGuidance:   result.sampleGuidance   || '',
          standards:        result.standards        || '',
          manualNotes:      existing.manualNotes || '',
          generated:        true,
        };
        localStorage.setItem(PROG_KEY(auditId, control.id), JSON.stringify(updated));
        log({ action: LOG_ACTIONS.AI_QUERY, resource: LOG_RESOURCES.AUDIT, resourceId: String(auditId), details: `AI generated audit program for: "${control.controlArea}"` });
      } catch { /* skip failed, user can retry individually */ }
      setAllProgress({ done: i + 1, total: controls.length });
    }
    setGeneratingAll(false);
    // force re-render
    setControls((prev) => [...prev]);
  };

  const saveKey = (key) => {
    localStorage.setItem('mkopa_claude_api_key', key.trim());
    setApiKey(key.trim());
    setShowKeyInput(false);
  };

  if (controls.length === 0) {
    return (
      <Alert severity="info">
        No controls in the Risk &amp; Controls Matrix yet.
        Go to <strong>Phase 1 › Risk &amp; Controls Matrix</strong> to add control areas first.
      </Alert>
    );
  }

  return (
    <Box>
      {/* API key setup */}
      {showKeyInput && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#fff8e1' }}>
          <Typography variant="body2" fontWeight={600} gutterBottom>Enter your Claude API Key</Typography>
          <Stack direction="row" spacing={1}>
            <TextField
              size="small" type="password" placeholder="sk-ant-…" defaultValue={apiKey}
              onBlur={(e) => setApiKey(e.target.value)} sx={{ flex: 1 }}
            />
            <Button variant="contained" size="small" onClick={() => saveKey(apiKey)}>Save</Button>
            <Button size="small" onClick={() => setShowKeyInput(false)}>Cancel</Button>
          </Stack>
        </Paper>
      )}

      {/* Summary bar */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center" flexWrap="wrap">
        <Paper variant="outlined" sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="text.secondary">Controls</Typography>
          <Typography variant="h6" fontWeight={700}>{controls.length}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="text.secondary">Programs Generated</Typography>
          <Typography variant="h6" fontWeight={700} color="primary.main">{generatedCount}</Typography>
        </Paper>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          {!apiKey && (
            <Button size="small" variant="outlined" onClick={() => setShowKeyInput(true)}>
              Set API Key
            </Button>
          )}
          <Tooltip title={!apiKey ? 'Set your API key first' : `Generate AI programs for all ${controls.length} controls`}>
            <span>
              <Button
                size="small" variant="contained" startIcon={generatingAll ? <CircularProgress size={14} color="inherit" /> : <AutoAwesome />}
                onClick={handleGenerateAll} disabled={generatingAll || !apiKey}
              >
                {generatingAll ? `Generating ${allProgress.done}/${allProgress.total}…` : 'Generate All with AI'}
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Stack>

      {generatingAll && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress variant="determinate" value={(allProgress.done / allProgress.total) * 100} />
          <Typography variant="caption" color="text.secondary">
            {allProgress.done} of {allProgress.total} controls processed…
          </Typography>
        </Box>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
        Click a control to expand. Use <strong>Generate with AI</strong> for an AI-tailored program, or <strong>Edit Manually</strong> to write your own. All fields auto-save.
      </Typography>

      {controls.map((control) => (
        <ProgramCard key={control.id} control={control} auditId={auditId} apiKey={apiKey} />
      ))}
    </Box>
  );
};

export default AuditProgramPanel;
