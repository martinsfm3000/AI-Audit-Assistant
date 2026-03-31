import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import StartNewAudit from './components/StartNewAudit';
import AIAssistant from './components/AIAssistant';
import Reports from './components/Reports';
import Users from './components/Users';
import AuditLog from './components/AuditLog';
import Settings from './components/Settings';

const theme = createTheme({
  palette: {
    primary: {
      main: '#6cc24a',
    },
    secondary: {
      main: '#b7d334',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/start-audit" element={<StartNewAudit />} />
            <Route path="/ai-assistant" element={<AIAssistant />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/users" element={<Users />} />
            <Route path="/audit-log" element={<AuditLog />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;
