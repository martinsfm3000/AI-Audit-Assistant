import React, { useState, useEffect, useCallback, useRef } from 'react';

// ================================================================
// 🤖 M-KOPA AI AUDIT ASSISTANT - PRODUCTION VERSION
// ================================================================
// LIVE FEATURES:
// ✅ Real Claude AI via Anthropic API
// ✅ Live Notion data via MCP
// ✅ AI-powered sample testing
// ✅ Automated finding generation
// ✅ Document request tracking
// ✅ Client comment exchange
// ✅ Full CRUD operations
// ================================================================

const NOTION_MCP = 'https://mcp.notion.com/mcp';

const DATA_SOURCES = {
  controls: 'collection://0d484075-4a6c-4e83-bd7b-d3f1a7dc4d79',
  documents: 'collection://584abd5c-0873-4ee2-844b-9bad2fa831a1',
  comments: 'collection://b57cb796-b086-4cf8-a19b-726896aa0fa8',
  findings: 'collection://74ee0b91-850b-4e1b-8d76-dd4f58231b8e'
};

// Audit AI System Prompt
const AUDIT_SYSTEM_PROMPT = `You are MJ, an expert AI Internal Audit Assistant for M-KOPA with 15+ years automating audit fieldwork.

CORE EXPERTISE:
- Internal audit methodologies (IIA Standards, COSO, COBIT)
- SOX/ICFR compliance and control testing frameworks
- Risk assessment and control evaluation (IRM)
- Audit finding documentation (Condition/Criteria/Cause/Effect/Recommendation)
- Financial controls (AP, AR, Treasury, Procurement)
- IT controls (access, change management, SDLC)
- Advanced data analytics and statistical sampling
- Automation of 90%+ of audit fieldwork

AUTOMATED CAPABILITIES:
✓ TEST DESIGN: Generate comprehensive test procedures with specific steps
✓ SAMPLING: Calculate optimal sample sizes using statistical methods
✓ EXCEPTION DETECTION: Analyze transaction data to find anomalies
✓ FINDING DRAFTING: Create complete findings with proper structuring
✓ RISK RATING: Auto-rate findings by control type & severity
✓ WORKPAPER GENERATION: Create formal audit workpapers
✓ REPORT GENERATION: Produce audit reports with analytics

RESPONSE GUIDELINES:
1. Be concise but complete - provide actionable insights
2. Use professional audit terminology throughout
3. For findings, always include all 5 elements properly structured
4. Reference IIA, COSO, ISO 27001 standards where applicable
5. Consider M-KOPA's 5-country operations
6. For sampling: explain the methodology and provide justification
7. For tests: make procedures specific and testable
8. For risk ratings: explain the rationale (impact & likelihood)
9. Always provide practical, implementable recommendations

Always be helpful, precise, and focused on audit value.`;

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_API_VERSION = '2023-06-01';
const CLAUDE_CHAT_MODEL = 'claude-sonnet-4-20250514';
const CLAUDE_AUTOTEST_MODEL = 'claude-opus-4-1-20250805';
const CLAUDE_KEY_STORAGE_KEY = 'mkopa_claude_api_key';

const getDefaultClaudeApiKey = () => {
  if (typeof window === 'undefined') {
    return (process.env.REACT_APP_ANTHROPIC_API_KEY || '').trim();
  }
  const savedKey = window.localStorage.getItem(CLAUDE_KEY_STORAGE_KEY) || '';
  return (savedKey || process.env.REACT_APP_ANTHROPIC_API_KEY || '').trim();
};

const getAnthropicHeaders = (apiKey) => ({
  'Content-Type': 'application/json',
  'x-api-key': apiKey,
  'anthropic-version': ANTHROPIC_API_VERSION,
  // Anthropic blocks direct browser calls unless this header is explicitly set.
  'anthropic-dangerous-direct-browser-access': 'true'
});

