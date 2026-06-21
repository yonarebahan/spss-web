'use client';

import { useState, useCallback } from 'react';
import FileUpload from '@/components/FileUpload';
import ResultsDisplay from '@/components/ResultsDisplay';
import { loadPyodideEngine, runAnalysis } from '@/lib/pyodide-engine';

type Step = 'upload' | 'confirm' | 'running' | 'results';

const ALL_TESTS = [
  'validity', 'reliability', 'normality', 'multicollinearity',
  'heteroscedasticity', 'autocorrelation', 'regression', 'f_test',
  't_test', 'r_squared'
];

/** Auto-detect X (totals) and Y (last total) from column names */
function autoDetectVariables(columns: string[], numericColumns: string[], rows: Record<string, any>[]) {
  // Find item groups: columns ending with digits (K1, K2, M1, etc.)
  const itemPattern = /^(.+?)(\d+)$/;
  const itemPrefixes = new Set<string>();
  const itemCols: string[] = [];

  for (const col of numericColumns) {
    const match = col.match(itemPattern);
    if (match) {
      itemPrefixes.add(match[1].toLowerCase());
      itemCols.push(col);
    }
  }

  // Total columns = numeric columns that are NOT items
  const totalCols = numericColumns.filter(c => !itemCols.includes(c));

  // Try to match totals to item group prefixes
  // e.g., group "k" → total "Kepemimpinan", group "kp" → total "Kinerja"
  const matched: { iv: string[]; dv: string } = { iv: [], dv: '' };

  if (totalCols.length >= 2 && itemPrefixes.size > 0) {
    // Sort totals: DV is usually the last one in column order
    const sortedTotals = [...totalCols].sort((a, b) => {
      const ia = columns.indexOf(a);
      const ib = columns.indexOf(b);
      return ia - ib;
    });
    matched.iv = sortedTotals.slice(0, -1);
    matched.dv = sortedTotals[sortedTotals.length - 1];
  } else if (numericColumns.length >= 2) {
    // Fallback: last numeric = DV, rest = IV
    matched.iv = numericColumns.slice(0, -1);
    matched.dv = numericColumns[numericColumns.length - 1];
  }

  return {
    ivCols: matched.iv,
    dvCol: matched.dv,
    itemCount: itemCols.length,
    groupCount: itemPrefixes.size,
    totalCols,
    autoDetected: matched.iv.length > 0 && !!matched.dv
  };
}

