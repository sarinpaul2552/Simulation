/**
 * PHASE 1B DIAGNOSTIC SUITE PAGE
 * 
 * Displays results from running all diagnostic strategies through
 * the production engine with full observability.
 */

import { useState } from 'react';
import { runDiagnosticSuite, DiagnosticSuiteResults } from '../utils/diagnosticSuite';
import '../testlab.css';

export default function DiagnosticSuite() {
  const [results, setResults] = useState<DiagnosticSuiteResults | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunDiagnostics = async () => {
    setIsRunning(true);
    setError(null);
    setResults(null);

    try {
      console.log('\n' + '='.repeat(100));
      console.log('PHASE 1B DIAGNOSTIC SUITE');
      console.log('='.repeat(100));
      console.log('Running diagnostic strategies through production engine...\n');

      const suiteResults = await runDiagnosticSuite();
      setResults(suiteResults);

      console.log('\n' + '='.repeat(100));
      console.log('DIAGNOSTIC SUITE COMPLETE');
      console.log('='.repeat(100));
      console.log('\n' + suiteResults.summaryTable);
      console.log(suiteResults.financialBreakdown);
      console.log(suiteResults.executionTraces);
      if (suiteResults.cashLedgers.length > 0) {
        console.log(suiteResults.cashLedgers);
      }
      console.log(suiteResults.consoleExport);
    } catch (err: any) {
      const errorMessage = err?.message || String(err);
      console.error('Diagnostic Error:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsRunning(false);
    }
  };

  if (isRunning) {
    return (
      <div className="testlab-page">
        <h2>Phase 1B Diagnostic Suite</h2>
        <div className="loading">
          <p>Running diagnostic strategies...</p>
          <p style={{ fontSize: '12px', color: '#666' }}>Check browser console for real-time progress</p>
        </div>
      </div>
    );
  }

  return (
    <div className="testlab-page">
      <h2>Phase 1B Diagnostic Suite Runner</h2>
      
      <div className="description">
        <p>
          <strong>Purpose:</strong> Run all diagnostic strategies through the production engine and capture
          authoritative runtime values for terminal scoring, execution alignment, and cash accounting.
        </p>
        <p>
          <strong>Strategies:</strong> Balanced + Leadership Aligned, Enterprise 100%, AI 100%, People 100%, Cash 100%
        </p>
        <p>
          <strong>Output:</strong> Summary table, execution traces, cash ledgers, and console export.
          Results are observational—no expected verdicts, no pre-judgment.
        </p>
        <p>
          <strong>No changes:</strong> Uses existing presets and production engine exactly as-is. Observability only.
        </p>
      </div>

      <button 
        onClick={handleRunDiagnostics} 
        disabled={isRunning}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          backgroundColor: '#0066cc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        Run Diagnostic Suite
      </button>

      {error && (
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#fee', 
          border: '1px solid #f00', 
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {results && (
        <div>
          <h3>Results ({results.timestamp})</h3>
          
          {/* Summary Table */}
          <div style={{ marginBottom: '40px' }}>
            <pre style={{
              backgroundColor: '#f5f5f5',
              padding: '12px',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '12px',
              fontFamily: 'monospace'
            }}>
              {results.summaryTable}
            </pre>
          </div>

          {/* Financial Breakdown */}
          <div style={{ marginBottom: '40px' }}>
            <pre style={{
              backgroundColor: '#f5f5f5',
              padding: '12px',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '12px',
              fontFamily: 'monospace'
            }}>
              {results.financialBreakdown}
            </pre>
          </div>

          {/* Execution Traces */}
          <div style={{ marginBottom: '40px' }}>
            <pre style={{
              backgroundColor: '#f5f5f5',
              padding: '12px',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '12px',
              fontFamily: 'monospace'
            }}>
              {results.executionTraces}
            </pre>
          </div>

          {/* Cash Ledgers */}
          {results.cashLedgers.length > 0 && (
            <div style={{ marginBottom: '40px' }}>
              <pre style={{
                backgroundColor: '#f5f5f5',
                padding: '12px',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '12px',
                fontFamily: 'monospace'
              }}>
                {results.cashLedgers}
              </pre>
            </div>
          )}

          {/* Console Export */}
          <div style={{ marginBottom: '40px' }}>
            <h4>Console Export (Copy to DevTools Console)</h4>
            <pre style={{
              backgroundColor: '#f0f0f0',
              padding: '12px',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '11px',
              fontFamily: 'monospace',
              maxHeight: '300px'
            }}>
              {results.consoleExport}
            </pre>
            <button
              onClick={() => {
                navigator.clipboard.writeText(results.consoleExport);
                alert('Console export copied to clipboard');
              }}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                backgroundColor: '#666',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: '8px'
              }}
            >
              Copy to Clipboard
            </button>
          </div>

          <p style={{ fontSize: '12px', color: '#666' }}>
            ℹ️ Full results also printed to browser console. Check DevTools Console tab.
          </p>
        </div>
      )}
    </div>
  );
}