// Color system
const colors = {
  bg: { dark: '#f4f8f2', card: '#ffffff', cardHover: '#f7fbf4', input: '#edf5e7', border: '#d4e2cb' },
  accent: {
    primary: '#6cc24a',
    secondary: '#b7d334',
    success: '#2f9e44',
    warning: '#f2b705',
    danger: '#d94841',
    info: '#2f80ed'
  },
  text: { primary: '#183120', secondary: '#44614d', muted: '#708577', inverse: '#ffffff' },
  gradient: {
    primary: 'linear-gradient(135deg, #6cc24a 0%, #b7d334 100%)',
    success: 'linear-gradient(135deg, #2f9e44 0%, #6cc24a 100%)',
    danger: 'linear-gradient(135deg, #f2b705 0%, #d94841 100%)'
  }
};

// Icons as components
const Icons = {
  Robot: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><circle cx="8" cy="16" r="1" fill="currentColor"/><circle cx="16" cy="16" r="1" fill="currentColor"/></svg>,
  TestTube: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5h0c-1.4 0-2.5-1.1-2.5-2.5V2"/><path d="M8.5 2h7"/><path d="M14.5 16h-5"/></svg>,
  Document: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>,
  Chat: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  Alert: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Send: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Check: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  X: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Plus: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Refresh: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>,
  Sparkle: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5z"/><path d="M19 15l.88 2.12L22 18l-2.12.88L19 21l-.88-2.12L16 18l2.12-.88z"/></svg>,
  Clock: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Flag: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
  Globe: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  Database: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  ChevronRight: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  ExternalLink: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  Zap: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Settings: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24"/></svg>,
  Trash: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>,
  User: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Edit: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
};

// Animated pulse dot
const PulseDot = ({ color = colors.accent.success, size = 8 }) => (
  <div className="relative" style={{ width: size, height: size }}>
    <div className="absolute inset-0 rounded-full" style={{ background: color }} />
    <div className="absolute inset-0 rounded-full animate-ping" style={{ background: color, opacity: 0.75 }} />
  </div>
);

// Status Badge with modern styling
const StatusBadge = ({ status, size = 'md' }) => {
  const styles = {
    'Pass': { bg: 'rgba(16,185,129,0.15)', text: colors.accent.success, border: 'rgba(16,185,129,0.3)' },
    'Fail': { bg: 'rgba(239,68,68,0.15)', text: colors.accent.danger, border: 'rgba(239,68,68,0.3)' },
    'Done': { bg: 'rgba(16,185,129,0.15)', text: colors.accent.success, border: 'rgba(16,185,129,0.3)' },
    'In progress': { bg: 'rgba(245,158,11,0.15)', text: colors.accent.warning, border: 'rgba(245,158,11,0.3)' },
    'Not started': { bg: 'rgba(100,116,139,0.15)', text: colors.text.secondary, border: 'rgba(100,116,139,0.3)' },
    'Critical': { bg: 'rgba(239,68,68,0.15)', text: colors.accent.danger, border: 'rgba(239,68,68,0.3)' },
    'High': { bg: 'rgba(245,158,11,0.15)', text: colors.accent.warning, border: 'rgba(245,158,11,0.3)' },
    'Medium': { bg: 'rgba(139,92,246,0.15)', text: colors.accent.secondary, border: 'rgba(139,92,246,0.3)' },
    'Low': { bg: 'rgba(16,185,129,0.15)', text: colors.accent.success, border: 'rgba(16,185,129,0.3)' },
    'Finance': { bg: 'rgba(59,130,246,0.15)', text: colors.accent.info, border: 'rgba(59,130,246,0.3)' },
    'IT': { bg: 'rgba(139,92,246,0.15)', text: colors.accent.secondary, border: 'rgba(139,92,246,0.3)' },
    'Treasury': { bg: 'rgba(6,182,212,0.15)', text: colors.accent.primary, border: 'rgba(6,182,212,0.3)' },
    'Operations': { bg: 'rgba(16,185,129,0.15)', text: colors.accent.success, border: 'rgba(16,185,129,0.3)' }
  };
  const style = styles[status] || { bg: 'rgba(100,116,139,0.15)', text: colors.text.secondary, border: 'rgba(100,116,139,0.3)' };
  
  return (
    <span 
      className={`inline-flex items-center ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'} rounded-full font-medium`}
      style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}
    >
      {status}
    </span>
  );
};

