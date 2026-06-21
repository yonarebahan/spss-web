'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';

interface FileUploadProps {
  onFileLoaded: (data: Record<string, any>[], fileName: string) => void;
}

export default function FileUpload({ onFileLoaded }: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setLoading(true);
    setError('');

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      
      if (ext === 'csv' || ext === 'tsv') {
        const text = await file.text();
        const delimiter = ext === 'tsv' ? '\t' : ',';
        const lines = text.trim().split('\n');
        const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
        const data = lines.slice(1).map(line => {
          const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
          const row: Record<string, any> = {};
          headers.forEach((h, i) => {
            const val = values[i] || '';
            row[h] = isNaN(Number(val)) || val === '' ? val : Number(val);
          });
          return row;
        });
        onFileLoaded(data, file.name);
      } else if (ext === 'xlsx' || ext === 'xls') {
        const XLSX = await import('xlsx');
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];
        onFileLoaded(data, file.name);
      } else if (ext === 'sav') {
        // For .sav files, we use Pyodide with pyreadstat
        const pyodide = await import('@/lib/pyodide-engine').then(m => m.loadPyodideEngine());
        
        await pyodide.loadPackage(['pyreadstat']);
        
        const buffer = await file.arrayBuffer();
        const uint8 = new Uint8Array(buffer);
        pyodide.FS.writeFile('/tmp/upload.sav', uint8);
        
        const result = await pyodide.runPythonAsync(`
import pyreadstat
import json
df, meta = pyreadstat.read_sav('/tmp/upload.sav')
# Convert to JSON-friendly format
for col in df.select_dtypes(include=['datetime64', 'datetimetz']).columns:
    df[col] = df[col].astype(str)
json.dumps(df.to_dict('records'))
        `);
        
        const data = JSON.parse(result);
        onFileLoaded(data, file.name);
      } else {
        setError(`Format .${ext} belum didukung. Gunakan .csv, .xlsx, atau .sav`);
      }
    } catch (err: any) {
      setError(`Error membaca file: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div>
      <div
        className={`upload-zone ${dragOver ? 'dragover' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div className="spinner" />
            <p style={{ color: '#64748b', margin: 0 }}>Membaca file...</p>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 48, marginBottom: 8 }}>📊</div>
            <h3 style={{ margin: '0 0 8px', color: '#1e293b' }}>Upload Data Penelitian</h3>
            <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: 14 }}>
              Drag & drop file atau klik untuk pilih
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {['.sav', '.csv', '.xlsx'].map(ext => (
                <span key={ext} style={{
                  background: '#f1f5f9', padding: '4px 12px', borderRadius: 6,
                  fontSize: 12, color: '#475569', fontWeight: 500
                }}>{ext}</span>
              ))}
            </div>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".sav,.csv,.xlsx,.xls,.tsv"
          onChange={handleChange}
          style={{ display: 'none' }}
        />
      </div>
      {error && (
        <div style={{
          marginTop: 12, padding: '12px 16px', background: '#fef2f2',
          border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 14
        }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
