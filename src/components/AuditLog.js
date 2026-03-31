import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, Chip, TextField, MenuItem,
  Button, InputAdornment, Tooltip, IconButton, Stack, Divider, Alert
} from '@mui/material';
import {
  Search, FileDownload, DeleteForever, Refresh, FilterList
} from '@mui/icons-material';
import { getLogs, exportLogs, clearLogs, LOG_ACTIONS, LOG_RESOURCES, LOG_SEVERITY, LOG_RESULT, log } from '../services/auditLogger';

const SEVERITY_COLOR = {
  INFO: 'default',
  WARNING: 'warning',
  CRITICAL: 'error',
};

const RESULT_COLOR = {
  SUCCESS: 'success',
  FAILURE: 'error',
  DENIED: 'error',
};

const ACTION_COLOR = {
  LOGIN: 'primary', LOGOUT: 'secondary',
  CREATE: 'success', READ: 'default', UPDATE: 'warning', DELETE: 'error',
  NAVIGATE: 'default', EXPORT: 'info', SEARCH: 'default', FILTER: 'default',
  AI_QUERY: 'primary', AI_RESPONSE: 'primary', ACCESS_DENIED: 'error',
};

const ALL = 'All';

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState(ALL);
  const [resourceFilter, setResourceFilter] = useState(ALL);
  const [severityFilter, setSeverityFilter] = useState(ALL);
  const [resultFilter, setResultFilter] = useState(ALL);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [clearConfirm, setClearConfirm] = useState(false);

  const refresh = useCallback(() => {
    log({ action: LOG_ACTIONS.READ, resource: LOG_RESOURCES.AUDIT_LOG, details: 'Viewed audit log' });
    const all = getLogs().slice().reverse(); // newest first
    setLogs(all);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    let result = logs;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((e) =>
        (e.details || '').toLowerCase().includes(q) ||
        (e.user?.name || '').toLowerCase().includes(q) ||
        (e.action || '').toLowerCase().includes(q) ||
        (e.resource || '').toLowerCase().includes(q) ||
        (e.id || '').toLowerCase().includes(q)
      );
    }
    if (actionFilter !== ALL) result = result.filter((e) => e.action === actionFilter);
    if (resourceFilter !== ALL) result = result.filter((e) => e.resource === resourceFilter);
    if (severityFilter !== ALL) result = result.filter((e) => e.severity === severityFilter);
    if (resultFilter !== ALL) result = result.filter((e) => e.result === resultFilter);
    setFiltered(result);
    setPage(0);
  }, [logs, search, actionFilter, resourceFilter, severityFilter, resultFilter]);

  const handleClear = () => {
    if (!clearConfirm) { setClearConfirm(true); return; }
    clearLogs();
    setClearConfirm(false);
    refresh();
  };

  const summary = {
    total: logs.length,
    critical: logs.filter((e) => e.severity === LOG_SEVERITY.CRITICAL).length,
    warnings: logs.filter((e) => e.severity === LOG_SEVERITY.WARNING).length,
    denied: logs.filter((e) => e.result === LOG_RESULT.DENIED).length,
  };

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Audit Log</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Immutable activity record — compliant with IIA Standards, SOX/ICFR, and COSO access-control requirements.
      </Typography>

      {/* Summary cards */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap">
        {[
          { label: 'Total Events', value: summary.total, color: 'text.primary' },
          { label: 'Critical', value: summary.critical, color: 'error.main' },
          { label: 'Warnings', value: summary.warnings, color: 'warning.main' },
          { label: 'Access Denied', value: summary.denied, color: 'error.main' },
        ].map(({ label, value, color }) => (
          <Paper key={label} elevation={2} sx={{ px: 3, py: 1.5, minWidth: 130 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="h5" color={color} fontWeight="bold">{value}</Typography>
          </Paper>
        ))}
      </Stack>

      {clearConfirm && (
        <Alert severity="warning" sx={{ mb: 2 }}
          action={
            <Stack direction="row" spacing={1}>
              <Button color="inherit" size="small" onClick={() => setClearConfirm(false)}>Cancel</Button>
              <Button color="error" size="small" variant="contained" onClick={handleClear}>Confirm Clear</Button>
            </Stack>
          }
        >
          This will permanently clear all log entries. This action is itself logged.
        </Alert>
      )}

      {/* Toolbar */}
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start" flexWrap="wrap">
          <TextField
            size="small" placeholder="Search logs…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
            sx={{ minWidth: 220 }}
          />
          <TextField select size="small" label="Action" value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)} sx={{ minWidth: 140 }}>
            <MenuItem value={ALL}>All Actions</MenuItem>
            {Object.values(LOG_ACTIONS).map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Resource" value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)} sx={{ minWidth: 140 }}>
            <MenuItem value={ALL}>All Resources</MenuItem>
            {Object.values(LOG_RESOURCES).map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Severity" value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)} sx={{ minWidth: 120 }}>
            <MenuItem value={ALL}>All Severities</MenuItem>
            {Object.values(LOG_SEVERITY).map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Result" value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)} sx={{ minWidth: 120 }}>
            <MenuItem value={ALL}>All Results</MenuItem>
            {Object.values(LOG_RESULT).map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
          </TextField>
          <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
            <Tooltip title="Refresh"><IconButton size="small" onClick={refresh}><Refresh /></IconButton></Tooltip>
            <Button size="small" startIcon={<FileDownload />} onClick={() => exportLogs('csv')}>CSV</Button>
            <Button size="small" startIcon={<FileDownload />} onClick={() => exportLogs('json')}>JSON</Button>
            <Button size="small" color="error" startIcon={<DeleteForever />} onClick={handleClear}>Clear</Button>
          </Box>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          <FilterList fontSize="inherit" /> Showing {filtered.length} of {logs.length} entries
        </Typography>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper} elevation={2}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Timestamp</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>User</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Role</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Action</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Resource</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Details</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Result</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Severity</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Session</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No log entries match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((entry) => (
                <TableRow key={entry.id} hover
                  sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                  <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                    <Tooltip title={entry.id}>
                      <span>{new Date(entry.timestamp).toLocaleString()}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{entry.user?.name || '—'}</TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">{entry.user?.role || '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={entry.action} size="small" color={ACTION_COLOR[entry.action] || 'default'} variant="outlined" />
                  </TableCell>
                  <TableCell>{entry.resource}</TableCell>
                  <TableCell sx={{ maxWidth: 320 }}>
                    <Tooltip title={entry.details}>
                      <Typography variant="body2" noWrap>{entry.details}</Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Chip label={entry.result} size="small" color={RESULT_COLOR[entry.result] || 'default'} />
                  </TableCell>
                  <TableCell>
                    <Chip label={entry.severity} size="small" color={SEVERITY_COLOR[entry.severity] || 'default'} variant={entry.severity === LOG_SEVERITY.CRITICAL ? 'filled' : 'outlined'} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                      {entry.sessionId?.slice(-8)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <Divider />
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={filtered.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        />
      </TableContainer>
    </Box>
  );
};

export default AuditLog;