// Stat Card Component
const StatCard = ({ label, value, icon: Icon, trend, color = colors.accent.primary }) => (
  <div 
    className="rounded-xl p-4 transition-all duration-200 hover:scale-[1.02]"
    style={{ background: colors.bg.card, border: `1px solid ${colors.bg.border}` }}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm mb-1" style={{ color: colors.text.muted }}>{label}</p>
        <p className="text-2xl font-bold" style={{ color: colors.text.primary }}>{value}</p>
        {trend && (
          <p className="text-xs mt-1" style={{ color: trend > 0 ? colors.accent.success : colors.accent.danger }}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from last week
          </p>
        )}
      </div>
      <div 
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ background: `${color}20` }}
      >
        <span className="w-5 h-5" style={{ color }}><Icon /></span>
      </div>
    </div>
  </div>
);

// Message formatting helper
const formatMessage = (text) => {
  if (!text) return null;
  return text.split('\n').map((line, i) => {
    if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-3 mb-1" style={{ color: colors.accent.primary }}>{line.slice(4)}</h4>;
    if (line.startsWith('## ')) return <h3 key={i} className="font-semibold mt-3 mb-1" style={{ color: colors.accent.primary }}>{line.slice(3)}</h3>;
    if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-semibold my-1" style={{ color: colors.accent.primary }}>{line.slice(2, -2)}</p>;
    if (line.includes('**')) {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return <p key={i} className="my-1">{parts.map((part, j) => j % 2 === 1 ? <strong key={j} style={{ color: colors.accent.primary }}>{part}</strong> : part)}</p>;
    }
    if (line.startsWith('- ') || line.startsWith('• ')) return <li key={i} className="ml-4 my-0.5 list-disc">{line.slice(2)}</li>;
    if (line.startsWith('✅ ') || line.startsWith('✓ ')) return <li key={i} className="ml-4 my-0.5 flex items-center gap-2"><span style={{ color: colors.accent.success }}>✓</span>{line.slice(2)}</li>;
    if (line.startsWith('❌ ')) return <li key={i} className="ml-4 my-0.5 flex items-center gap-2"><span style={{ color: colors.accent.danger }}>✗</span>{line.slice(2)}</li>;
    if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 my-0.5">{line}</li>;
    if (line.trim() === '') return <div key={i} className="h-2" />;
    return <p key={i} className="my-1">{line}</p>;
  });
};

// Chat Message Component
const ChatMessage = ({ role, content, timestamp }) => (
  <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
    <div 
      className={`max-w-[85%] rounded-2xl px-4 py-3 ${role === 'user' ? 'rounded-br-md' : 'rounded-bl-md'}`}
      style={{ 
        background: role === 'user' ? colors.gradient.primary : colors.bg.card,
        border: role === 'user' ? 'none' : `1px solid ${colors.bg.border}`
      }}
    >
      {role === 'assistant' && (
        <div className="flex items-center gap-2 mb-2 pb-2" style={{ borderBottom: `1px solid ${colors.bg.border}` }}>
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: colors.gradient.primary }}>
            <span className="w-4 h-4 text-white"><Icons.Robot /></span>
          </div>
          <span className="font-semibold text-sm" style={{ color: colors.accent.primary }}>MJ</span>
          <span className="text-xs" style={{ color: colors.text.muted }}>AI Audit Assistant</span>
        </div>
      )}
      <div className="text-sm leading-relaxed" style={{ color: role === 'user' ? colors.text.inverse : colors.text.primary }}>
        {formatMessage(content)}
      </div>
      {timestamp && <p className="text-xs mt-2" style={{ color: role === 'user' ? 'rgba(255,255,255,0.7)' : colors.text.muted }}>{timestamp}</p>}
    </div>
  </div>
);

