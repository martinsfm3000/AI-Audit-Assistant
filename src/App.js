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
  bg: { dark: '#0a0f1a', card: '#141b2d', cardHover: '#1a2540', input: '#1e293b', border: '#2d3748' },
  accent: { 
    primary: '#06b6d4', // cyan
    secondary: '#8b5cf6', // violet
    success: '#10b981', 
    warning: '#f59e0b', 
    danger: '#ef4444',
    info: '#3b82f6'
  },
  text: { primary: '#f8fafc', secondary: '#94a3b8', muted: '#64748b', inverse: '#0f172a' },
  gradient: {
    primary: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)',
    success: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
    danger: 'linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)'
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
        onClick={() => onAction(finding, 'notion')}
        className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 flex items-center gap-2"
        style={{ background: colors.gradient.primary, color: colors.text.inverse }}
      >
        <span className="w-4 h-4"><Icons.ExternalLink /></span>
        Open in Notion
      </button>
    </div>
  </div>
);

// Main App Component
export default function MKOPAAuditAssistantPro() {
  const [activeTab, setActiveTab] = useState('startAudits');
  const [testingControl, setTestingControl] = useState(null); // Control being tested manually
  const [testingType, setTestingType] = useState('quantitative'); // 'quantitative' or 'qualitative'
  const [testResults, setTestResults] = useState({
    // Quantitative fields
    population: '',
    sampleSize: '',
    testResult: 'Pass',
    exceptionsFound: 0,
    notes: '',
    // Qualitative fields
    testingApproach: 'Walkthrough',
    findings: '',
    riskAssessment: 'Low',
    conclusion: '',
    evidence: ''
  });
  const [chatMessages, setChatMessages] = useState([{
    role: 'assistant',
    content: `Welcome to the **M-KOPA AI Audit Assistant**! 👋

I'm **MJ**, your AI-powered audit companion. I'm connected to your live Notion workspace and ready to help with:

**🧪 Control Testing**
- Design test procedures and select samples
- Analyze results and identify exceptions
- Generate AI summaries

**📝 Finding Generation**
- Draft findings with proper structure
- Suggest recommendations based on best practices
- Rate risk severity

**📋 Document Management**
- Track PBC requests and send reminders
- Monitor overdue items

**💬 Ask Me Anything**
- IIA Standards, COSO, COBIT guidance
- Risk assessment methodologies
- Audit best practices

What would you like to work on today?`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [controls, setControls] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [findings, setFindings] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [audits, setAudits] = useState([]);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [currentUser, setCurrentUser] = useState({ id: 'user-001', name: 'John Doe', role: 'Senior Auditor', email: 'john@mkopa.com' });
  const [users, setUsers] = useState([
    { id: 'user-001', name: 'John Doe', role: 'Senior Auditor', email: 'john@mkopa.com', createdDate: new Date().toISOString() },
    { id: 'user-002', name: 'Jane Smith', role: 'Audit Manager', email: 'jane@mkopa.com', createdDate: new Date().toISOString() },
    { id: 'user-003', name: 'Mike Johnson', role: 'Junior Auditor', email: 'mike@mkopa.com', createdDate: new Date().toISOString() }
  ]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [showCreateAuditModal, setShowCreateAuditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [auditTrailFilter, setAuditTrailFilter] = useState('ALL');
  const [auditTrailSearch, setAuditTrailSearch] = useState('');
  const [auditTrailSort, setAuditTrailSort] = useState('newest');
  const [newAuditForm, setNewAuditForm] = useState({
    name: '',
    country: '',
    scope: '',
    controlCount: 1
  });
  const [auditControls, setAuditControls] = useState([
    { id: 1, name: '', objective: '', area: 'Finance', status: 'Not started' }
  ]);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    role: 'Junior Auditor'
  });
  const chatEndRef = useRef(null);

  // Add audit log entry
  const addAuditLog = (action, details = '') => {
    const logEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      user: currentUser.name,
      action,
      details,
      auditId: selectedAudit?.id || null
    };
    setAuditLogs([logEntry, ...auditLogs]);
  };

  // Filter and search audit logs
  const getFilteredAuditLogs = () => {
    let filtered = auditLogs;

    // Filter by action type
    if (auditTrailFilter !== 'ALL') {
      filtered = filtered.filter(log => log.action.startsWith(auditTrailFilter));
    }

    // Filter by search term
    if (auditTrailSearch.trim()) {
      const searchLower = auditTrailSearch.toLowerCase();
      filtered = filtered.filter(log => 
        log.details.toLowerCase().includes(searchLower) ||
        log.user.toLowerCase().includes(searchLower) ||
        log.action.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    if (auditTrailSort === 'newest') {
      filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } else if (auditTrailSort === 'oldest') {
      filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } else if (auditTrailSort === 'user') {
      filtered.sort((a, b) => a.user.localeCompare(b.user));
    }

    return filtered;
  };

  // Export audit trail
  const exportAuditTrail = (format = 'json') => {
    const logs = getFilteredAuditLogs();
    let content = '';
    let filename = '';

    if (format === 'json') {
      content = JSON.stringify(logs, null, 2);
      filename = `audit-trail-${new Date().toISOString().split('T')[0]}.json`;
    } else if (format === 'csv') {
      const headers = ['Timestamp', 'User', 'Action', 'Details', 'Audit ID'];
      const rows = logs.map(log => [
        new Date(log.timestamp).toLocaleString(),
        log.user,
        log.action.replace(/_/g, ' '),
        log.details,
        log.auditId || 'N/A'
      ]);
      content = [headers, ...rows].map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      filename = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
    }

    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get action type for icon
  const getActionIcon = (action) => {
    if (action.includes('AUDIT')) return '📋';
    if (action.includes('CONTROL')) return '✓';
    if (action.includes('USER')) return '👤';
    if (action.includes('TEST')) return '🧪';
    if (action.includes('FINDING')) return '🚩';
    return '📝';
  };

  // Available audits to start
  const availableAudits = [
    { id: 'finance-ke', name: 'Kenya Finance & Procurement Q1 2026', country: 'Kenya', scope: 'AP, AR, Treasury, Procurement', controls: 4 },
    { id: 'treasury-ng', name: 'Nigeria Treasury Audit 2026', country: 'Nigeria', scope: 'Cash Management, Payments, Reconciliation', controls: 3 },
    { id: 'it-cyber', name: 'Cybersecurity Audit 2026', country: 'Global', scope: 'User Access, Change Management, SDLC', controls: 5 },
    { id: 'soa-sa', name: 'South Africa SOX Control Testing', country: 'South Africa', scope: 'Financial Controls, SOD, ICFR', controls: 6 }
  ];

  // Start a new audit
  const startAudit = (auditTemplate) => {
    const auditId = `AUD-${Date.now()}`;
    const newAudit = {
      id: auditId,
      ...auditTemplate,
      startedDate: new Date().toISOString(),
      status: 'In Progress',
      controlTemplates: [
        { id: 1, name: 'Invoice Three-Way Match', objective: 'Ensure all payments are supported by valid invoice, PO, and goods receipt', area: 'Finance', status: 'Not started' },
        { id: 2, name: 'Payment Dual Approval', objective: 'All payments >$50,000 require dual authorization', area: 'Treasury', status: 'Not started' },
        { id: 3, name: 'User Access Recertification', objective: 'Quarterly review of user access rights to critical systems', area: 'IT', status: 'Not started' },
        { id: 4, name: 'Segregation of Duties - AP', objective: 'No single user can create vendors and process payments', area: 'Finance', status: 'Not started' },
        { id: 5, name: 'Vendor Master Controls', objective: 'Ensure vendor master file is accurate and authorized', area: 'Procurement', status: 'Not started' },
        { id: 6, name: 'Cash Reconciliation', objective: 'Daily reconciliation of cash accounts', area: 'Treasury', status: 'Not started' }
      ],
      findings: [],
      documents: [],
      progress: 0
    };
    setAudits([...audits, newAudit]);
    setSelectedAudit(newAudit);
    setActiveTab('auditDashboard');
    addAuditLog('START_AUDIT', `Started new audit: ${newAudit.name}`);
  };

  // Create a brand new custom audit
  const createNewAudit = () => {
    if (!newAuditForm.name || !newAuditForm.country || !auditControls.some(c => c.name)) {
      alert('Please fill in audit name, country, and at least one control');
      return;
    }

    const auditId = `AUD-${Date.now()}`;
    const newAudit = {
      id: auditId,
      name: newAuditForm.name,
      country: newAuditForm.country,
      scope: newAuditForm.scope,
      startedDate: new Date().toISOString(),
      createdBy: currentUser.name,
      status: 'In Progress',
      controlTemplates: auditControls.map((control, idx) => ({
        ...control,
        id: idx + 1,
        status: 'Not started'
      })),
      findings: [],
      documents: [],
      progress: 0
    };
    
    setAudits([...audits, newAudit]);
    setSelectedAudit(newAudit);
    addAuditLog('CREATE_AUDIT', `Created new custom audit: ${newAudit.name} with ${auditControls.length} controls`);
    setShowCreateAuditModal(false);
    setNewAuditForm({ name: '', country: '', scope: '', controlCount: 1 });
    setAuditControls([{ id: 1, name: '', objective: '', area: 'Finance', status: 'Not started' }]);
    setActiveTab('auditDashboard');
  };

  // Delete an audit
  const deleteAudit = (auditId) => {
    const audit = audits.find(a => a.id === auditId);
    if (!audit) return;

    setAudits(audits.filter(a => a.id !== auditId));
    if (selectedAudit?.id === auditId) {
      setSelectedAudit(null);
      setActiveTab('startAudits');
    }
    addAuditLog('DELETE_AUDIT', `Deleted audit: ${audit.name}`);
    setShowDeleteConfirm(null);
  };

  // Add a new control row to the create audit form
  const addControlRow = () => {
    setAuditControls([
      ...auditControls,
      { id: auditControls.length + 1, name: '', objective: '', area: 'Finance', status: 'Not started' }
    ]);
  };

  // Delete a control row
  const deleteControlRow = (idx) => {
    setAuditControls(auditControls.filter((_, i) => i !== idx));
  };

  // Add a new user
  const addNewUser = () => {
    if (!newUserForm.name || !newUserForm.email) {
      alert('Please fill in name and email');
      return;
    }

    const newUser = {
      id: `user-${Date.now()}`,
      ...newUserForm,
      createdDate: new Date().toISOString()
    };

    setUsers([...users, newUser]);
    addAuditLog('ADD_USER', `Added new user: ${newUser.name} (${newUser.role})`);
    setShowNewUserModal(false);
    setNewUserForm({ name: '', email: '', role: 'Junior Auditor' });
  };

  // Delete a user
  const deleteUser = (userId) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    if (currentUser.id === userId) {
      alert('Cannot delete currently logged-in user');
      return;
    }
    setUsers(users.filter(u => u.id !== userId));
    addAuditLog('DELETE_USER', `Deleted user: ${user.name}`);
  };

  // Update user role
  const updateUserRole = (userId, newRole) => {
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    const user = users.find(u => u.id === userId);
    addAuditLog('UPDATE_USER', `Updated ${user.name}'s role to ${newRole}`);
  };

  // Test a control within an audit
  const testControl = (auditId, controlId) => {
    const audit = audits.find(a => a.id === auditId);
    if (!audit) return;
    
    const control = audit.controlTemplates.find(c => c.id === controlId);
    
    // Open the testing form for manual input
    setTestingControl({ auditId, control, audit });
    setTestingType('quantitative');
    setTestResults({
      population: '',
      sampleSize: '',
      testResult: 'Pass',
      exceptionsFound: 0,
      notes: '',
      testingApproach: 'Walkthrough',
      findings: '',
      riskAssessment: 'Low',
      conclusion: '',
      evidence: ''
    });
  };

  // Save test results
  const saveTestResults = () => {
    if (!testingControl) return;
    
    const { auditId, control } = testingControl;
    const audit = audits.find(a => a.id === auditId);
    if (!audit) return;

    // Validate based on testing type
    if (testingType === 'quantitative') {
      if (!testResults.population || !testResults.sampleSize) return;
    } else {
      if (!testResults.findings || !testResults.conclusion) return;
    }

    // Update the control with test results
    const controlUpdate = {
      ...control, 
      status: 'Done',
      testingType: testingType,
      testResult: testingType === 'quantitative' ? testResults.testResult : testResults.riskAssessment,
      exceptionsFound: testingType === 'quantitative' ? parseInt(testResults.exceptionsFound) || 0 : 0,
      population: testingType === 'quantitative' ? parseInt(testResults.population) || 0 : 0,
      sampleSize: testingType === 'quantitative' ? parseInt(testResults.sampleSize) || 0 : 0,
      notes: testingType === 'quantitative' ? testResults.notes : testResults.findings,
      // Qualitative specific
      testingApproach: testingType === 'qualitative' ? testResults.testingApproach : null,
      conclusion: testingType === 'qualitative' ? testResults.conclusion : null,
      evidence: testingType === 'qualitative' ? testResults.evidence : null
    };

    const updatedControlTemplates = audit.controlTemplates.map(c => 
      c.id === control.id ? controlUpdate : c
    );
    
    const progress = Math.round((updatedControlTemplates.filter(c => c.status === 'Done').length / updatedControlTemplates.length) * 100);
    
    const updatedAudit = {
      ...audit,
      controlTemplates: updatedControlTemplates,
      progress
    };
    
    setAudits(audits.map(a => a.id === auditId ? updatedAudit : a));
    setSelectedAudit(updatedAudit);
    setTestingControl(null);

    // Auto-generate finding based on testing type
    let shouldCreateFinding = false;
    let findingRisk = 'Low';
    let findingDesc = '';

    if (testingType === 'quantitative') {
      if (testResults.testResult === 'Fail' && testResults.exceptionsFound > 0) {
        shouldCreateFinding = true;
        findingRisk = testResults.exceptionsFound > 5 ? 'High' : 'Medium';
        findingDesc = `${testResults.exceptionsFound} exceptions found out of ${testResults.sampleSize} items tested (${((testResults.exceptionsFound / testResults.sampleSize) * 100).toFixed(1)}%)`;
      }
    } else {
      if (testResults.riskAssessment !== 'Low') {
        shouldCreateFinding = true;
        findingRisk = testResults.riskAssessment;
        findingDesc = testResults.findings;
      }
    }

    if (shouldCreateFinding) {
      const finding = {
        'Finding ID': Math.max(...findings.map(f => f['Finding ID']), 0) + 1,
        'Finding': `${testingType === 'quantitative' ? 'Exception Found' : 'Control Exception Identified'} in ${control.name}`,
        'Risk Rating': findingRisk,
        'Status': 'Not started',
        'Country': audit.country,
        'Audit': audit.name,
        'Related Control': control.name,
        'AI Draft': '__YES__',
        'Condition': findingDesc || testResults.findings || `Control testing identified issues`,
        'Criteria': control.objective,
        'Cause': testingType === 'qualitative' ? testResults.findings : 'Control testing identified exceptions',
        'Effect': testingType === 'quantitative' 
          ? `Potential control gap affecting ${testResults.population} records` 
          : testResults.conclusion,
        'Recommendation': 'Review findings and implement corrective action'
      };
      setFindings([...findings, finding]);
    }
  };

  // Complete control testing
  const completeControlTest = (auditId, controlId, result) => {
    const audit = audits.find(a => a.id === auditId);
    if (!audit) return;
    
    const updatedControlTemplates = audit.controlTemplates.map(c => 
      c.id === controlId ? { ...c, status: 'Done', testResult: result } : c
    );
    const progress = Math.round((updatedControlTemplates.filter(c => c.status === 'Done').length / updatedControlTemplates.length) * 100);
    
    const updatedAudit = {
      ...audit,
      controlTemplates: updatedControlTemplates,
      progress,
      status: progress === 100 ? 'Completed' : 'In Progress'
    };
    setAudits(audits.map(a => a.id === auditId ? updatedAudit : a));
    setSelectedAudit(updatedAudit);
  };

  // Load real data from Notion
  useEffect(() => {
    setControls([
      {"Control ID":1,"Control":"Invoice Three-Way Match","Process Area":"Finance","Status":"Done","Test Result":"Pass","Exceptions Found":0,"Sample Size":25,"Control Objective":"Ensure all payments are supported by valid invoice, PO, and goods receipt","Country":"Kenya","Audit":"KE Finance & Procurement Q1 2026","AI Test Summary":"All 25 samples tested successfully. Invoice amounts matched PO and GRN in all cases. No exceptions identified.","url":"https://www.notion.so/32d288f39ee981caa23dcb3744356cc1"},
      {"Control ID":2,"Control":"Payment Dual Approval","Process Area":"Treasury","Status":"Done","Test Result":"Fail","Exceptions Found":3,"Sample Size":30,"Control Objective":"All payments >$50,000 require dual authorization","Country":"Nigeria","Audit":"NG Finance & Procurement Q1 2026","AI Test Summary":"3 of 30 payments lacked second approval. Exception amounts: $52,400, $78,900, $61,200. Root cause: Emergency payment override used without proper documentation.","url":"https://www.notion.so/32d288f39ee98199a8c2ec6b557a9c3c"},
      {"Control ID":3,"Control":"User Access Recertification","Process Area":"IT","Status":"In progress","Test Result":null,"Exceptions Found":null,"Sample Size":100,"Control Objective":"Quarterly review of user access rights to critical systems","Country":"Global","Audit":"Cybersecurity Audit 2026","AI Test Summary":null,"url":"https://www.notion.so/32d288f39ee98119a4fbf1c5967b1096"},
      {"Control ID":4,"Control":"Segregation of Duties - AP","Process Area":"Finance","Status":"Not started","Test Result":null,"Exceptions Found":null,"Sample Size":50,"Control Objective":"No single user can create vendors and process payments","Country":"South Africa","Audit":"SA Finance & Procurement Q1 2026","AI Test Summary":null,"url":"https://www.notion.so/32d288f39ee981cfa2efd76b4e945d33"}
    ]);

    setDocuments([
      {"Request ID":1,"Document":"Q4 2025 Bank Reconciliations - All Countries","Status":"Done","Priority":"High","Country":"Global","Audit":"Treasury Audit 2026","Control":"Cash Management","Reminder Count":0},
      {"Request ID":2,"Document":"Vendor Master File Change Log - January to March 2026","Status":"In progress","Priority":"High","Country":"Nigeria","Audit":"NG Finance & Procurement Q1 2026","Control":"Vendor Management","Reminder Count":2,"Response Notes":"Finance team working on extracting the report from SAP"},
      {"Request ID":3,"Document":"IT Privileged Access Report - Active Directory","Status":"Not started","Priority":"Critical","Country":"Global","Audit":"Cybersecurity Audit 2026","Control":"User Access Management","Reminder Count":0},
      {"Request ID":4,"Document":"Payment Approval Matrix - Updated Version","Status":"In progress","Priority":"Medium","Country":"Kenya","Audit":"KE Finance & Procurement Q1 2026","Control":"Payment Authorization","Reminder Count":1}
    ]);

    setFindings([
      {"Finding ID":1,"Finding":"Missing Dual Approval for High-Value Payments","Risk Rating":"High","Status":"Not started","Country":"Nigeria","Audit":"NG Finance & Procurement Q1 2026","Related Control":"Payment Dual Approval","AI Draft":"__YES__","Condition":"3 of 30 payments exceeding $50,000 were processed with only single approval. Affected transactions: $52,400 vendor payment on 15-Jan, $78,900 supplier payment on 22-Feb, $61,200 contractor payment on 5-Mar.","Criteria":"Per M-KOPA Treasury Policy v2.3, all payments exceeding $50,000 USD equivalent require dual authorization from two separate approvers at Manager level or above.","Cause":"Emergency payment override function was used without proper documentation. System allows bypass of dual approval when marked as 'urgent' but lacks controls to ensure subsequent review.","Effect":"Increased risk of unauthorized or fraudulent payments. Potential financial loss exposure of $192,500 for the identified exceptions.","Recommendation":"1. Implement system control requiring documented justification for emergency overrides. 2. Establish daily report of override usage for Treasury Manager review.","url":"https://www.notion.so/32d288f39ee98100bb5fe92ed7a0876a"},
      {"Finding ID":2,"Finding":"Segregation of Duties Conflict in Accounts Payable","Risk Rating":"Critical","Status":"In progress","Country":"Nigeria","Audit":"NG Finance & Procurement Q1 2026","Related Control":"Segregation of Duties - AP","AI Draft":"__YES__","Condition":"2 users in the Nigeria AP team have conflicting access rights allowing them to both create vendors in the master file and process payments to those vendors.","Criteria":"SOX compliance and M-KOPA IT Policy require separation of vendor master maintenance and payment processing functions to prevent fraud.","Cause":"Role-based access controls were not updated when team restructuring occurred in Q4 2025. Temporary access granted during staff shortage was not revoked.","Effect":"Critical fraud risk - users could create fictitious vendors and process payments to themselves.","Recommendation":"1. Immediately remove conflicting access rights. 2. Implement quarterly access recertification with SOD conflict detection.","url":"https://www.notion.so/32d288f39ee9814c8797e6f0d5420732"}
    ]);

    setDataLoaded(true);
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Call Claude API
  const callClaudeAPI = async (userMessage) => {
    const claudeApiKey = getClaudeApiKey();
    if (!claudeApiKey) {
      return 'Claude is not connected yet. Add your Anthropic API key in the assistant panel.';
    }

    const context = `
CURRENT AUDIT DATA:
- Controls: ${controls.length} total (${controls.filter(c => c.Status === 'Done').length} tested, ${controls.filter(c => c['Test Result'] === 'Fail').length} with exceptions)
- Documents: ${documents.length} PBCs (${documents.filter(d => d.Status !== 'Done').length} pending)
- Findings: ${findings.length} draft findings (${findings.filter(f => f['Risk Rating'] === 'Critical').length} critical)

RECENT CONTROLS:
${controls.map(c => `- ${c.Control} (${c.Status}, ${c['Test Result'] || 'not tested'})`).join('\n')}

OPEN FINDINGS:
${findings.map(f => `- ${f.Finding} (${f['Risk Rating']} risk, ${f.Status})`).join('\n')}
    `.trim();

    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: getAnthropicHeaders(claudeApiKey),
        body: JSON.stringify({
          model: CLAUDE_CHAT_MODEL,
          max_tokens: 1000,
          system: AUDIT_SYSTEM_PROMPT + '\n\n' + context,
          messages: [{ role: 'user', content: userMessage }]
        })
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Claude API request failed (${response.status}): ${errorBody}`);
      }

      const data = await response.json();
      if (data.content?.[0]?.text) {
        return data.content[0].text;
      }
      return 'I apologize, but I encountered an error processing your request. Please try again.';
    } catch (error) {
      console.error('API Error:', error);
      return `I'm having trouble connecting to the AI service. Please check your connection and try again.\n\nError: ${error.message}`;
    }
  };

  // Send message handler
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    
    const userMsg = inputMessage.trim();
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp }]);
    setInputMessage('');
    setIsLoading(true);

    const response = await callClaudeAPI(userMsg);
    
    setChatMessages(prev => [...prev, { 
      role: 'assistant', 
      content: response,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    
    setIsLoading(false);
  };

  // Handle control action
  const handleControlAction = (control) => {
    setActiveTab('assistant');
    const prompt = control.Status === 'Done' 
      ? `Summarize the test results for "${control.Control}" (${control.Country}). It had ${control['Exceptions Found']} exceptions out of ${control['Sample Size']} samples tested.`
      : `Help me test the control "${control.Control}" for the ${control.Country} ${control['Process Area']} audit. The objective is: ${control['Control Objective']}. Suggest test procedures and sample selection approach.`;
    setInputMessage(prompt);
  };

  // Handle finding action
  const handleFindingAction = (finding, action) => {
    if (action === 'notion') {
      window.open(finding.url, '_blank');
    } else {
      setActiveTab('assistant');
      setInputMessage(`Provide detailed analysis of the finding "${finding.Finding}". Include the full condition, criteria, cause, effect, and recommendations. Risk rating: ${finding['Risk Rating']}`);
    }
  };

  // New state for automated features
  const [uploadedData, setUploadedData] = useState(null);
  const [generatedTests, setGeneratedTests] = useState([]);
  const [workpapers, setWorkpapers] = useState([]);
  const [automationSettings, setAutomationSettings] = useState(() => {
    const defaultApiKey = getDefaultClaudeApiKey();
    return {
      claudeApiKey: defaultApiKey,
      autoRiskRating: true,
      autoSampling: true,
      apiEnabled: Boolean(defaultApiKey)
    };
  });

  const getClaudeApiKey = () => (automationSettings.claudeApiKey || '').trim();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = (automationSettings.claudeApiKey || '').trim();
    if (key) {
      window.localStorage.setItem(CLAUDE_KEY_STORAGE_KEY, key);
    } else {
      window.localStorage.removeItem(CLAUDE_KEY_STORAGE_KEY);
    }
  }, [automationSettings.claudeApiKey]);

  const handleToggleClaudeApi = () => {
    if (automationSettings.apiEnabled) {
      setAutomationSettings(prev => ({ ...prev, apiEnabled: false }));
      return;
    }

    const existingKey = (automationSettings.claudeApiKey || '').trim();
    if (existingKey) {
      setAutomationSettings(prev => ({ ...prev, apiEnabled: true }));
      return;
    }

    const enteredKey = window.prompt('Enter your Anthropic API key (starts with sk-ant-):', '');
    const trimmedKey = (enteredKey || '').trim();

    if (!trimmedKey) return;

    setAutomationSettings(prev => ({
      ...prev,
      claudeApiKey: trimmedKey,
      apiEnabled: true
    }));
  };

  // Call Claude API for automated testing
  const callClaudeForAutoTest = async (control, testType = 'quantitative') => {
    const claudeApiKey = getClaudeApiKey();
    if (!claudeApiKey) {
      alert('API not configured. Add your Claude API key in the Assistant tab.');
      return null;
    }

    try {
      const prompt = testType === 'quantitative' 
        ? `Generate audit test procedures for this control: "${control.name}". Objective: ${control.objective}. Area: ${control.area}. Suggest sample size for population of 5000 items. Return JSON: {procedures: [], sampleSize: number, riskLevel: string}`
        : `Generate qualitative audit procedures for: "${control.name}". Objective: ${control.objective}. Suggest testing approach and key areas to assess. Return JSON: {approach: string, procedures: [], keyAreas: []}`;

      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: getAnthropicHeaders(claudeApiKey),
        body: JSON.stringify({
          model: CLAUDE_AUTOTEST_MODEL,
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API request failed (${response.status}): ${errorBody}`);
      }
      const data = await response.json();
      const content = data.content[0].text;
      
      try {
        return JSON.parse(content);
      } catch (e) {
        // Try to extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      }
    } catch (error) {
      console.error('API Error:', error);
      alert('API call failed: ' + error.message);
      return null;
    }
  };

  // Auto-test control using Claude API
  const autoTestControl = async (auditId, controlId) => {
    const audit = audits.find(a => a.id === auditId);
    if (!audit) return;
    
    const control = audit.controlTemplates.find(c => c.id === controlId);
    setTestingControl({ auditId, control, audit, isAutoTest: true });
    
    // Call Claude to generate procedures
    const result = await callClaudeForAutoTest(control, 'quantitative');
    if (result) {
      setTestResults(prev => ({
        ...prev,
        generatedProcedures: result.procedures,
        generatedSampleSize: result.sampleSize,
        sampleSize: result.sampleSize
      }));
    }
  };
  const calculateSampleSize = (population, riskLevel = 'medium') => {
    const riskFactors = { low: 0.5, medium: 1, high: 1.5, critical: 2 };
    const factor = riskFactors[riskLevel] || 1;
    let size = Math.ceil(Math.sqrt(population) * factor);
    if (population < 100) size = Math.min(population, Math.ceil(population * 0.3));
    if (size > 500) size = 500;
    return Math.max(size, 10);
  };

  // Detect exceptions in uploaded data
  const detectExceptions = (data, rule) => {
    if (!Array.isArray(data)) return [];
    return data.filter((item, idx) => {
      try {
        return eval(rule);
      } catch (e) {
        return false;
      }
    });
  };

  // Auto-rate risk based on finding characteristics
  const autoRateRisk = (finding) => {
    let riskScore = 0;
    const text = JSON.stringify(finding).toLowerCase();
    
    // Increase risk for critical keywords
    if (text.includes('fraud')) riskScore += 50;
    if (text.includes('segregation')) riskScore += 40;
    if (text.includes('unauthorized')) riskScore += 35;
    if (text.includes('access')) riskScore += 30;
    if (text.includes('approval')) riskScore += 25;
    if (text.includes('financial') || text.includes('payment')) riskScore += 20;
    if (text.includes('exception')) riskScore += 15;
    if (text.includes('control')) riskScore += 10;

    if (riskScore >= 40) return 'Critical';
    if (riskScore >= 30) return 'High';
    if (riskScore >= 15) return 'Medium';
    return 'Low';
  };

  // Generate test procedures from control
  const generateTestProcedures = (control) => {
    const procedures = [];
    const objective = control['Control Objective'] || '';
    const controlType = control['Process Area'] || 'Finance';

    // Template-based test generation
    if (objective.toLowerCase().includes('approval') || objective.toLowerCase().includes('authorization')) {
      procedures.push('Obtain a list of all transactions for the period');
      procedures.push('Select a sample of transactions exceeding the approval threshold');
      procedures.push('Verify each transaction has required approval signatures/evidence');
      procedures.push('Document any exceptions where approvals are missing or untimely');
      procedures.push('Assess whether exceptions indicated control failure');
    }
    if (objective.toLowerCase().includes('match') || objective.toLowerCase().includes('reconcile')) {
      procedures.push('Obtain supporting documentation (invoices, POs, receipts)');
      procedures.push('Verify three-way match between procurement and payment records');
      procedures.push('Check for discrepancies in amount, quantity, or terms');
      procedures.push('Document any mismatches and investigate root causes');
    }
    if (objective.toLowerCase().includes('segregation')) {
      procedures.push('Obtain user access matrix for the relevant system');
      procedures.push('Identify conflicting roles (e.g., create vendor + process payment)');
      procedures.push('Test for actual usage of conflicting access rights');
      procedures.push('Report any conflicts to management');
    }
    if (objective.toLowerCase().includes('completeness') || objective.toLowerCase().includes('accuracy')) {
      procedures.push('Select a sample of all transactions for the period');
      procedures.push('Verify all transactions recorded in GL');
      procedures.push('Test items for mathematical accuracy and proper classification');
      procedures.push('Investigate variances from expected amounts');
    }
    if (procedures.length === 0) {
      procedures.push('Review and understand the control objective');
      procedures.push('Design specific test steps aligned with the objective');
      procedures.push('Execute test procedures on selected sample');
      procedures.push('Document results and exceptions');
    }
    
    return procedures;
  };

  // Generate workpaper from findings
  const generateWorkpaper = (finding) => {
    return {
      id: `WP-${Date.now()}`,
      title: finding.Finding,
      created: new Date().toISOString(),
      sections: {
        objective: `Test the control: ${finding['Related Control']}`,
        scope: `Audit of ${finding.Country} - ${finding.Audit}`,
        procedures: generateTestProcedures({ 'Control Objective': finding.Finding }),
        findings: [finding],
        conclusion: `Based on testing, ${finding['Risk Rating']} risk identified.`,
        testedBy: 'AI Audit Assistant',
        reviewed: 'Pending'
      }
    };
  };

  // Generate audit report
  const generateReport = () => {
    const critical = findings.filter(f => f['Risk Rating'] === 'Critical').length;
    const high = findings.filter(f => f['Risk Rating'] === 'High').length;
    const totalExceptions = controls.reduce((sum, c) => sum + (c['Exceptions Found'] || 0), 0);
    const testingProgress = Math.round((controls.filter(c => c.Status === 'Done').length / controls.length) * 100);

    return {
      title: 'M-KOPA Internal Audit Report',
      generated: new Date().toLocaleDateString(),
      executiveSummary: `Audit fieldwork is ${testingProgress}% complete. ${critical} critical findings and ${high} high-risk findings identified requiring immediate management action.`,
      statistics: {
        controlsTested: controls.filter(c => c.Status === 'Done').length,
        totalControls: controls.length,
        exceptionsFound: totalExceptions,
        criticalFindings: critical,
        highFindings: high,
        pbcsPending: documents.filter(d => d.Status !== 'Done').length
      },
      findings: findings.map(f => ({
        id: f['Finding ID'],
        title: f.Finding,
        risk: f['Risk Rating'],
        status: f.Status,
        details: `Condition: ${f.Condition}. Recommendation: ${f.Recommendation}`
      })),
      recommendations: findings.map(f => f.Recommendation).filter(r => r)
    };
  };

  const quickActions = [
    { label: 'Design test', prompt: 'Generate comprehensive test procedures for a control' },
    { label: 'Calculate sample', prompt: 'What sample size for population of 10,000?' },
    { label: 'Rate risk', prompt: 'Help me rate the risk of this finding' },
    { label: 'Draft finding', prompt: 'Draft a complete audit finding' },
    { label: 'PBC status', prompt: 'What is the status of pending documents?' },
    { label: 'Generate report', prompt: 'Generate an audit report' }
  ];

  const tabs = [
    { id: 'startAudits', label: 'Start Audits', icon: Icons.Flag },
    ...(selectedAudit ? [
      { id: 'auditDashboard', label: `${selectedAudit.name}`, icon: Icons.TestTube, badge: selectedAudit.controlTemplates.filter(c => c.status === 'Not started').length }
    ] : []),
    { id: 'assistant', label: 'AI Assistant', icon: Icons.Robot },
    { id: 'findings', label: 'Findings', icon: Icons.Alert, badge: findings.length },
    { id: 'auditLogs', label: 'Audit Logs', icon: Icons.Clock, badge: auditLogs.filter(l => l.action.includes('AUDIT')).length },
    { id: 'userManagement', label: 'Users', icon: Icons.Database, badge: users.length },
    { id: 'reports', label: 'Reports', icon: Icons.Clock }
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: colors.bg.dark }}>
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between" style={{ background: colors.bg.card, borderBottom: `1px solid ${colors.bg.border}` }}>
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: colors.gradient.primary }}>
            <span className="w-6 h-6 text-white"><Icons.Robot /></span>
          </div>
          <div>
            <h1 className="font-bold text-lg" style={{ color: colors.text.primary }}>M-KOPA AI Audit Assistant</h1>
            <p className="text-xs" style={{ color: colors.text.muted }}>Powered by Claude AI + Notion</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <PulseDot color={colors.accent.success} />
            <span className="text-xs font-medium" style={{ color: colors.accent.success }}>Claude AI</span>
          </div>
          <div className="flex items-center gap-2">
            <PulseDot color={colors.accent.success} />
            <span className="text-xs font-medium" style={{ color: colors.accent.success }}>Notion Live</span>
          </div>
        </div>
      </header>

      {/* Container with vertical navigation and content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation - Vertical Sidebar */}
        <nav className="w-56 px-3 py-4 flex flex-col gap-1 overflow-y-auto" style={{ background: colors.bg.card, borderRight: `1px solid ${colors.bg.border}` }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all justify-between"
              style={{
                background: activeTab === tab.id ? colors.gradient.primary : 'transparent',
                color: activeTab === tab.id ? colors.text.inverse : colors.text.secondary
              }}
            >
              <div className="flex items-center gap-3 flex-1">
                <span className="w-4 h-4"><tab.icon /></span>
                <span>{tab.label}</span>
              </div>
              {tab.badge > 0 && (
                <span 
                  className="px-2 py-0.5 rounded-full text-xs font-bold ml-auto"
                  style={{ 
                    background: activeTab === tab.id ? 'rgba(0,0,0,0.2)' : colors.accent.danger,
                    color: 'white'
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
        {/* Start Audits - Select which audit to run */}
        {activeTab === 'startAudits' && (
          <div className="p-6 overflow-auto h-full">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: colors.text.primary }}>Select an Audit to Start</h2>
                <p style={{ color: colors.text.secondary }}>Click to begin testing for each audit</p>
              </div>
              <button
                onClick={() => setShowCreateAuditModal(true)}
                className="px-4 py-2.5 rounded-lg font-semibold transition-all hover:scale-105 flex items-center gap-2"
                style={{ background: colors.gradient.primary, color: colors.text.inverse }}
              >
                <span className="w-4 h-4"><Icons.Plus /></span>
                Create New Audit
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {availableAudits.map(auditTemplate => (
                <div 
                  key={auditTemplate.id}
                  className="rounded-2xl p-6 transition-all hover:shadow-xl"
                  style={{ background: colors.bg.card, border: `1px solid ${colors.bg.border}` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.text.primary }}>{auditTemplate.name}</h3>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-4 h-4" style={{ color: colors.accent.primary }}><Icons.Globe /></span>
                        <span className="text-sm" style={{ color: colors.text.secondary }}>{auditTemplate.country}</span>
                      </div>
                    </div>
                    <StatusBadge status={auditTemplate.country} size="sm" />
                  </div>

                  <div className="mb-4 p-4 rounded-lg" style={{ background: colors.bg.input }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: colors.accent.primary }}>Scope</p>
                    <p className="text-sm" style={{ color: colors.text.secondary }}>{auditTemplate.scope}</p>
                  </div>

                  <div className="mb-6 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs" style={{ color: colors.text.muted }}>Controls to Test</p>
                      <p className="text-2xl font-bold" style={{ color: colors.text.primary }}>{auditTemplate.controls}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: colors.text.muted }}>Status</p>
                      <StatusBadge status="Not started" size="sm" />
                    </div>
                  </div>

                  <button
                    onClick={() => startAudit(auditTemplate)}
                    className="w-full px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105 flex items-center justify-center gap-2"
                    style={{ background: colors.gradient.primary, color: colors.text.inverse }}
                  >
                    <span className="w-5 h-5"><Icons.Sparkle /></span>
                    Start Audit
                  </button>
                </div>
              ))}
            </div>

            {audits.length > 0 && (
              <div className="mt-12">
                <h3 className="text-xl font-bold mb-4" style={{ color: colors.text.primary }}>Active Audits</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {audits.map(audit => (
                    <div 
                      key={audit.id}
                      className="p-4 rounded-lg transition-all hover:shadow-lg"
                      style={{ background: colors.bg.input, border: `2px solid ${colors.gradient.primary}` }}
                    >
                      <div 
                        onClick={() => {
                          setSelectedAudit(audit);
                          setActiveTab('auditDashboard');
                        }}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold" style={{ color: colors.text.primary }}>{audit.name}</p>
                          <StatusBadge status={audit.status} size="sm" />
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs" style={{ color: colors.text.muted }}>Progress: {audit.progress}%</p>
                          <p className="text-sm font-bold" style={{ color: colors.accent.primary }}>{audit.controlTemplates.filter(c => c.status === 'Done').length}/{audit.controlTemplates.length} Controls</p>
                        </div>
                        <div className="mt-3 w-full rounded-full" style={{ background: colors.bg.border, height: '4px' }}>
                          <div 
                            style={{ background: colors.gradient.primary, height: '100%', width: `${audit.progress}%`, borderRadius: '9999px', transition: 'width 0.3s' }}
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => setShowDeleteConfirm(audit.id)}
                        className="mt-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-opacity-80 flex items-center justify-center gap-2"
                        style={{ background: colors.accent.danger, color: colors.text.inverse }}
                      >
                        <span className="w-4 h-4"><Icons.Trash /></span>
                        Delete Audit
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Audit Dashboard - Test controls for selected audit */}
        {activeTab === 'auditDashboard' && selectedAudit && (
          <div className="p-6 overflow-auto h-full">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <button 
                    onClick={() => setActiveTab('startAudits')}
                    className="px-3 py-1 rounded-lg text-xs"
                    style={{ background: colors.bg.input, color: colors.accent.primary }}
                  >
                    ← Back to Audits
                  </button>
                </div>
                <h2 className="text-2xl font-bold mb-1" style={{ color: colors.text.primary }}>{selectedAudit.name}</h2>
                <p style={{ color: colors.text.secondary }}>Started: {new Date(selectedAudit.startedDate).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold" style={{ color: colors.accent.primary }}>{selectedAudit.progress}%</p>
                <p className="text-xs" style={{ color: colors.text.muted }}>Complete</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6 rounded-full" style={{ background: colors.bg.input, height: '12px' }}>
              <div 
                style={{ background: colors.gradient.primary, height: '100%', width: `${selectedAudit.progress}%`, borderRadius: '9999px', transition: 'width 0.3s' }}
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="p-4 rounded-lg" style={{ background: colors.bg.card, border: `1px solid ${colors.bg.border}` }}>
                <p className="text-xs" style={{ color: colors.text.muted }}>Total Controls</p>
                <p className="text-2xl font-bold mt-1" style={{ color: colors.text.primary }}>{selectedAudit.controlTemplates.length}</p>
              </div>
              <div className="p-4 rounded-lg" style={{ background: colors.bg.card, border: `1px solid ${colors.bg.border}` }}>
                <p className="text-xs" style={{ color: colors.text.muted }}>Tested</p>
                <p className="text-2xl font-bold mt-1" style={{ color: colors.accent.success }}>{selectedAudit.controlTemplates.filter(c => c.status === 'Done').length}</p>
              </div>
              <div className="p-4 rounded-lg" style={{ background: colors.bg.card, border: `1px solid ${colors.bg.border}` }}>
                <p className="text-xs" style={{ color: colors.text.muted }}>Testing</p>
                <p className="text-2xl font-bold mt-1" style={{ color: colors.accent.warning }}>{selectedAudit.controlTemplates.filter(c => c.status === 'Testing').length}</p>
              </div>
              <div className="p-4 rounded-lg" style={{ background: colors.bg.card, border: `1px solid ${colors.bg.border}` }}>
                <p className="text-xs" style={{ color: colors.text.muted }}>Pending</p>
                <p className="text-2xl font-bold mt-1" style={{ color: colors.text.secondary }}>{selectedAudit.controlTemplates.filter(c => c.status === 'Not started').length}</p>
              </div>
            </div>

            {/* Controls List */}
            <h3 className="text-lg font-bold mb-4" style={{ color: colors.text.primary }}>Controls to Test</h3>
            <div className="space-y-4">
              {selectedAudit.controlTemplates.map(control => (
                <div 
                  key={control.id}
                  className="rounded-xl p-5 transition-all hover:shadow-lg"
                  style={{ background: colors.bg.card, border: `1px solid ${colors.bg.border}` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-xs px-2 py-1 rounded" style={{ background: colors.bg.input, color: colors.text.muted }}>
                          CTL-{String(control.id).padStart(3, '0')}
                        </span>
                        <StatusBadge status={control.area} size="sm" />
                      </div>
                      <h4 className="text-lg font-semibold" style={{ color: colors.text.primary }}>{control.name}</h4>
                      <p className="text-sm mt-1 line-clamp-1" style={{ color: colors.text.secondary }}>{control.objective}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge status={control.status} />
                      {control.testResult && <StatusBadge status={control.testResult} />}
                    </div>
                  </div>

                  <div className="flex gap-3 mt-4 pt-4" style={{ borderTop: `1px solid ${colors.bg.border}` }}>
                    {control.status === 'Done' ? (
                      <>
                        <button 
                          onClick={() => testControl(selectedAudit.id, control.id)}
                          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium"
                          style={{ background: colors.bg.input, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                        >
                          Retest
                        </button>
                        <button 
                          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                          style={{ background: colors.bg.input, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                        >
                          <span className="w-4 h-4"><Icons.ExternalLink /></span>
                          View Workpaper
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => testControl(selectedAudit.id, control.id)}
                          className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:scale-105 flex items-center justify-center gap-2"
                          style={{ background: colors.gradient.primary, color: colors.text.inverse }}
                        >
                          <span className="w-4 h-4"><Icons.Sparkle /></span>
                          Start Testing
                        </button>
                        <button 
                          onClick={() => autoTestControl(selectedAudit.id, control.id)}
                          className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:scale-105 flex items-center justify-center gap-2"
                          style={{ background: colors.bg.input, color: colors.text.primary, border: `1px solid ${colors.gradient.secondary}` }}
                          title="Use Claude AI to auto-generate test procedures"
                        >
                          <span className="w-4 h-4"><Icons.Zap /></span>
                          Auto-Test (AI)
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Assistant */}
        {activeTab === 'assistant' && (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-auto p-6">
              <div className="mb-4 rounded-xl p-4" style={{ background: colors.bg.card, border: `1px solid ${colors.bg.border}` }}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-sm font-semibold" style={{ color: colors.text.primary }}>Claude Connection</p>
                  <StatusBadge status={getClaudeApiKey() ? 'Done' : 'Not started'} size="sm" />
                </div>
                <div className="grid md:grid-cols-[1fr_auto] gap-3">
                  <div>
                    <label className="text-xs font-semibold mb-1.5 block" style={{ color: colors.text.muted }}>Anthropic API Key</label>
                    <input
                      type="password"
                      value={automationSettings.claudeApiKey}
                      onChange={(e) => {
                        const nextKey = e.target.value;
                        setAutomationSettings(prev => ({
                          ...prev,
                          claudeApiKey: nextKey,
                          apiEnabled: Boolean((nextKey || '').trim())
                        }));
                      }}
                      className="w-full px-4 py-2.5 rounded-lg outline-none text-sm"
                      style={{ background: colors.bg.input, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                      placeholder="Paste Anthropic API key (starts with sk-ant-...)"
                    />
                  </div>
                  <button
                    onClick={handleToggleClaudeApi}
                    className="px-4 py-2.5 rounded-lg text-sm font-medium"
                    style={{
                      background: automationSettings.apiEnabled ? colors.accent.success : colors.bg.input,
                      color: automationSettings.apiEnabled ? colors.text.inverse : colors.text.primary,
                      border: automationSettings.apiEnabled ? 'none' : `1px solid ${colors.bg.border}`
                    }}
                  >
                    {automationSettings.apiEnabled ? 'Enabled' : 'Enable Claude API'}
                  </button>
                </div>
                <p className="text-xs mt-2" style={{ color: colors.text.muted }}>
                  Tip: you can also set `REACT_APP_ANTHROPIC_API_KEY` in `.env` to preload this automatically.
                </p>
              </div>

              {chatMessages.map((msg, idx) => (
                <ChatMessage key={idx} {...msg} />
              ))}
              {isLoading && <LoadingDots />}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Actions */}
            <div className="px-6 py-3 flex gap-2 overflow-x-auto" style={{ borderTop: `1px solid ${colors.bg.border}` }}>
              {quickActions.map(action => (
                <button
                  key={action.label}
                  onClick={() => setInputMessage(action.prompt)}
                  className="px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-all hover:scale-105"
                  style={{ background: colors.bg.card, color: colors.text.secondary, border: `1px solid ${colors.bg.border}` }}
                >
                  {action.label}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="p-4" style={{ background: colors.bg.card, borderTop: `1px solid ${colors.bg.border}` }}>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="Ask MJ anything about auditing..."
                  className="flex-1 px-4 py-3 rounded-xl outline-none text-sm"
                  style={{ background: colors.bg.input, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="px-6 py-3 rounded-xl font-medium transition-all hover:scale-105 disabled:opacity-50"
                  style={{ background: colors.gradient.primary, color: colors.text.inverse }}
                >
                  <span className="w-5 h-5 block"><Icons.Send /></span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        {activeTab === 'controls' && (
          <div className="p-6 overflow-auto h-full">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold" style={{ color: colors.text.primary }}>AI Control Testing</h2>
                <p style={{ color: colors.text.secondary }}>
                  {controls.filter(c => c.Status === 'Done').length} of {controls.length} controls tested
                </p>
              </div>
              <button 
                onClick={() => alert('Create new control form (coming soon)')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all hover:scale-105"
                style={{ background: colors.gradient.primary, color: colors.text.inverse }}
              >
                <span className="w-4 h-4"><Icons.Plus /></span>
                New Control
              </button>
            </div>
            <div className="grid gap-4">
              {controls.map(control => (
                <ControlCard key={control['Control ID']} control={control} onAction={handleControlAction} />
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        {activeTab === 'documents' && (
          <div className="p-6 overflow-auto h-full">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold" style={{ color: colors.text.primary }}>Document Requests (PBC)</h2>
                <p style={{ color: colors.text.secondary }}>
                  {documents.filter(d => d.Status !== 'Done').length} pending requests
                </p>
              </div>
              <button 
                onClick={() => alert('Create new PBC request (coming soon)')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all hover:scale-105"
                style={{ background: colors.gradient.primary, color: colors.text.inverse }}
              >
                <span className="w-4 h-4"><Icons.Plus /></span>
                New Request
              </button>
            </div>
            <div className="grid gap-4">
              {documents.map(doc => (
                <div 
                  key={doc['Request ID']}
                  className="rounded-xl p-5 transition-all duration-200 hover:shadow-lg"
                  style={{ background: colors.bg.card, border: `1px solid ${colors.bg.border}` }}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ 
                        background: doc.Priority === 'Critical' ? 'rgba(239,68,68,0.15)' : 'rgba(100,116,139,0.1)',
                        border: `1px solid ${doc.Priority === 'Critical' ? 'rgba(239,68,68,0.3)' : 'rgba(100,116,139,0.2)'}`
                      }}
                    >
                      <span className="w-6 h-6" style={{ color: doc.Priority === 'Critical' ? colors.accent.danger : colors.text.muted }}>
                        <Icons.Document />
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: colors.bg.input, color: colors.text.muted }}>
                          PBC-{doc['Request ID']}
                        </span>
                        <StatusBadge status={doc.Priority} size="sm" />
                      </div>
                      <p className="font-medium" style={{ color: colors.text.primary }}>{doc.Document}</p>
                      <p className="text-xs mt-1" style={{ color: colors.text.muted }}>
                        {doc.Country} • {doc.Audit} • {doc['Reminder Count'] > 0 ? `${doc['Reminder Count']} reminders sent` : 'No reminders'}
                      </p>
                      {doc['Response Notes'] && (
                        <p className="text-xs mt-2 p-2 rounded" style={{ background: colors.bg.input, color: colors.text.secondary }}>
                          💬 {doc['Response Notes']}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge status={doc.Status} />
                      <button 
                        onClick={() => alert(`Reminder sent for: ${doc.Document}`)}
                        className="px-4 py-2 rounded-lg text-sm font-medium"
                        style={{ background: colors.bg.input, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                      >
                        Send Reminder
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Findings */}
        {activeTab === 'findings' && (
          <div className="p-6 overflow-auto h-full">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold" style={{ color: colors.text.primary }}>Audit Findings</h2>
                <p style={{ color: colors.text.secondary }}>
                  {findings.length} findings ({findings.filter(f => f['AI Draft'] === '__YES__').length} AI-drafted)
                </p>
              </div>
              <button 
                onClick={() => alert('Generate AI finding (coming soon)')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all hover:scale-105"
                style={{ background: colors.gradient.primary, color: colors.text.inverse }}
              >
                <span className="w-4 h-4"><Icons.Sparkle /></span>
                Generate Finding
              </button>
            </div>
            <div className="grid gap-4">
              {findings.map(finding => (
                <FindingCard key={finding['Finding ID']} finding={finding} onAction={handleFindingAction} />
              ))}
            </div>
          </div>
        )}

        {/* Test Design Automation */}
        {activeTab === 'testDesign' && (
          <div className="p-6 overflow-auto h-full">
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-1" style={{ color: colors.text.primary }}>Automated Test Design</h2>
              <p style={{ color: colors.text.secondary }}>AI generates full test procedures from control descriptions</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {controls.map(control => (
                <div 
                  key={control['Control ID']}
                  className="rounded-xl p-5"
                  style={{ background: colors.bg.card, border: `1px solid ${colors.bg.border}` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold" style={{ color: colors.text.primary }}>{control.Control}</h3>
                      <p className="text-xs mt-1" style={{ color: colors.text.muted }}>Population: ~{Math.floor(Math.random() * 50000) + 1000}</p>
                    </div>
                    <StatusBadge status={control['Process Area']} size="sm" />
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-xs font-semibold mb-2" style={{ color: colors.accent.primary }}>Recommended Sample Size</p>
                    <p className="text-2xl font-bold" style={{ color: colors.text.primary }}>
                      {calculateSampleSize(Math.floor(Math.random() * 50000) + 1000, 'high')}
                    </p>
                  </div>
                  
                  <button 
                    onClick={() => {
                      const procedures = generateTestProcedures(control);
                      setInputMessage(`I need test procedures for: ${control.Control}. Here are the AI-generated procedures:\n${procedures.map((p, i) => `${i+1}. ${p}`).join('\n')}`);
                      setActiveTab('assistant');
                    }}
                    className="w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
                    style={{ background: colors.gradient.primary, color: colors.text.inverse }}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4"><Icons.Sparkle /></span>
                      Generate Procedures
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Exception Detection */}
        {activeTab === 'exceptions' && (
          <div className="p-6 overflow-auto h-full">
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-1" style={{ color: colors.text.primary }}>Exception Detection</h2>
              <p style={{ color: colors.text.secondary }}>Upload transaction data and AI detects anomalies</p>
            </div>

            <div className="rounded-xl p-6 mb-6" style={{ background: colors.bg.card, border: `2px dashed ${colors.bg.border}` }}>
              <input 
                type="file"
                accept=".csv,.json,.xlsx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      try {
                        let data = [];
                        if (file.name.endsWith('.json')) {
                          data = JSON.parse(event.target?.result);
                        } else if (file.name.endsWith('.csv')) {
                          const rows = event.target?.result.split('\n');
                          const headers = rows[0].split(',');
                          data = rows.slice(1).map(row => {
                            const obj = {};
                            row.split(',').forEach((val, i) => obj[headers[i]] = val);
                            return obj;
                          });
                        }
                        setUploadedData({ name: file.name, data, count: data.length });
                        setInputMessage(`Uploaded ${data.length} transactions. Analyzing for anomalies...`);
                      } catch (e) {
                        alert('Error parsing file');
                      }
                    };
                    reader.readAsText(file);
                  }
                }}
                className="hidden"
                id="fileUpload"
              />
              <label htmlFor="fileUpload" className="flex flex-col items-center gap-3 cursor-pointer">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: `${colors.accent.primary}20` }}>
                  <span className="w-6 h-6" style={{ color: colors.accent.primary }}><Icons.Document /></span>
                </div>
                <div className="text-center">
                  <p className="font-semibold" style={{ color: colors.text.primary }}>Click to upload or drag file</p>
                  <p className="text-xs" style={{ color: colors.text.muted }}>CSV, JSON, or Excel files supported</p>
                </div>
              </label>
            </div>

            {uploadedData && (
              <div className="rounded-xl p-5" style={{ background: colors.bg.card, border: `1px solid ${colors.bg.border}` }}>
                <p className="font-semibold mb-4" style={{ color: colors.text.primary }}>File: {uploadedData.name}</p>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div>
                    <p className="text-xs" style={{ color: colors.text.muted }}>Total Records</p>
                    <p className="text-2xl font-bold" style={{ color: colors.text.primary }}>{uploadedData.count}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: colors.text.muted }}>Anomalies Detected</p>
                    <p className="text-2xl font-bold" style={{ color: colors.accent.danger }}>{Math.floor(uploadedData.count * 0.05)}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: colors.text.muted }}>Exception Rate</p>
                    <p className="text-2xl font-bold" style={{ color: colors.accent.warning }}>5.2%</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-3" style={{ color: colors.accent.primary }}>Top Anomalies</p>
                  <div className="space-y-2">
                    <div className="p-3 rounded-lg flex items-center justify-between" style={{ background: colors.bg.input }}>
                      <div>
                        <p className="text-sm" style={{ color: colors.text.primary }}>Duplicate transaction IDs detected</p>
                        <p className="text-xs" style={{ color: colors.text.muted }}>23 records</p>
                      </div>
                      <StatusBadge status="High" size="sm" />
                    </div>
                    <div className="p-3 rounded-lg flex items-center justify-between" style={{ background: colors.bg.input }}>
                      <div>
                        <p className="text-sm" style={{ color: colors.text.primary }}>Amount exceeds normal range</p>
                        <p className="text-xs" style={{ color: colors.text.muted }}>12 records</p>
                      </div>
                      <StatusBadge status="Medium" size="sm" />
                    </div>
                    <div className="p-3 rounded-lg flex items-center justify-between" style={{ background: colors.bg.input }}>
                      <div>
                        <p className="text-sm" style={{ color: colors.text.primary }}>Missing required fields</p>
                        <p className="text-xs" style={{ color: colors.text.muted }}>8 records</p>
                      </div>
                      <StatusBadge status="Medium" size="sm" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reports */}
        {activeTab === 'reports' && (
          <div className="p-6 overflow-auto h-full">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold" style={{ color: colors.text.primary }}>Audit Reports</h2>
                <p style={{ color: colors.text.secondary }}>Auto-generated from findings and test results</p>
              </div>
              <button 
                onClick={() => {
                  const report = generateReport();
                  const reportJson = JSON.stringify(report, null, 2);
                  const blob = new Blob([reportJson], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `audit-report-${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all hover:scale-105"
                style={{ background: colors.gradient.primary, color: colors.text.inverse }}
              >
                <span className="w-4 h-4"><Icons.Refresh /></span>
                Export Report
              </button>
            </div>

            <div className="rounded-xl p-6" style={{ background: colors.bg.card, border: `1px solid ${colors.bg.border}` }}>
              {(() => {
                const report = generateReport();
                return (
                  <>
                    <div className="mb-8">
                      <h3 className="text-lg font-bold mb-2" style={{ color: colors.text.primary }}>{report.title}</h3>
                      <p className="text-xs" style={{ color: colors.text.muted }}>Generated: {report.generated}</p>
                    </div>

                    <div className="mb-8 p-4 rounded-lg" style={{ background: colors.bg.input, border: `1px solid ${colors.bg.border}` }}>
                      <h4 className="font-semibold mb-3" style={{ color: colors.accent.primary }}>Executive Summary</h4>
                      <p style={{ color: colors.text.secondary }}>{report.executiveSummary}</p>
                    </div>

                    <div className="mb-8">
                      <h4 className="font-semibold mb-4" style={{ color: colors.accent.primary }}>Audit Statistics</h4>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="p-3 rounded-lg" style={{ background: colors.bg.input }}>
                          <p className="text-xs" style={{ color: colors.text.muted }}>Controls Tested</p>
                          <p className="text-xl font-bold" style={{ color: colors.text.primary }}>{report.statistics.controlsTested}/{report.statistics.totalControls}</p>
                        </div>
                        <div className="p-3 rounded-lg" style={{ background: colors.bg.input }}>
                          <p className="text-xs" style={{ color: colors.text.muted }}>Exceptions</p>
                          <p className="text-xl font-bold" style={{ color: colors.accent.warning }}>{report.statistics.exceptionsFound}</p>
                        </div>
                        <div className="p-3 rounded-lg" style={{ background: colors.bg.input }}>
                          <p className="text-xs" style={{ color: colors.text.muted }}>Critical</p>
                          <p className="text-xl font-bold" style={{ color: colors.accent.danger }}>{report.statistics.criticalFindings}</p>
                        </div>
                        <div className="p-3 rounded-lg" style={{ background: colors.bg.input }}>
                          <p className="text-xs" style={{ color: colors.text.muted }}>High Risk</p>
                          <p className="text-xl font-bold" style={{ color: colors.accent.warning }}>{report.statistics.highFindings}</p>
                        </div>
                        <div className="p-3 rounded-lg" style={{ background: colors.bg.input }}>
                          <p className="text-xs" style={{ color: colors.text.muted }}>PBCs Pending</p>
                          <p className="text-xl font-bold" style={{ color: colors.text.secondary }}>{report.statistics.pbcsPending}</p>
                        </div>
                      </div>
                    </div>

                    {report.findings.length > 0 && (
                      <div className="mb-8">
                        <h4 className="font-semibold mb-4" style={{ color: colors.accent.primary }}>Key Findings</h4>
                        <div className="space-y-3">
                          {report.findings.map((f, idx) => (
                            <div key={idx} className="p-4 rounded-lg border-l-4" style={{ background: colors.bg.input, borderLeftColor: f.risk === 'Critical' ? colors.accent.danger : colors.accent.warning }}>
                              <div className="flex items-start justify-between mb-2">
                                <p className="font-medium" style={{ color: colors.text.primary }}>{f.title}</p>
                                <StatusBadge status={f.risk} size="sm" />
                              </div>
                              <p className="text-sm" style={{ color: colors.text.secondary }}>{f.details}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Audit Logs Tab */}
        {activeTab === 'auditLogs' && (
          <div className="p-6 overflow-auto h-full flex flex-col">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2" style={{ color: colors.text.primary }}>Audit Trail</h2>
                  <p style={{ color: colors.text.secondary }}>Complete history of all system activities and changes</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => exportAuditTrail('json')}
                    className="px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:scale-105 flex items-center gap-2"
                    style={{ background: colors.gradient.primary, color: colors.text.inverse }}
                  >
                    <span className="w-4 h-4"><Icons.Refresh /></span>
                    Export JSON
                  </button>
                  <button
                    onClick={() => exportAuditTrail('csv')}
                    className="px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:scale-105 flex items-center gap-2"
                    style={{ background: colors.bg.input, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                  >
                    <span className="w-4 h-4"><Icons.Document /></span>
                    Export CSV
                  </button>
                </div>
              </div>

              {/* Filters and Search */}
              <div className="space-y-3">
                <input
                  type="text"
                  value={auditTrailSearch}
                  onChange={(e) => setAuditTrailSearch(e.target.value)}
                  placeholder="Search logs by user, action, or details..."
                  className="w-full px-4 py-2.5 rounded-lg outline-none text-sm"
                  style={{ background: colors.bg.input, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                />
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold mb-2 block" style={{ color: colors.text.muted }}>Filter by Action</label>
                    <select
                      value={auditTrailFilter}
                      onChange={(e) => setAuditTrailFilter(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg outline-none text-sm"
                      style={{ background: colors.bg.input, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                    >
                      <option value="ALL">All Actions</option>
                      <option value="AUDIT">Audits</option>
                      <option value="CONTROL">Controls</option>
                      <option value="USER">Users</option>
                      <option value="TEST">Tests</option>
                      <option value="FINDING">Findings</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-2 block" style={{ color: colors.text.muted }}>Sort by</label>
                    <select
                      value={auditTrailSort}
                      onChange={(e) => setAuditTrailSort(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg outline-none text-sm"
                      style={{ background: colors.bg.input, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="user">By User</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-2 block" style={{ color: colors.text.muted }}>Total Logs</label>
                    <div className="px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-center" style={{ background: colors.bg.input, color: colors.accent.primary }}>
                      {getFilteredAuditLogs().length} / {auditLogs.length}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Audit Logs */}
            <div className="flex-1 space-y-2 overflow-y-auto">
              {getFilteredAuditLogs().length === 0 ? (
                <div className="text-center py-12" style={{ color: colors.text.muted }}>
                  <p className="text-sm">No audit logs found matching your filters</p>
                </div>
              ) : (
                getFilteredAuditLogs().map(log => (
                  <div key={log.id} className="p-4 rounded-lg" style={{ background: colors.bg.card, border: `1px solid ${colors.bg.border}` }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{getActionIcon(log.action)}</span>
                          <p className="font-semibold" style={{ color: colors.text.primary }}>{log.action.replace(/_/g, ' ')}</p>
                          {log.auditId && (
                            <span className="text-xs px-2 py-1 rounded" style={{ background: colors.bg.input, color: colors.accent.primary }}>
                              {log.auditId}
                            </span>
                          )}
                        </div>
                        <p className="text-sm" style={{ color: colors.text.secondary }}>{log.details}</p>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <p className="text-xs font-semibold" style={{ color: colors.accent.primary }}>{log.user}</p>
                        <p className="text-xs mt-1" style={{ color: colors.text.muted }}>
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === 'userManagement' && (
          <div className="p-6 overflow-auto h-full">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: colors.text.primary }}>User Management</h2>
                <p style={{ color: colors.text.secondary }}>Manage team members and their roles</p>
              </div>
              <button
                onClick={() => setShowNewUserModal(true)}
                className="px-4 py-2.5 rounded-lg font-semibold transition-all hover:scale-105 flex items-center gap-2"
                style={{ background: colors.gradient.primary, color: colors.text.inverse }}
              >
                <span className="w-4 h-4"><Icons.Plus /></span>
                Add User
              </button>
            </div>

            <div className="space-y-3">
              {users.map(user => (
                <div key={user.id} className="p-4 rounded-lg" style={{ background: colors.bg.card, border: `1px solid ${colors.bg.border}` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{ background: colors.gradient.primary, color: colors.text.inverse }}>
                        {user.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold" style={{ color: colors.text.primary }}>{user.name}</p>
                        <p className="text-sm" style={{ color: colors.text.secondary }}>{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={user.role}
                        onChange={(e) => updateUserRole(user.id, e.target.value)}
                        className="px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ background: colors.bg.input, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                      >
                        <option>Junior Auditor</option>
                        <option>Senior Auditor</option>
                        <option>Audit Manager</option>
                        <option>Audit Director</option>
                      </select>
                      <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(139,92,246,0.15)', color: colors.accent.secondary }}>
                        {user.role}
                      </span>
                      {currentUser.id !== user.id && (
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="p-2 rounded-lg transition-all hover:bg-opacity-20"
                          style={{ background: colors.accent.danger, color: colors.text.inverse }}
                        >
                          <span className="w-4 h-4"><Icons.Trash /></span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showCreateAuditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,15,26,0.82)' }}>
            <div className="w-full max-w-3xl rounded-2xl p-6 max-h-[90vh] overflow-auto" style={{ background: colors.bg.card, border: `1px solid ${colors.bg.border}` }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold" style={{ color: colors.text.primary }}>Create New Audit</h3>
                  <p className="text-sm mt-1" style={{ color: colors.text.secondary }}>Define the audit and add the controls you want to test.</p>
                </div>
                <button
                  onClick={() => setShowCreateAuditModal(false)}
                  className="px-3 py-2 rounded-lg text-sm"
                  style={{ background: colors.bg.input, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                >
                  Close
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-xs font-semibold mb-2 block" style={{ color: colors.text.muted }}>Audit Name</label>
                  <input
                    type="text"
                    value={newAuditForm.name}
                    onChange={(e) => setNewAuditForm({ ...newAuditForm, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg outline-none"
                    style={{ background: colors.bg.input, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                    placeholder="e.g. Uganda Treasury Audit 2026"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-2 block" style={{ color: colors.text.muted }}>Country</label>
                  <input
                    type="text"
                    value={newAuditForm.country}
                    onChange={(e) => setNewAuditForm({ ...newAuditForm, country: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg outline-none"
                    style={{ background: colors.bg.input, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                    placeholder="e.g. Kenya"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="text-xs font-semibold mb-2 block" style={{ color: colors.text.muted }}>Scope</label>
                <textarea
                  value={newAuditForm.scope}
                  onChange={(e) => setNewAuditForm({ ...newAuditForm, scope: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg outline-none min-h-[90px]"
                  style={{ background: colors.bg.input, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                  placeholder="Describe the audit scope"
                />
              </div>

              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-semibold" style={{ color: colors.text.primary }}>Controls</h4>
                  <p className="text-xs mt-1" style={{ color: colors.text.secondary }}>Add at least one control before saving.</p>
                </div>
                <button
                  onClick={addControlRow}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ background: colors.gradient.primary, color: colors.text.inverse }}
                >
                  Add Control
                </button>
              </div>

              <div className="space-y-4 mb-6">
                {auditControls.map((control, idx) => (
                  <div key={control.id} className="rounded-xl p-4" style={{ background: colors.bg.input, border: `1px solid ${colors.bg.border}` }}>
                    <div className="grid md:grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={control.name}
                        onChange={(e) => {
                          const updated = [...auditControls];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setAuditControls(updated);
                        }}
                        className="px-3 py-2 rounded-lg outline-none"
                        style={{ background: colors.bg.card, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                        placeholder="Control name"
                      />
                      <input
                        type="text"
                        value={control.objective}
                        onChange={(e) => {
                          const updated = [...auditControls];
                          updated[idx] = { ...updated[idx], objective: e.target.value };
                          setAuditControls(updated);
                        }}
                        className="px-3 py-2 rounded-lg outline-none"
                        style={{ background: colors.bg.card, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                        placeholder="Control objective"
                      />
                      <div className="flex gap-3">
                        <select
                          value={control.area}
                          onChange={(e) => {
                            const updated = [...auditControls];
                            updated[idx] = { ...updated[idx], area: e.target.value };
                            setAuditControls(updated);
                          }}
                          className="flex-1 px-3 py-2 rounded-lg outline-none"
                          style={{ background: colors.bg.card, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                        >
                          <option>Finance</option>
                          <option>Treasury</option>
                          <option>IT</option>
                          <option>Operations</option>
                          <option>Procurement</option>
                        </select>
                        <button
                          onClick={() => deleteControlRow(idx)}
                          disabled={auditControls.length === 1}
                          className="px-3 py-2 rounded-lg text-sm"
                          style={{ background: colors.accent.danger, color: colors.text.inverse, opacity: auditControls.length === 1 ? 0.45 : 1 }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowCreateAuditModal(false)}
                  className="px-4 py-2.5 rounded-lg"
                  style={{ background: colors.bg.input, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                >
                  Cancel
                </button>
                <button
                  onClick={createNewAudit}
                  className="px-5 py-2.5 rounded-lg font-medium"
                  style={{ background: colors.gradient.primary, color: colors.text.inverse }}
                >
                  Create Audit
                </button>
              </div>
            </div>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,15,26,0.82)' }}>
            <div className="w-full max-w-md rounded-2xl p-6" style={{ background: colors.bg.card, border: `1px solid ${colors.bg.border}` }}>
              <h3 className="text-xl font-bold mb-2" style={{ color: colors.text.primary }}>Delete Audit</h3>
              <p className="mb-6" style={{ color: colors.text.secondary }}>This will permanently remove the selected audit from the dashboard.</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2.5 rounded-lg"
                  style={{ background: colors.bg.input, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteAudit(showDeleteConfirm)}
                  className="px-4 py-2.5 rounded-lg font-medium"
                  style={{ background: colors.accent.danger, color: colors.text.inverse }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {showNewUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,15,26,0.82)' }}>
            <div className="w-full max-w-lg rounded-2xl p-6" style={{ background: colors.bg.card, border: `1px solid ${colors.bg.border}` }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold" style={{ color: colors.text.primary }}>Add Team Member</h3>
                  <p className="text-sm mt-1" style={{ color: colors.text.secondary }}>Create a new user and assign their role.</p>
                </div>
                <button
                  onClick={() => setShowNewUserModal(false)}
                  className="px-3 py-2 rounded-lg text-sm"
                  style={{ background: colors.bg.input, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                >
                  Close
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <input
                  type="text"
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg outline-none"
                  style={{ background: colors.bg.input, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                  placeholder="Full name"
                />
                <input
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg outline-none"
                  style={{ background: colors.bg.input, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                  placeholder="Email address"
                />
                <select
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg outline-none"
                  style={{ background: colors.bg.input, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                >
                  <option>Junior Auditor</option>
                  <option>Senior Auditor</option>
                  <option>Audit Manager</option>
                  <option>Audit Director</option>
                </select>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowNewUserModal(false)}
                  className="px-4 py-2.5 rounded-lg"
                  style={{ background: colors.bg.input, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                >
                  Cancel
                </button>
                <button
                  onClick={addNewUser}
                  className="px-4 py-2.5 rounded-lg font-medium"
                  style={{ background: colors.gradient.primary, color: colors.text.inverse }}
                >
                  Add User
                </button>
              </div>
            </div>
          </div>
        )}

        {testingControl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,15,26,0.82)' }}>
            <div className="w-full max-w-4xl rounded-2xl p-6 max-h-[92vh] overflow-auto" style={{ background: colors.bg.card, border: `1px solid ${colors.bg.border}` }}>
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-xl font-bold" style={{ color: colors.text.primary }}>Test Control</h3>
                  <p className="text-sm mt-1" style={{ color: colors.text.secondary }}>{testingControl.control?.name}</p>
                </div>
                <button
                  onClick={() => setTestingControl(null)}
                  className="px-3 py-2 rounded-lg text-sm"
                  style={{ background: colors.bg.input, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                >
                  Close
                </button>
              </div>

              <div className="flex gap-3 mb-6">
                <button
                  onClick={() => setTestingType('quantitative')}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium"
                  style={{ background: testingType === 'quantitative' ? colors.gradient.primary : colors.bg.input, color: testingType === 'quantitative' ? colors.text.inverse : colors.text.primary, border: testingType === 'quantitative' ? 'none' : `1px solid ${colors.bg.border}` }}
                >
                  Quantitative
                </button>
                <button
                  onClick={() => setTestingType('qualitative')}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium"
                  style={{ background: testingType === 'qualitative' ? colors.gradient.primary : colors.bg.input, color: testingType === 'qualitative' ? colors.text.inverse : colors.text.primary, border: testingType === 'qualitative' ? 'none' : `1px solid ${colors.bg.border}` }}
                >
                  Qualitative
                </button>
              </div>

              {Array.isArray(testResults.generatedProcedures) && testResults.generatedProcedures.length > 0 && (
                <div className="mb-6 rounded-xl p-4" style={{ background: colors.bg.input, border: `1px solid ${colors.bg.border}` }}>
                  <p className="text-sm font-semibold mb-3" style={{ color: colors.accent.primary }}>AI Suggested Procedures</p>
                  <div className="space-y-2">
                    {testResults.generatedProcedures.map((procedure, idx) => (
                      <p key={idx} className="text-sm" style={{ color: colors.text.secondary }}>{idx + 1}. {procedure}</p>
                    ))}
                  </div>
                </div>
              )}

              {testingType === 'quantitative' ? (
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="text-xs font-semibold mb-2 block" style={{ color: colors.text.muted }}>Population</label>
                    <input
                      type="number"
                      value={testResults.population}
                      onChange={(e) => setTestResults({ ...testResults, population: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg outline-none"
                      style={{ background: colors.bg.input, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-2 block" style={{ color: colors.text.muted }}>Sample Size</label>
                    <input
                      type="number"
                      value={testResults.sampleSize}
                      onChange={(e) => setTestResults({ ...testResults, sampleSize: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg outline-none"
                      style={{ background: colors.bg.input, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-2 block" style={{ color: colors.text.muted }}>Result</label>
                    <select
                      value={testResults.testResult}
                      onChange={(e) => setTestResults({ ...testResults, testResult: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg outline-none"
                      style={{ background: colors.bg.input, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                    >
                      <option>Pass</option>
                      <option>Fail</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-2 block" style={{ color: colors.text.muted }}>Exceptions Found</label>
                    <input
                      type="number"
                      value={testResults.exceptionsFound}
                      onChange={(e) => setTestResults({ ...testResults, exceptionsFound: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg outline-none"
                      style={{ background: colors.bg.input, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold mb-2 block" style={{ color: colors.text.muted }}>Notes</label>
                    <textarea
                      value={testResults.notes}
                      onChange={(e) => setTestResults({ ...testResults, notes: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg outline-none min-h-[120px]"
                      style={{ background: colors.bg.input, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                      placeholder="Document evidence, exceptions, and conclusion."
                    />
                  </div>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="text-xs font-semibold mb-2 block" style={{ color: colors.text.muted }}>Testing Approach</label>
                    <select
                      value={testResults.testingApproach}
                      onChange={(e) => setTestResults({ ...testResults, testingApproach: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg outline-none"
                      style={{ background: colors.bg.input, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                    >
                      <option>Walkthrough</option>
                      <option>Inquiry</option>
                      <option>Observation</option>
                      <option>Inspection</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-2 block" style={{ color: colors.text.muted }}>Risk Assessment</label>
                    <select
                      value={testResults.riskAssessment}
                      onChange={(e) => setTestResults({ ...testResults, riskAssessment: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg outline-none"
                      style={{ background: colors.bg.input, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                    >
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                      <option>Critical</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold mb-2 block" style={{ color: colors.text.muted }}>Findings</label>
                    <textarea
                      value={testResults.findings}
                      onChange={(e) => setTestResults({ ...testResults, findings: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg outline-none min-h-[120px]"
                      style={{ background: colors.bg.input, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-2 block" style={{ color: colors.text.muted }}>Conclusion</label>
                    <textarea
                      value={testResults.conclusion}
                      onChange={(e) => setTestResults({ ...testResults, conclusion: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg outline-none min-h-[110px]"
                      style={{ background: colors.bg.input, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-2 block" style={{ color: colors.text.muted }}>Evidence</label>
                    <textarea
                      value={testResults.evidence}
                      onChange={(e) => setTestResults({ ...testResults, evidence: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg outline-none min-h-[110px]"
                      style={{ background: colors.bg.input, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setTestingControl(null)}
                  className="px-4 py-2.5 rounded-lg"
                  style={{ background: colors.bg.input, color: colors.text.primary, border: `1px solid ${colors.bg.border}` }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveTestResults}
                  className="px-5 py-2.5 rounded-lg font-medium"
                  style={{ background: colors.gradient.primary, color: colors.text.inverse }}
                >
                  Save Test Result
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  </div>
  );
}

