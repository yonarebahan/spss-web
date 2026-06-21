'use client';

import { useState } from 'react';

interface VariableSelectorProps {
  columns: string[];
  numericColumns: string[];
  dataPreview: Record<string, any>[];
  fileName: string;
  onSelectionComplete: (ivCols: string[], dvCol: string) => void;
  onBack: () => void;
}

export default function VariableSelector({ columns, numericColumns, dataPreview, fileName, onSelectionComplete, onBack }: VariableSelectorProps) {
  const [ivCols, setIvCols] = useState<string[]>([]);
  const [dvCol, setDvCol] = useState('');

  const toggleIv = (col: string) => {
    if (col === dvCol) return;
    setIvCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
  };

  const selectDv = (col: string) => {
    if (ivCols.includes(col)) return;
    setDvCol(col);
  };

  return (
    <div className="card">
      {/* Data preview */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>
          📄 {fileName} — {dataPreview.length > 0 ? `${dataPreview.length}+ baris, ${columns.length} kolom` : ''}
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="spss-table">
            <thead>
              <tr>{columns.map(col => <th key={col}>{col}</th>)}</tr>
            </thead>
            <tbody>
              {dataPreview.slice(0, 3).map((row, i) => (
                <tr key={i}>{columns.map(col => <td key={col}>{row[col]}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>📋 Pilih Variabel Penelitian</h2>
      <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 20px' }}>
        Pilih variabel <strong>X</strong> (independen) dan <strong>Y</strong> (dependen). Semua uji statistik akan otomatis dijalankan.
      </p>

      {/* IV Selection */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, margin: '0 0 12px', color: '#1e40af' }}>
          🔵 Variabel X (Independen) — Pilih 1 atau lebih
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {numericColumns.map(col => (
            <button
              key={col}
              onClick={() => toggleIv(col)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: ivCols.includes(col) ? '2px solid #1e40af' : '1px solid #e2e8f0',
                background: ivCols.includes(col) ? '#dbeafe' : 'white',
                cursor: dvCol === col ? 'not-allowed' : 'pointer',
                opacity: dvCol === col ? 0.4 : 1,
                fontSize: 13,
                fontWeight: ivCols.includes(col) ? 600 : 400,
                transition: 'all 0.15s'
              }}
            >
              {ivCols.includes(col) && '✓ '}{col}
            </button>
          ))}
        </div>
      </div>

      {/* DV Selection */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, margin: '0 0 12px', color: '#92400e' }}>
          🟠 Variabel Y (Dependen) — Pilih 1
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {numericColumns.map(col => (
            <button
              key={col}
              onClick={() => selectDv(col)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: dvCol === col ? '2px solid #d97706' : '1px solid #e2e8f0',
                background: dvCol === col ? '#fef3c7' : 'white',
                cursor: ivCols.includes(col) ? 'not-allowed' : 'pointer',
                opacity: ivCols.includes(col) ? 0.4 : 1,
                fontSize: 13,
                fontWeight: dvCol === col ? 600 : 400,
                transition: 'all 0.15s'
              }}
            >
              {dvCol === col && '✓ '}{col}
            </button>
          ))}
        </div>
      </div>

      {/* Summary + auto tests info */}
      {(ivCols.length > 0 || dvCol) && (
        <div style={{
          background: '#f8fafc', padding: 16, borderRadius: 8,
          border: '1px solid #e2e8f0', marginBottom: 20
        }}>
          <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600 }}>Ringkasan:</p>
          {ivCols.length > 0 && (
            <p style={{ margin: '0 0 4px', fontSize: 13 }}>
              <span className="var-tag iv">X (Independen)</span>{' '}
              {ivCols.join(', ')}
            </p>
          )}
          {dvCol && (
            <p style={{ margin: '0 0 12px', fontSize: 13 }}>
              <span className="var-tag dv">Y (Dependen)</span>{' '}
              {dvCol}
            </p>
          )}
          <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
            ✅ Akan dijalankan otomatis: Validitas, Reliabilitas, Normalitas, Multikolinearitas,
            Heteroskedastisitas, Autokorelasi, Regresi, Uji F, Uji t, R²
          </p>
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn-secondary" onClick={onBack}>
          ← Kembali
        </button>
        <button
          className="btn-primary"
          disabled={ivCols.length === 0 || !dvCol}
          onClick={() => onSelectionComplete(ivCols, dvCol)}
        >
          🔍 Analisis Sekarang
        </button>
      </div>
    </div>
  );
}