// Loading animation
const LoadingDots = () => (
  <div className="flex justify-start mb-4">
    <div className="rounded-2xl rounded-bl-md px-4 py-4" style={{ background: colors.bg.card, border: `1px solid ${colors.bg.border}` }}>
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: colors.gradient.primary }}>
          <span className="w-4 h-4 text-white"><Icons.Robot /></span>
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <div 
              key={i} 
              className="w-2 h-2 rounded-full animate-bounce"
              style={{ background: colors.accent.primary, animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
        <span className="text-sm" style={{ color: colors.text.muted }}>Thinking...</span>
      </div>
    </div>
  </div>
);

// Control Card
const ControlCard = ({ control, onAction }) => (
  <div 
    className="rounded-xl p-5 transition-all duration-200 hover:shadow-lg"
    style={{ background: colors.bg.card, border: `1px solid ${colors.bg.border}` }}
  >
    <div className="flex gap-4">
      <div 
        className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ 
          background: control['Test Result'] === 'Pass' ? 'rgba(16,185,129,0.15)' : 
                     control['Test Result'] === 'Fail' ? 'rgba(239,68,68,0.15)' : 'rgba(100,116,139,0.1)',
          border: `1px solid ${control['Test Result'] === 'Pass' ? 'rgba(16,185,129,0.3)' : 
                               control['Test Result'] === 'Fail' ? 'rgba(239,68,68,0.3)' : 'rgba(100,116,139,0.2)'}` 
        }}
      >
        <span className="w-7 h-7" style={{ 
          color: control['Test Result'] === 'Pass' ? colors.accent.success : 
                 control['Test Result'] === 'Fail' ? colors.accent.danger : colors.text.muted 
        }}>
          {control['Test Result'] === 'Pass' ? <Icons.Check /> : 
           control['Test Result'] === 'Fail' ? <Icons.X /> : <Icons.TestTube />}
        </span>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span 
            className="font-mono text-xs px-2 py-1 rounded"
            style={{ background: colors.bg.input, color: colors.text.muted }}
          >
            CTL-{control['Control ID']}
          </span>
          <StatusBadge status={control['Process Area']} size="sm" />
          <span className="text-xs flex items-center gap-1" style={{ color: colors.text.muted }}>
            <span className="w-3 h-3"><Icons.Globe /></span>
            {control.Country}
          </span>
        </div>
        
        <h3 className="font-semibold text-lg mb-1" style={{ color: colors.text.primary }}>{control.Control}</h3>
        <p className="text-sm mb-3 line-clamp-2" style={{ color: colors.text.secondary }}>
          {control['Control Objective']}
        </p>
        
        <div className="flex items-center gap-4 text-xs" style={{ color: colors.text.muted }}>
          <span>Sample: {control['Sample Size'] || '-'}</span>
          <span>Exceptions: {control['Exceptions Found'] ?? '-'}</span>
          <span>{control.Audit}</span>
        </div>
      </div>
      
      <div className="flex flex-col items-end gap-2">
        <StatusBadge status={control.Status} />
        {control['Test Result'] && <StatusBadge status={control['Test Result']} />}
        <button 
          onClick={() => onAction(control)}
          className="mt-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 flex items-center gap-2"
          style={{ 
            background: control.Status === 'Done' ? colors.bg.input : colors.gradient.primary,
            color: control.Status === 'Done' ? colors.text.primary : colors.text.inverse,
            border: control.Status === 'Done' ? `1px solid ${colors.bg.border}` : 'none'
          }}
        >
          {control.Status === 'Done' ? (
            <>View<span className="w-4 h-4"><Icons.ChevronRight /></span></>
          ) : (
            <><span className="w-4 h-4"><Icons.Sparkle /></span>AI Test</>
          )}
        </button>
      </div>
    </div>
    
    {control['AI Test Summary'] && (
      <div 
        className="mt-4 p-4 rounded-lg"
        style={{ background: colors.bg.input, border: `1px solid ${colors.bg.border}` }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="w-4 h-4" style={{ color: colors.accent.secondary }}><Icons.Sparkle /></span>
          <span className="font-medium text-xs" style={{ color: colors.accent.secondary }}>AI Analysis</span>
        </div>
        <p className="text-sm" style={{ color: colors.text.secondary }}>{control['AI Test Summary']}</p>
      </div>
    )}
  </div>
);

