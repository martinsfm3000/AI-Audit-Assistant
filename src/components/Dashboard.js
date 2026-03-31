import { useState, useEffect } from 'react';
import { Grid, Paper, Typography, Box, List, ListItem, ListItemText, ListItemButton, Chip, Divider, Button, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, TextField, MenuItem, Stack } from '@mui/material';
import { Assessment, Pending, CheckCircle, Schedule, Add, DeleteOutline, EditOutlined, CloudDone, Sync } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { log, LOG_ACTIONS, LOG_RESOURCES } from '../services/auditLogger';
import useAutoSave from '../hooks/useAutoSave';

const STATUS_COLORS = {
  'In Progress': 'warning',
  'Completed': 'success',
  'Not Started': 'default',
};

const StatCard = ({ title, value, icon: Icon, color, onClick }) => (
  <Paper
    elevation={3}
    onClick={onClick}
    sx={{
      p: 2, display: 'flex', alignItems: 'center',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'box-shadow 0.2s',
      '&:hover': onClick ? { boxShadow: 6 } : {},
    }}
  >
    <Icon sx={{ fontSize: 40, color, mr: 2 }} />
    <Box>
      <Typography variant="h6">{title}</Typography>
      <Typography variant="h4">{value}</Typography>
    </Box>
  </Paper>
);

