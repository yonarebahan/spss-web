'use client';

import { useState, useEffect, useCallback } from 'react';
import FileUpload from '@/components/FileUpload';
import VariableSelector from '@/components/VariableSelector';
import TestSelector from '@/components/TestSelector';
import ResultsDisplay from '@/components/ResultsDisplay';
import { loadPyodideEngine, runAnalysis, getDataInfo } from '@/lib/pyodide-engine';

type Step = 'upload' | 'variables' | 'tests' | 'running' | 'results';

export default function Home() {
  const [step, setStep] = useState<Step>('upload');
  const [pyodideReady, setPyodideReady] = useState(false);
  const [pyodideLoading, setPyodideLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState('');
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [fileName, setFileName] = useState('');
  const [columns, setColumns] = useState<string[]>([]);
  const [numericColumns, setNumericColumns] = useState<string[]>([]);
  const [ivCols, setIvCols] = useState<string[]>([]);
  const [dvCol, setDvCol] = useState('');
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [results, setResults] = useState<any>(null);
  const [analysisError, setAnalysisError] = useState('');
  const [dataPreview, setDataPreview] = useState<Record<string, any>[]>([]);

  const stepIndex = { upload: 0, variables: 1, tests: 2, running: 2, results: 3 }[step];

  // Pre-load Pyodide after file upload for faster analysis
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

    // Detect columns
    const cols = Object.keys(fileData[0] || {});
    setColumns(cols);

    // Detect numeric columns
    const numCols = cols.filter(col => {
      return fileData.some(row => !isNaN(parseFloat(row[col])) && row[col] !== '');
    });
    setNumericColumns(numCols);
    setDataPreview(fileData.slice(0, 5));
    setStep('variables');

    // Start loading Pyodide in background
    initPyodide();
  };

  const handleVariablesComplete = (ivs: string[], dv: string) => {
    setIvCols(ivs);
    setDvCol(dv);
    setStep('tests');
  };

  const handleTestsComplete = async (tests: string[]) => {
    setSelectedTests(tests);
    setStep('running');
    setAnalysisError('');

    try {
      if (!pyodideReady) {
        setLoadProgress('Memuat Python runtime (pertama kali ~15-30 detik)...');
        await loadPyodideEngine();
        setPyodideReady(true);
      }

      setLoadProgress('Menjalankan analisis...');
      const analysisResults = await runAnalysis(data, ivCols, dvCol, tests);
      setResults(analysisResults);
      setStep('results');
    } catch (err: any) {
      setAnalysisError(`Error: ${err.message}`);
      setStep('tests');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)',
        color: 'white', padding: '20px 24px', textAlign: 'center'
      }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>
          📊 SPSS Web
        </h1>
        <p style={{ margin: 0, fontSize: 14, opacity: 0.85 }}>
          Analisis Statistik Penelitian — Gratis, Akurat, Tanpa Install
        </p>
      </header>

      {/* Progress */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>
        <div className="step-indicator" style={{ paddingTop: 20 }}>
          {['Upload Data', 'Pilih Variabel', 'Pilih Uji', 'Hasil'].map((label, i) => (
            <div key={label} style={{ textAlign: 'center', flex: 1 }}>
              <div className={`step-dot ${i < stepIndex ? 'done' : i === stepIndex ? 'active' : ''}`} />
              <span style={{ fontSize: 11, color: i <= stepIndex ? '#1e40af' : '#94a3b8', marginTop: 4, display: 'block' }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px 40px' }}>
        {step === 'upload' && (
          <FileUpload onFileLoaded={handleFileLoaded} />
        )}

        {step === 'variables' && (
          <>
            {/* Data preview */}
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>
                📄 Preview Data: {fileName}
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="spss-table">
                  <thead>
                    <tr>
                      {columns.map(col => <th key={col}>{col}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {dataPreview.map((row, i) => (
                      <tr key={i}>
                        {columns.map(col => <td key={col}>{row[col]}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#64748b' }}>
                Total: {data.length} baris × {columns.length} kolom ({numericColumns.length} numerik)
              </p>
            </div>

            <VariableSelector
              columns={columns}
              numericColumns={numericColumns}
              onSelectionComplete={handleVariablesComplete}
              onBack={() => setStep('upload')}
            />
          </>
        )}

        {step === 'tests' && (
          <>
            {analysisError && (
              <div style={{
                padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 8, color: '#dc2626', fontSize: 14, marginBottom: 16
              }}>
                ⚠️ {analysisError}
              </div>
            )}
            <TestSelector
              onSelectionComplete={handleTestsComplete}
              onBack={() => setStep('variables')}
            />
          </>
        )}

        {step === 'running' && (
          <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
            <div className="spinner" style={{ margin: '0 auto 20px' }} />
            <h3 style={{ margin: '0 0 8px' }}>{loadProgress || 'Menganalisis data...'}</h3>
            <p style={{ color: '#64748b', fontSize: 14 }}>
              {pyodideReady
                ? 'Menjalankan uji statistik...'
                : 'Pertama kali memuat Python runtime (~20MB). Akan di-cache untuk kunjungan berikutnya.'
              }
            </p>
            <div style={{
              marginTop: 20, padding: '12px 16px', background: '#f8fafc',
              borderRadius: 8, fontSize: 12, color: '#64748b', textAlign: 'left', maxWidth: 400, margin: '20px auto 0'
            }}>
              <strong>Yang sedang diproses:</strong>
              <ul style={{ margin: '8px 0 0', paddingLeft: 16 }}>
                {selectedTests.map(t => <li key={t}>{t}</li>)}
              </ul>
            </div>
          </div>
        )}

        {step === 'results' && results && (
          <ResultsDisplay
            results={results}
            ivCols={ivCols}
            dvCol={dvCol}
            onBack={() => setStep('tests')}
            onRestart={() => {
              setStep('upload');
              setData([]);
              setColumns([]);
              setNumericColumns([]);
              setIvCols([]);
              setDvCol('');
              setSelectedTests([]);
              setResults(null);
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center', padding: '16px 20px', color: '#94a3b8', fontSize: 12,
        borderTop: '1px solid #e2e8f0', background: 'white'
      }}>
        SPSS Web — Hasil sama dengan SPSS. Menggunakan scipy & statsmodels di browser via Pyodide.
      </footer>
    </div>
  );
}