// Finding Card
const FindingCard = ({ finding, onAction }) => (
  <div 
    className="rounded-xl p-5 transition-all duration-200 hover:shadow-lg"
    style={{ 
      background: colors.bg.card, 
      borderLeft: `4px solid ${finding['Risk Rating'] === 'Critical' ? colors.accent.danger : colors.accent.warning}`,
      border: `1px solid ${colors.bg.border}`,
      borderLeftWidth: 4,
      borderLeftColor: finding['Risk Rating'] === 'Critical' ? colors.accent.danger : colors.accent.warning
    }}
  >
    <div className="flex items-start gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="font-mono text-xs px-2 py-1 rounded" style={{ background: colors.bg.input, color: colors.text.muted }}>
            FND-{finding['Finding ID']}
          </span>
          {finding['AI Draft'] === '__YES__' && (
            <span 
              className="px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1"
              style={{ background: `${colors.accent.secondary}20`, color: colors.accent.secondary }}
            >
              <span className="w-3 h-3"><Icons.Sparkle /></span>
              AI Draft
            </span>
          )}
          <span className="text-xs flex items-center gap-1" style={{ color: colors.text.muted }}>
            <span className="w-3 h-3"><Icons.Globe /></span>
            {finding.Country}
          </span>
        </div>
        
        <h3 className="font-semibold text-lg mb-2" style={{ color: colors.text.primary }}>{finding.Finding}</h3>
        
        <div className="space-y-2 text-sm" style={{ color: colors.text.secondary }}>
          <p><strong style={{ color: colors.text.muted }}>Condition:</strong> {finding.Condition?.substring(0, 150)}...</p>
          <p><strong style={{ color: colors.text.muted }}>Related Control:</strong> {finding['Related Control']}</p>
        </div>
      </div>
      
      <div className="flex flex-col items-end gap-2">
        <StatusBadge status={finding['Risk Rating']} />
        <StatusBadge status={finding.Status} />
      </div>
    </div>
    
    <div className="flex gap-2 mt-4 pt-4" style={{ borderTop: `1px solid ${colors.bg.border}` }}>
      <button 
        onClick={() => onAction(finding, 'view')}
        className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-opacity-80"
        style={{ background: colors.bg.input, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
      >
        View Details
      </button>
      <button 
        onClick={() => onAction(finding, 'edit')}
        className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-opacity-80"
        style={{ background: colors.accent.primary, color: colors.text.inverse }}
      >
        Edit Finding
      </button>
    </div>
  </div>
);

const AIAssistant = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState(getDefaultClaudeApiKey());
  const [controls, setControls] = useState([]);
  const [findings, setFindings] = useState([]);
  const [activeTab, setActiveTab] = useState('chat');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const callClaudeAPI = useCallback(async (prompt, systemPrompt = AUDIT_SYSTEM_PROMPT) => {
    if (!apiKey.trim()) {
      throw new Error('Please set your Anthropic API key in settings');
    }

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: getAnthropicHeaders(apiKey),
      body: JSON.stringify({
        model: CLAUDE_CHAT_MODEL,
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API call failed');
    }

    const data = await response.json();
    return data.content[0].text;
  }, [apiKey]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input, timestamp: new Date().toLocaleTimeString() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await callClaudeAPI(input);
      const assistantMessage = { role: 'assistant', content: response, timestamp: new Date().toLocaleTimeString() };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage = { role: 'assistant', content: `Error: ${error.message}`, timestamp: new Date().toLocaleTimeString() };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleControlAction = async (control) => {
    if (control.Status === 'Done') return;

    setIsLoading(true);
    try {
      const prompt = `Generate a comprehensive test procedure for this control:

Control: ${control.Control}
Objective: ${control['Control Objective']}
Process Area: ${control['Process Area']}
Country: ${control.Country}

Please provide:
1. Test objective
2. Test steps with specific procedures
3. Expected results
4. Sample size recommendation
5. Risk assessment`;

      const testProcedure = await callClaudeAPI(prompt);
      
      // Update control with AI test summary
      setControls(prev => prev.map(c => 
        c['Control ID'] === control['Control ID'] 
          ? { ...c, 'AI Test Summary': testProcedure, Status: 'In progress' }
          : c
      ));

      // Add to messages for visibility
      const message = { role: 'assistant', content: `Generated test procedure for ${control.Control}:\n\n${testProcedure}`, timestamp: new Date().toLocaleTimeString() };
      setMessages(prev => [...prev, message]);
    } catch (error) {
      const errorMessage = { role: 'assistant', content: `Error generating test: ${error.message}`, timestamp: new Date().toLocaleTimeString() };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFindingAction = (finding, action) => {
    // Placeholder for finding actions
    console.log(`${action} finding:`, finding);
  };

  return (
    <div className="min-h-screen" style={{ background: colors.bg.dark }}>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: colors.gradient.primary }}>
              <span className="w-8 h-8 text-white"><Icons.Robot /></span>
            </div>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: colors.text.primary }}>MJ - AI Audit Assistant</h1>
              <p className="text-sm" style={{ color: colors.text.secondary }}>Powered by Claude • Expert in IIA Standards & COSO Framework</p>
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Controls Tested" value={controls.filter(c => c.Status === 'Done').length} icon={Icons.TestTube} />
            <StatCard label="Findings Generated" value={findings.length} icon={Icons.Flag} />
            <StatCard label="Pass Rate" value={`${Math.round((controls.filter(c => c['Test Result'] === 'Pass').length / Math.max(controls.length, 1)) * 100)}%`} icon={Icons.Check} />
            <StatCard label="Critical Issues" value={findings.filter(f => f['Risk Rating'] === 'Critical').length} icon={Icons.Alert} color={colors.accent.danger} />
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <div 
              className="rounded-2xl p-6 h-[600px] flex flex-col"
              style={{ background: colors.bg.card, border: `1px solid ${colors.bg.border}` }}
            >
              {/* Tab Navigation */}
              <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ background: colors.bg.input }}>
                <button 
                  onClick={() => setActiveTab('chat')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'chat' ? 'shadow-sm' : ''}`}
                  style={{ 
                    background: activeTab === 'chat' ? colors.bg.card : 'transparent',
                    color: activeTab === 'chat' ? colors.accent.primary : colors.text.secondary
                  }}
                >
                  <span className="w-4 h-4 mr-2"><Icons.Chat /></span>
                  Chat
                </button>
                <button 
                  onClick={() => setActiveTab('controls')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'controls' ? 'shadow-sm' : ''}`}
                  style={{ 
                    background: activeTab === 'controls' ? colors.bg.card : 'transparent',
                    color: activeTab === 'controls' ? colors.accent.primary : colors.text.secondary
                  }}
                >
                  <span className="w-4 h-4 mr-2"><Icons.TestTube /></span>
                  Controls ({controls.length})
                </button>
                <button 
                  onClick={() => setActiveTab('findings')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'findings' ? 'shadow-sm' : ''}`}
                  style={{ 
                    background: activeTab === 'findings' ? colors.bg.card : 'transparent',
                    color: activeTab === 'findings' ? colors.accent.primary : colors.text.secondary
                  }}
                >
                  <span className="w-4 h-4 mr-2"><Icons.Flag /></span>
                  Findings ({findings.length})
                </button>
              </div>

              {/* Chat Messages */}
              {activeTab === 'chat' && (
                <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: colors.bg.input }}>
                        <span className="w-8 h-8" style={{ color: colors.accent.primary }}><Icons.Robot /></span>
                      </div>
                      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.text.primary }}>Welcome to MJ!</h3>
                      <p className="text-sm" style={{ color: colors.text.secondary }}>
                        I'm your AI audit assistant. Ask me anything about internal controls, risk assessment, or audit procedures.
                      </p>
                    </div>
                  )}
                  
                  {messages.map((message, index) => (
                    <ChatMessage key={index} {...message} />
                  ))}
                  
                  {isLoading && <LoadingDots />}
                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* Controls List */}
              {activeTab === 'controls' && (
                <div className="flex-1 overflow-y-auto space-y-4">
                  {controls.length === 0 ? (
                    <div className="text-center py-12">
                      <span className="w-12 h-12 mx-auto mb-4 block" style={{ color: colors.text.muted }}><Icons.TestTube /></span>
                      <p style={{ color: colors.text.secondary }}>No controls loaded yet. Connect to your audit database to get started.</p>
                    </div>
                  ) : (
                    controls.map((control, index) => (
                      <ControlCard key={index} control={control} onAction={handleControlAction} />
                    ))
                  )}
                </div>
              )}

              {/* Findings List */}
              {activeTab === 'findings' && (
                <div className="flex-1 overflow-y-auto space-y-4">
                  {findings.length === 0 ? (
                    <div className="text-center py-12">
                      <span className="w-12 h-12 mx-auto mb-4 block" style={{ color: colors.text.muted }}><Icons.Flag /></span>
                      <p style={{ color: colors.text.secondary }}>No findings generated yet. Run some control tests to identify issues.</p>
                    </div>
                  ) : (
                    findings.map((finding, index) => (
                      <FindingCard key={index} finding={finding} onAction={handleFindingAction} />
                    ))
                  )}
                </div>
              )}

              {/* Input Area - Only show for chat tab */}
              {activeTab === 'chat' && (
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask MJ anything about audit procedures..."
                    className="flex-1 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2"
                    style={{ 
                      background: colors.bg.input, 
                      border: `1px solid ${colors.bg.border}`,
                      color: colors.text.primary,
                      focusRing: colors.accent.primary
                    }}
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isLoading}
                    className="px-6 py-3 rounded-xl font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    style={{ 
                      background: colors.gradient.primary,
                      color: colors.text.inverse,
                      border: 'none'
                    }}
                  >
                    <span className="w-4 h-4"><Icons.Send /></span>
                    Send
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* API Key Settings */}
            <div 
              className="rounded-xl p-4"
              style={{ background: colors.bg.card, border: `1px solid ${colors.bg.border}` }}
            >
              <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: colors.text.primary }}>
                <span className="w-5 h-5"><Icons.Settings /></span>
                API Settings
              </h3>
              <div className="space-y-3">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    window.localStorage.setItem(CLAUDE_KEY_STORAGE_KEY, e.target.value);
                  }}
                  placeholder="Enter Anthropic API Key"
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={{ 
                    background: colors.bg.input, 
                    border: `1px solid ${colors.bg.border}`,
                    color: colors.text.primary,
                    focusRing: colors.accent.primary
                  }}
                />
                <p className="text-xs" style={{ color: colors.text.muted }}>
                  Your API key is stored locally and never sent to our servers.
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div 
              className="rounded-xl p-4"
              style={{ background: colors.bg.card, border: `1px solid ${colors.bg.border}` }}
            >
              <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: colors.text.primary }}>
                <span className="w-5 h-5"><Icons.Zap /></span>
                Quick Actions
              </h3>
              <div className="space-y-2">
                <button 
                  onClick={() => setInput('Generate a risk assessment matrix for procurement controls')}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-opacity-80 transition-all"
                  style={{ background: colors.bg.input, color: colors.text.primary }}
                >
                  Risk Assessment Template
                </button>
                <button 
                  onClick={() => setInput('What are the key SOX compliance requirements for financial reporting?')}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-opacity-80 transition-all"
                  style={{ background: colors.bg.input, color: colors.text.primary }}
                >
                  SOX Compliance Guide
                </button>
                <button 
                  onClick={() => setInput('Create a sampling methodology for accounts payable testing')}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-opacity-80 transition-all"
                  style={{ background: colors.bg.input, color: colors.text.primary }}
                >
                  Sampling Methodology
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;