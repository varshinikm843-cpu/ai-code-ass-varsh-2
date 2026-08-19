import React, { useState } from 'react';

function App() {
  const [activeMode, setActiveMode] = useState('full-scan');
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(`function calculateTotalOrder(cartItems, taxRate, shippingFee) {
  let subtotal = 0;

  // Sum up the price of all items
  cartItems.forEach(item => {
    subtotal += item.price;
  });

  // Apply the tax rate and add shipping
  let totalTax = subtotal * taxRate;
  let finalTotal = subtotal + totalTax + shippingFee;

  return finalTotal;
}

// Test Case: Free shipping offer!
const cart = [
  { name: "Book", price: 15 },
  { name: "Shirt", price: 25 }
];

// Tax rate is 10% (0.10), shipping fee is 0 (Free shipping)
const orderTotal = calculateTotalOrder(cart, 0.10, 0);

console.log("Your total is: $" + orderTotal);`);
  
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const modes = [
    { id: 'full-scan', label: '⚡ Full Scan' },
    { id: 'explain', label: '📖 Explain Code' },
    { id: 'bugs', label: '🐛 Analyze Bugs' },
    { id: 'fix', label: '🔧 Suggest Fix' },
    { id: 'ast', label: '🔍 Structure Only (AST)' },
  ];

  const handleAnalyze = async () => {
    if (!code.trim()) {
      setError('Please enter some code to analyze.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('http://localhost:8000/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          mode: activeMode,
          language: language,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      console.log('Backend response:', data); // Helps debug in browser console
      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to communicate with backend');
    } finally {
      setLoading(false);
    }
  };

  // Helper to safely extract AI text regardless of key name used in backend
  const getAiText = (data) => {
    if (!data) return '';
    if (typeof data === 'string') return data;
    return (
      data.llm_analysis ||
      data.analysis ||
      data.response ||
      data.message ||
      data.result ||
      JSON.stringify(data, null, 2)
    );
  };

  // Helper to extract AST structure
  const getAstData = (data) => {
    if (!data) return null;
    return data.ast_metrics || data.ast || data.structure || null;
  };

  return (
    <div style={styles.appContainer}>
      {/* LEFT SIDEBAR */}
      <aside style={styles.sidebar}>
        <div style={styles.brandHeader}>
          <div style={styles.brandTitle}>⚡ AI Code Assistant</div>
          <div style={styles.brandSubtitle}>3-Layer Verification Studio</div>
        </div>

        <div style={styles.navSectionLabel}>ANALYSIS MODES</div>

        <nav style={styles.navContainer}>
          {modes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              style={{
                ...styles.navItem,
                ...(activeMode === mode.id ? styles.activeNavItem : {}),
              }}
            >
              {mode.label}
            </button>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          Stack: FastAPI • PyFlakes • Multi-Lang Engine
        </div>
      </aside>

      {/* RIGHT MAIN CONTENT AREA */}
      <main style={styles.mainContent}>
        <div style={styles.headerTitle}>
          {activeMode.toUpperCase().replace('-', ' ')} OUTPUT ({language.toUpperCase()})
        </div>

        <div style={styles.topHint}>
          Select language, paste code below, and click "Analyze"
        </div>

        <div style={styles.workspaceGrid}>
          {/* Input Panel */}
          <div style={styles.editorPanel}>
            <div style={styles.panelHeader}>
              <div style={styles.langSelectorContainer}>
                <label style={styles.langLabel}>Language:</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  style={styles.selectInput}
                >
                  <option value="javascript">JavaScript 📜</option>
                  <option value="python">Python 🐍</option>
                  <option value="java">Java ☕</option>
                  <option value="cpp">C++ ⚡</option>
                </select>
              </div>
            </div>

            <textarea
              placeholder={`Paste your ${language.toUpperCase()} code here...`}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={styles.codeTextarea}
            />

            <div style={styles.actionRow}>
              <button
                onClick={handleAnalyze}
                disabled={loading}
                style={loading ? { ...styles.analyzeBtn, opacity: 0.6 } : styles.analyzeBtn}
              >
                {loading ? 'Analyzing...' : 'Analyze ▸'}
              </button>
            </div>
          </div>

          {/* Output Panel */}
          <div style={styles.outputPanel}>
            <div style={styles.panelTitle}>Results & Insights</div>

            {error && <div style={styles.errorBanner}>❌ Error: {error}</div>}

            {!result && !loading && !error && (
              <div style={styles.emptyState}>
                💡 Click "Analyze ▸" to generate response.
              </div>
            )}

            {loading && (
              <div style={styles.loadingState}>
                ⏳ Analyzing code & querying Groq LLM...
              </div>
            )}

            {result && (
              <div style={styles.resultsContainer}>
                {/* AST Output if present */}
                {getAstData(result) && (
                  <div style={styles.astBox}>
                    <div style={styles.astBoxHeader}>🌳 Structural AST Metrics</div>
                    <pre style={{ margin: 0, fontSize: '13px', whiteSpace: 'pre-wrap' }}>
                      {typeof getAstData(result) === 'object'
                        ? JSON.stringify(getAstData(result), null, 2)
                        : getAstData(result)}
                    </pre>
                  </div>
                )}

                {/* Main AI Insights Output */}
                <div style={styles.aiSectionHeader}>💡 AI Assistant Analysis</div>
                <div style={styles.aiOutputBox}>
                  <pre style={styles.aiOutputPre}>{getAiText(result)}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  appContainer: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#eef2f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    overflow: 'hidden',
  },
  sidebar: {
    width: '260px',
    backgroundColor: '#1e293b',
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    boxSizing: 'border-box',
    flexShrink: 0,
  },
  brandHeader: {
    marginBottom: '32px',
  },
  brandTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#38bdf8',
  },
  brandSubtitle: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '4px',
  },
  navSectionLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: '0.05em',
    marginBottom: '12px',
  },
  navContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flexGrow: 1,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 14px',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    color: '#cbd5e1',
    border: 'none',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    textAlign: 'left',
  },
  activeNavItem: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontWeight: '600',
  },
  sidebarFooter: {
    fontSize: '11px',
    color: '#64748b',
    lineHeight: '1.4',
    borderTop: '1px solid #334155',
    paddingTop: '16px',
  },
  mainContent: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 32px',
    overflowY: 'auto',
  },
  headerTitle: {
    textAlign: 'center',
    fontSize: '16px',
    fontWeight: '700',
    color: '#475569',
    letterSpacing: '0.05em',
  },
  topHint: {
    textAlign: 'center',
    fontSize: '13px',
    color: '#64748b',
    margin: '8px 0 24px 0',
  },
  workspaceGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    flexGrow: 1,
    minHeight: 0,
  },
  editorPanel: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  langSelectorContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  langLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#475569',
  },
  selectInput: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    backgroundColor: '#f8fafc',
    cursor: 'pointer',
  },
  codeTextarea: {
    flexGrow: 1,
    width: '100%',
    fontFamily: 'Consolas, Monaco, "Fira Code", monospace',
    fontSize: '13px',
    padding: '14px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    resize: 'none',
    boxSizing: 'border-box',
    marginBottom: '16px',
    minHeight: '300px',
  },
  actionRow: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  analyzeBtn: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  outputPanel: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    overflowY: 'auto',
  },
  panelTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '16px',
    borderBottom: '2px solid #f1f5f9',
    paddingBottom: '8px',
  },
  emptyState: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: '60px',
    fontSize: '14px',
  },
  loadingState: {
    color: '#2563eb',
    textAlign: 'center',
    marginTop: '60px',
    fontSize: '14px',
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '14px',
    border: '1px solid #fecaca',
  },
  resultsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  astBox: {
    backgroundColor: '#eff6ff',
    borderLeft: '4px solid #2563eb',
    padding: '12px 16px',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#1e3a8a',
  },
  astBoxHeader: {
    fontWeight: '700',
    fontSize: '14px',
    marginBottom: '6px',
  },
  aiSectionHeader: {
    fontWeight: '700',
    fontSize: '15px',
    color: '#0f172a',
    marginTop: '8px',
  },
  aiOutputBox: {
    backgroundColor: '#f8fafc',
    padding: '14px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  aiOutputPre: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#334155',
    margin: 0,
  },
};

export default App;