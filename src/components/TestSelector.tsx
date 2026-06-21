'use client';

import { useState } from 'react';

interface TestSelectorProps {
  onSelectionComplete: (tests: string[]) => void;
  onBack: () => void;
}

const AVAILABLE_TESTS = [
  { id: 'validity', name: 'Uji Validitas', desc: 'Korelasi Product Moment Pearson', category: 'Instrumen' },
  { id: 'reliability', name: 'Uji Reliabilitas', desc: 'Cronbach\'s Alpha', category: 'Instrumen' },
  { id: 'normality', name: 'Uji Normalitas', desc: 'Kolmogorov-Smirnov Test', category: 'Asumsi Klasik' },
  { id: 'multicollinearity', name: 'Uji Multikolinearitas', desc: 'VIF & Tolerance', category: 'Asumsi Klasik' },
  { id: 'heteroscedasticity', name: 'Uji Heteroskedastisitas', desc: 'Uji Glejser', category: 'Asumsi Klasik' },
  { id: 'autocorrelation', name: 'Uji Autokorelasi', desc: 'Durbin-Watson', category: 'Asumsi Klasik' },
  { id: 'regression', name: 'Regresi Linier Berganda', desc: 'OLS Regression', category: 'Regresi' },
  { id: 'f_test', name: 'Uji F (Simultan)', desc: 'ANOVA / F-test', category: 'Hipotesis' },
  { id: 't_test', name: 'Uji t (Parsial)', desc: 't-test individual', category: 'Hipotesis' },
  { id: 'r_squared', name: 'Koefisien Determinasi', desc: 'R² & Adjusted R²', category: 'Hipotesis' },
];

const PRESETS = {
  'Skripsi Standar': ['validity', 'reliability', 'normality', 'multicollinearity', 'heteroscedasticity', 'autocorrelation', 'regression', 'f_test', 't_test', 'r_squared'],
  'Asumsi + Regresi': ['normality', 'multicollinearity', 'heteroscedasticity', 'autocorrelation', 'regression', 'f_test', 't_test', 'r_squared'],
  'Regresi Saja': ['regression', 'f_test', 't_test', 'r_squared'],
};

export default function TestSelector({ onSelectionComplete, onBack }: TestSelectorProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [activePreset, setActivePreset] = useState('');

  const toggleTest = (id: string) => {
    setActivePreset('');
    setSelected(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const applyPreset = (name: string, tests: string[]) => {
    setActivePreset(name);
    setSelected(tests);
  };

  const categories = [...new Set(AVAILABLE_TESTS.map(t => t.category))];

  return (
    <div className="card">
      <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>🧪 Pilih Uji Statistik</h2>
      <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 16px' }}>
        Pilih uji yang ingin dijalankan, atau gunakan preset
      </p>

      {/* Presets */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px', color: '#475569' }}>Preset Cepat:</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {Object.entries(PRESETS).map(([name, tests]) => (
            <button
              key={name}
              onClick={() => applyPreset(name, tests)}
              style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 12,
                border: activePreset === name ? '2px solid #1e40af' : '1px solid #e2e8f0',
                background: activePreset === name ? '#dbeafe' : 'white',
                cursor: 'pointer', fontWeight: activePreset === name ? 600 : 400
              }}
            >
              {name} ({tests.length})
            </button>
          ))}
        </div>
      </div>

      {/* Tests by category */}
      {categories.map(cat => (
        <div key={cat} style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, margin: '0 0 10px', color: '#475569' }}>{cat}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {AVAILABLE_TESTS.filter(t => t.category === cat).map(test => (
              <div
                key={test.id}
                className={`test-checkbox ${selected.includes(test.id) ? 'selected' : ''}`}
                onClick={() => toggleTest(test.id)}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(test.id)}
                  onChange={() => {}}
                  style={{ width: 18, height: 18, accentColor: '#1e40af', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{test.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{test.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Selected count */}
      <div style={{
        padding: '10px 16px', background: '#f0fdf4', borderRadius: 8,
        border: '1px solid #bbf7d0', marginBottom: 16, fontSize: 13
      }}>
        ✅ {selected.length} uji dipilih
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn-secondary" onClick={onBack}>← Kembali</button>
        <button
          className="btn-primary"
          disabled={selected.length === 0}
          onClick={() => onSelectionComplete(selected)}
        >
          🔍 Jalankan Analisis
        </button>
      </div>
    </div>
  );
}