export default function Home() {
  const [step, setStep] = useState<Step>('upload');
  const [pyodideReady, setPyodideReady] = useState(false);
  const [pyodideLoading, setPyodideLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState('');
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [fileName, setFileName] = useState('');
  const [ivCols, setIvCols] = useState<string[]>([]);
  const [dvCol, setDvCol] = useState('');
  const [detected, setDetected] = useState<any>(null);
  const [results, setResults] = useState<any>(null);
  const [analysisError, setAnalysisError] = useState('');

  const initPyodide = useCallback(async () => {
    if (pyodideReady || pyodideLoading) return;
    setPyodideLoading(true);
    setLoadProgress('Memuat Python runtime...');
    try {
      await loadPyodideEngine();
      setPyodideReady(true);
      setLoadProgress('');
    } catch (err: any) {
      setLoadProgress(`Error: ${err.message}`);
    } finally {
      setPyodideLoading(false);
    }
  }, [pyodideReady, pyodideLoading]);

  const handleFileLoaded = async (fileData: Record<string, any>[], name: string) => {
    setData(fileData);
    setFileName(name);

    const cols = Object.keys(fileData[0] || {});
    const numCols = cols.filter(col =>
      fileData.some(row => !isNaN(parseFloat(row[col])) && row[col] !== '')
    );

    // Auto-detect variables
    const det = autoDetectVariables(cols, numCols, fileData);
    setDetected(det);
    setIvCols(det.ivCols);
    setDvCol(det.dvCol);
    setAnalysisError('');

    if (det.autoDetected) {
      setStep('confirm');
    } else {
      // Couldn't auto-detect — show error
      setAnalysisError('Tidak bisa deteksi otomatis. Pastikan data punya kolom numerik X dan Y.');
      setStep('confirm');
    }

    initPyodide();
  };

  const handleAnalyze = async () => {
    setStep('running');
    setAnalysisError('');

    try {
      if (!pyodideReady) {
        setLoadProgress('Memuat Python runtime (pertama kali ~15-30 detik)...');
        await loadPyodideEngine();
        setPyodideReady(true);
      }
      setLoadProgress('Menjalankan 10 uji statistik...');
      const analysisResults = await runAnalysis(data, ivCols, dvCol, ALL_TESTS);
      setResults(analysisResults);
      setStep('results');
    } catch (err: any) {
      setAnalysisError(`Error: ${err.message}`);
      setStep('confirm');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      <header style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)',
        color: 'white', padding: '20px 24px', textAlign: 'center'
      }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 800 }}>
          📊 SPSS Web
        </h1>
        <p style={{ margin: 0, fontSize: 14, opacity: 0.85 }}>
          Upload data skripsi → Langsung dapat hasil analisis lengkap
        </p>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>
        <div className="step-indicator" style={{ paddingTop: 20 }}>
          {['Upload Data', 'Konfirmasi', 'Hasil'].map((label, i) => {
            const si = { upload: 0, confirm: 1, running: 1, results: 2 }[step];
            return (
              <div key={label} style={{ textAlign: 'center', flex: 1 }}>
                <div className={`step-dot ${i < si ? 'done' : i === si ? 'active' : ''}`} />
                <span style={{ fontSize: 11, color: i <= si ? '#1e40af' : '#94a3b8', marginTop: 4, display: 'block' }}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px 40px' }}>
        {step === 'upload' && (
          <FileUpload onFileLoaded={handleFileLoaded} />
        )}

        {step === 'confirm' && detected && (
          <div className="card">
            {analysisError && (
              <div style={{
                padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 8, color: '#dc2626', fontSize: 14, marginBottom: 16
              }}>
                ⚠️ {analysisError}
              </div>
            )}

            <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>✅ Variabel Terdeteksi</h2>
            <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 16px' }}>
              File: <strong>{fileName}</strong> — {data.length} responden, {detected.itemCount} item, {detected.groupCount} grup
            </p>

            <div style={{
              background: '#f0f9ff', padding: 16, borderRadius: 8,
              border: '1px solid #bae6fd', marginBottom: 12
            }}>
              <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600 }}>
                🔵 Variabel X (Independen):
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ivCols.map(c => (
                  <span key={c} style={{
                    padding: '4px 12px', background: '#dbeafe', borderRadius: 6,
                    fontSize: 13, fontWeight: 600, color: '#1e40af'
                  }}>{c}</span>
                ))}
              </div>
            </div>

            <div style={{
              background: '#fefce8', padding: 16, borderRadius: 8,
              border: "1px solid #fde68a", marginBottom: 20
            }}>
              <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600 }}>
                🟠 Variabel Y (Dependen):
              </p>
              <span style={{
                padding: '4px 12px', background: '#fef3c7', borderRadius: 6,
                fontSize: 13, fontWeight: 600, color: '#92400e'
              }}>{dvCol}</span>
            </div>

            <div style={{
              background: '#f8fafc', padding: 12, borderRadius: 8,
              border: '1px solid #e2e8f0', marginBottom: 20, fontSize: 12, color: '#64748b'
            }}>
              <strong>Uji yang akan dijalankan:</strong> Validitas, Reliabilitas, Normalitas, Multikolinearitas,
              Heteroskedastisitas, Autokorelasi, Regresi, Uji F, Uji t, R²
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-secondary" onClick={() => setStep('upload')}>
                ← Upload Ulang
              </button>
              <button className="btn-primary" onClick={handleAnalyze}>
                🔍 Analisis Sekarang
              </button>
            </div>
          </div>
        )}

        {step === 'running' && (
          <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
            <div className="spinner" style={{ margin: '0 auto 20px' }} />
            <h3 style={{ margin: '0 0 8px' }}>{loadProgress || 'Menganalisis data...'}</h3>
            <p style={{ color: '#64748b', fontSize: 14 }}>
              {pyodideReady
                ? 'Menjalankan 10 uji statistik...'
                : 'Pertama kali memuat Python runtime (~20MB). Akan di-cache.'}
            </p>
          </div>
        )}

        {step === 'results' && results && (
          <ResultsDisplay
            results={results}
            ivCols={ivCols}
            dvCol={dvCol}
            onBack={() => setStep('confirm')}
            onRestart={() => {
              setStep('upload');
              setData([]);
              setIvCols([]);
              setDvCol('');
              setDetected(null);
              setResults(null);
            }}
          />
        )}
      </main>

      <footer style={{
        textAlign: 'center', padding: '16px 20px', color: '#94a3b8', fontSize: 12,
        borderTop: '1px solid #e2e8f0', background: 'white'
      }}>
        SPSS Web — Hasil sama dengan SPSS. Menggunakan scipy di browser via Pyodide.
      </footer>
    </div>
  );
}