const Dashboard = () => {
  const [audits, setAudits] = useState([]);
  const [filter, setFilter] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editAudit, setEditAudit] = useState(null);   // audit being edited
  const [editForm, setEditForm] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('mkopa_audits') || '[]');
    setAudits(stored);
    log({ action: LOG_ACTIONS.READ, resource: LOG_RESOURCES.PAGE, details: 'Viewed Dashboard' });
  }, []);

  const counts = {
    notStarted: audits.filter((a) => a.status === 'Not Started').length,
    inProgress: audits.filter((a) => a.status === 'In Progress').length,
    completed: audits.filter((a) => a.status === 'Completed').length,
    total: audits.length,
  };

  const visible = filter === 'all' ? audits
    : filter === 'ongoing' ? audits.filter((a) => a.status === 'In Progress')
    : filter === 'notStarted' ? audits.filter((a) => a.status === 'Not Started')
    : audits.filter((a) => a.status === 'Completed');

  const handleAuditClick = (audit) => {
    log({ action: LOG_ACTIONS.READ, resource: LOG_RESOURCES.AUDIT, resourceId: String(audit.id), details: `Opened audit: "${audit.auditName}"` });
    navigate('/start-audit', { state: { audit } });
  };

  const handleStatClick = (filterKey, label) => {
    log({ action: LOG_ACTIONS.FILTER, resource: LOG_RESOURCES.AUDIT, details: `Filtered dashboard by: ${label}` });
    setFilter(filterKey);
  };

  const AUDIT_TYPES = ['Financial', 'Operational', 'Compliance', 'IT/Systems', 'Fraud Investigation', 'Special Purpose'];
  const DEPARTMENTS = ['Finance', 'IT', 'Treasury', 'Operations', 'HR', 'Sales', 'Risk & Compliance', 'Supply Chain'];
  const STATUSES = ['Not Started', 'In Progress', 'Completed'];

  const openEdit = (e, audit) => {
    e.stopPropagation();
    setEditAudit(audit);
    setEditForm({ ...audit });
  };

  // Auto-save the edit form 800 ms after the last field change
  const editSaveState = useAutoSave(
    editForm,
    (form) => {
      if (!form.auditName?.trim() || !editAudit) return;
      const changed = Object.keys(form)
        .filter((k) => form[k] !== editAudit[k])
        .map((k) => `${k}: "${editAudit[k]}" → "${form[k]}"`)
        .join(', ');
      const updated = audits.map((a) => a.id === editAudit.id ? { ...form } : a);
      localStorage.setItem('mkopa_audits', JSON.stringify(updated));
      log({ action: LOG_ACTIONS.UPDATE, resource: LOG_RESOURCES.AUDIT, resourceId: String(editAudit.id), details: `Auto-saved audit "${form.auditName}": ${changed || 'no changes'}` });
      setAudits(updated);
    },
    800,
    !editAudit, // skip when dialog is closed
  );

  const handleEditSave = () => {
    if (!editForm.auditName?.trim() || !editAudit) return;
    const changed = Object.keys(editForm)
      .filter((k) => editForm[k] !== editAudit[k])
      .map((k) => `${k}: "${editAudit[k]}" → "${editForm[k]}"`)
      .join(', ');
    const updated = audits.map((a) => a.id === editAudit.id ? { ...editForm } : a);
    localStorage.setItem('mkopa_audits', JSON.stringify(updated));
    log({ action: LOG_ACTIONS.UPDATE, resource: LOG_RESOURCES.AUDIT, resourceId: String(editAudit.id), details: `Saved audit "${editForm.auditName}": ${changed || 'no changes'}` });
    setAudits(updated);
    setEditAudit(null);
    setEditForm({});
  };

  const handleDeleteConfirm = () => {
    const audit = confirmDelete;
    const updated = audits.filter((a) => a.id !== audit.id);
    localStorage.setItem('mkopa_audits', JSON.stringify(updated));
    log({ action: LOG_ACTIONS.DELETE, resource: LOG_RESOURCES.AUDIT, resourceId: String(audit.id), details: `Deleted audit: "${audit.auditName}" (${audit.auditType} – ${audit.department})` });
    setAudits(updated);
    setConfirmDelete(null);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Dashboard</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/start-audit')}>
          New Audit
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Yet to Start" value={counts.notStarted} icon={Schedule} color="orange"
            onClick={() => handleStatClick('notStarted', 'Not Started')} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Ongoing" value={counts.inProgress} icon={Pending} color="blue"
            onClick={() => handleStatClick('ongoing', 'Ongoing')} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Completed" value={counts.completed} icon={CheckCircle} color="green"
            onClick={() => handleStatClick('completed', 'Completed')} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Audits" value={counts.total} icon={Assessment} color="purple"
            onClick={() => handleStatClick('all', 'All')} />
        </Grid>
      </Grid>

      <Paper elevation={2} sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6">
            {filter === 'all' ? 'All Audits' : filter === 'ongoing' ? 'Ongoing Audits' : filter === 'notStarted' ? 'Yet to Start' : 'Completed Audits'}
          </Typography>
          {filter !== 'all' && (
            <Button size="small" onClick={() => setFilter('all')}>Show all</Button>
          )}
        </Box>
        <Divider sx={{ mb: 1 }} />
        {visible.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography color="text.secondary" gutterBottom>No audits yet.</Typography>
            <Button variant="outlined" startIcon={<Add />} onClick={() => navigate('/start-audit')}>
              Start your first audit
            </Button>
          </Box>
        ) : (
          <List disablePadding>
            {visible.map((audit, i) => (
              <Box key={audit.id}>
                {i > 0 && <Divider />}
                <ListItem disablePadding
                  secondaryAction={
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Edit audit">
                        <IconButton size="small" onClick={(e) => openEdit(e, audit)}>
                          <EditOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete audit">
                        <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); setConfirmDelete(audit); }}>
                          <DeleteOutline fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  }
                >
                  <ListItemButton onClick={() => handleAuditClick(audit)} sx={{ py: 1.5, pr: 11 }}>
                    <ListItemText
                      primary={audit.auditName}
                      secondary={`${audit.auditType} · ${audit.department} · Lead: ${audit.leadAuditor} · ${new Date(audit.createdAt).toLocaleDateString()}`}
                    />
                    <Chip
                      label={audit.status}
                      size="small"
                      color={STATUS_COLORS[audit.status] || 'default'}
                      sx={{ ml: 2, flexShrink: 0 }}
                    />
                  </ListItemButton>
                </ListItem>
              </Box>
            ))}
          </List>
        )}
      </Paper>

      {/* Edit Dialog */}
      <Dialog open={!!editAudit} onClose={handleEditSave} fullWidth maxWidth="sm">
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            Edit Audit
            {editSaveState === 'saving' && <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}><Sync sx={{ fontSize: 14 }} /><Typography variant="caption">Saving…</Typography></Box>}
            {editSaveState === 'saved'  && <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'success.main' }}><CloudDone sx={{ fontSize: 14 }} /><Typography variant="caption">Saved</Typography></Box>}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Audit Name" fullWidth required value={editForm.auditName || ''} onChange={(e) => setEditForm((p) => ({ ...p, auditName: e.target.value }))} />
            <TextField select label="Audit Type" fullWidth value={editForm.auditType || ''} onChange={(e) => setEditForm((p) => ({ ...p, auditType: e.target.value }))}>
              {AUDIT_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
            <TextField select label="Department" fullWidth value={editForm.department || ''} onChange={(e) => setEditForm((p) => ({ ...p, department: e.target.value }))}>
              {DEPARTMENTS.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField label="Start Date" type="date" fullWidth InputLabelProps={{ shrink: true }} value={editForm.startDate || ''} onChange={(e) => setEditForm((p) => ({ ...p, startDate: e.target.value }))} />
              <TextField label="End Date" type="date" fullWidth InputLabelProps={{ shrink: true }} value={editForm.endDate || ''} onChange={(e) => setEditForm((p) => ({ ...p, endDate: e.target.value }))} />
            </Stack>
            <TextField label="Lead Auditor" fullWidth value={editForm.leadAuditor || ''} onChange={(e) => setEditForm((p) => ({ ...p, leadAuditor: e.target.value }))} />
            <TextField select label="Status" fullWidth value={editForm.status || ''} onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}>
              {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
            <TextField label="Audit Objective" fullWidth multiline rows={3} value={editForm.objective || ''} onChange={(e) => setEditForm((p) => ({ ...p, objective: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditAudit(null)}>Close</Button>
          <Button variant="contained" onClick={handleEditSave} disabled={!editForm.auditName?.trim()}>Save & Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Delete Audit</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to permanently delete <strong>{confirmDelete?.auditName}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;
