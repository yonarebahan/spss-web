'use client';

interface ResultsDisplayProps {
  results: any;
  ivCols: string[];
  dvCol: string;
  onBack: () => void;
  onRestart: () => void;
}

function SigBadge({ p }: { p: number }) {
  const sig = p < 0.05;
  return (
    <span style={{
      color: sig ? '#16a34a' : '#dc2626',
      fontWeight: 700,
      fontSize: 12
    }}>
      {sig ? 'Sig. ✓' : 'Tidak Sig. ✗'}
    </span>
  );
}

function TableSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h3 style={{ fontSize: 17, margin: '0 0 4px', color: '#1e293b' }}>{title}</h3>
      <div style={{ overflowX: 'auto' }}>{children}</div>
    </div>
  );
}

export default function ResultsDisplay({ results, ivCols, dvCol, onBack, onRestart }: ResultsDisplayProps) {
  const exportPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF('p', 'mm', 'a4');
    let y = 20;

    doc.setFontSize(16);
    doc.text('Hasil Analisis Statistik', 105, y, { align: 'center' });
    y += 10;
    doc.setFontSize(10);
    doc.text(`Variabel: ${ivCols.join(', ')} → ${dvCol}`, 105, y, { align: 'center' });
    y += 10;

    // Regression
    if (results.regression) {
      const r = results.regression;
      doc.setFontSize(12);
      doc.text('Regresi Linier Berganda', 14, y);
      y += 6;
      doc.setFontSize(9);
      doc.text(`Persamaan: ${r.equation}`, 14, y);
      y += 6;
      doc.text(`R² = ${r.r_squared} | Adj R² = ${r.adj_r_squared} | F = ${r.f_statistic} (p = ${r.f_p_value})`, 14, y);
      y += 8;

      autoTable(doc, {
        startY: y,
        head: [['Variabel', 'B', 'SE', 'Beta', 't', 'Sig.']],
        body: r.coefficients.map((c: any) => [c.variable, c.b, c.se, c.beta, c.t, c.p]),
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 95] },
        styles: { fontSize: 9 }
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    // F-Test
    if (results.f_test) {
      doc.setFontSize(12);
      doc.text('Uji F (Simultan)', 14, y);
      y += 6;
      doc.setFontSize(9);
      doc.text(`F-hitung: ${results.f_test.f_statistic} | F-tabel: ${results.f_test.f_critical} | Sig: ${results.f_test.p_value}`, 14, y);
      y += 6;
      doc.text(results.f_test.conclusion, 14, y, { maxWidth: 180 });
      y += 12;
    }

    // t-Test
    if (results.t_test) {
      doc.setFontSize(12);
      doc.text('Uji t (Parsial)', 14, y);
      y += 6;

      autoTable(doc, {
        startY: y,
        head: [['Variabel', 't-hitung', 't-tabel', 'Sig.', 'Kesimpulan']],
        body: results.t_test.tests.map((t: any) => [
          t.variable, t.t_statistic, t.t_critical, t.p_value,
          t.significant ? 'Signifikan' : 'Tidak Signifikan'
        ]),
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 95] },
        styles: { fontSize: 9 }
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    // R²
    if (results.r_squared) {
      doc.setFontSize(12);
      doc.text('Koefisien Determinasi', 14, y);
      y += 6;
      doc.setFontSize(9);
      doc.text(`R² = ${results.r_squared.r_squared_pct} | Adj R² = ${results.r_squared.adj_r_squared_pct}`, 14, y);
      y += 6;
      doc.text(results.r_squared.interpretation, 14, y, { maxWidth: 180 });
      y += 12;
    }

    doc.save('hasil-analisis-statistik.pdf');
  };

  return (
    <div>
      {/* Header */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 20 }}>📊 Hasil Analisis Statistik</h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
              {ivCols.map(c => c).join(', ')} → {dvCol}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary" onClick={exportPDF} style={{ fontSize: 13 }}>📄 Export PDF</button>
            <button className="btn-secondary" onClick={onBack} style={{ fontSize: 13 }}>← Ubah Uji</button>
            <button className="btn-secondary" onClick={onRestart} style={{ fontSize: 13 }}>🔄 Mulai Ulang</button>
          </div>
        </div>
      </div>

      {/* Validity */}
      {results.validity && (
        <div className="card" style={{ marginBottom: 16 }}>
          <TableSection title="1. Uji Validitas (Pearson Product Moment)">
            <table className="spss-table">
              <thead>
                <tr>
                  <th>Variabel</th>
                  <th>r hitung</th>
                  <th>r tabel</th>
                  <th>N</th>
                  <th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {results.validity.map((v: any, i: number) => (
                  <tr key={i}>
                    <td>{v.variable}</td>
                    <td className={v.valid ? 'sig-significant' : 'sig-not-significant'}>{v.r_count}</td>
                    <td>{v.r_table}</td>
                    <td>{v.n}</td>
                    <td><strong>{v.conclusion}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
              Valid jika |r hitung| &gt; r tabel (0,361 untuk N=30, α=0,05)
            </p>
          </TableSection>
        </div>
      )}

      {/* Reliability */}
      {results.reliability && (
        <div className="card" style={{ marginBottom: 16 }}>
          <TableSection title="2. Uji Reliabilitas (Cronbach's Alpha)">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 12 }}>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: '#64748b' }}>Cronbach's Alpha</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: results.reliability.reliable ? '#16a34a' : '#dc2626' }}>
                  {results.reliability.alpha}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: '#64748b' }}>Jumlah Item</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{results.reliability.n_items}</div>
              </div>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: '#64748b' }}>Keterangan</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: results.reliability.reliable ? '#16a34a' : '#dc2626' }}>
                  {results.reliability.conclusion}
                </div>
              </div>
            </div>
          </TableSection>
        </div>
      )}

      {/* Normality */}
      {results.normality && (
        <div className="card" style={{ marginBottom: 16 }}>
          <TableSection title="3. Uji Normalitas (Kolmogorov-Smirnov)">
            <table className="spss-table">
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Nilai</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Test</td><td>{results.normality.test}</td></tr>
                <tr><td>N</td><td>{results.normality.n}</td></tr>
                <tr><td>Kolmogorov-Smirnov Z</td><td>{results.normality.statistic}</td></tr>
                <tr><td>Sig. (2-tailed)</td><td className={results.normality.normal ? 'sig-significant' : 'sig-not-significant'}>{results.normality.p_value}</td></tr>
                <tr><td>Mean</td><td>{results.normality.mean}</td></tr>
                <tr><td>Std. Deviation</td><td>{results.normality.std}</td></tr>
                <tr><td><strong>Kesimpulan</strong></td><td><strong>{results.normality.conclusion}</strong></td></tr>
              </tbody>
            </table>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
              Normal jika p {'>'}  0,05
            </p>
          </TableSection>
        </div>
      )}

      {/* Multicollinearity */}
      {results.multicollinearity && (
        <div className="card" style={{ marginBottom: 16 }}>
          <TableSection title="4. Uji Multikolinearitas (VIF & Tolerance)">
            <table className="spss-table">
              <thead>
                <tr>
                  <th>Variabel</th>
                  <th>Tolerance</th>
                  <th>VIF</th>
                  <th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {results.multicollinearity.map((v: any, i: number) => (
                  <tr key={i}>
                    <td>{v.variable}</td>
                    <td>{v.tolerance}</td>
                    <td>{v.vif}</td>
                    <td><strong>{v.conclusion}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
              Bebas multikolinearitas jika Tolerance {'>'}  0,1 dan VIF {'<'}  10
            </p>
          </TableSection>
        </div>
      )}

      {/* Heteroscedasticity */}
      {results.heteroscedasticity && (
        <div className="card" style={{ marginBottom: 16 }}>
          <TableSection title="5. Uji Heteroskedastisitas (Glejser)">
            <table className="spss-table">
              <thead>
                <tr>
                  <th>Variabel</th>
                  <th>B</th>
                  <th>Sig.</th>
                  <th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {results.heteroscedasticity.tests.map((v: any, i: number) => (
                  <tr key={i}>
                    <td>{v.variable}</td>
                    <td>{v.b}</td>
                    <td className={v.sig >= 0.05 ? 'sig-significant' : 'sig-not-significant'}>{v.sig}</td>
                    <td><strong>{v.conclusion}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
              Bebas heteroskedastisitas jika Sig. ≥ 0,05
            </p>
          </TableSection>
        </div>
      )}

      {/* Autocorrelation */}
      {results.autocorrelation && (
        <div className="card" style={{ marginBottom: 16 }}>
          <TableSection title="6. Uji Autokorelasi (Durbin-Watson)">
            <table className="spss-table">
              <thead>
                <tr><th>Parameter</th><th>Nilai</th></tr>
              </thead>
              <tbody>
                <tr><td>Durbin-Watson</td><td><strong>{results.autocorrelation.dw_statistic}</strong></td></tr>
                <tr><td>N</td><td>{results.autocorrelation.n}</td></tr>
                <tr><td>K (variabel)</td><td>{results.autocorrelation.k}</td></tr>
                <tr><td><strong>Kesimpulan</strong></td><td><strong>{results.autocorrelation.conclusion}</strong></td></tr>
              </tbody>
            </table>
            <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
              <p style={{ margin: '2px 0' }}>• d {'<'}  1,5 → Positif autokorelasi</p>
              <p style={{ margin: '2px 0' }}>• 1,5 ≤ d ≤ 2,5 → Tidak ada autokorelasi</p>
              <p style={{ margin: '2px 0' }}>• d {'>'}  2,5 → Negatif autokorelasi</p>
            </div>
          </TableSection>
        </div>
      )}

      {/* Regression */}
      {results.regression && (
        <div className="card" style={{ marginBottom: 16 }}>
          <TableSection title="7. Regresi Linier Berganda">
            <div style={{ background: '#f0fdf4', padding: 16, borderRadius: 8, marginBottom: 16, border: '1px solid #bbf7d0' }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, fontFamily: 'monospace' }}>
                {results.regression.equation}
              </p>
            </div>
            <table className="spss-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>B</th>
                  <th>Std. Error</th>
                  <th>Beta</th>
                  <th>t</th>
                  <th>Sig.</th>
                </tr>
              </thead>
              <tbody>
                {results.regression.coefficients.map((c: any, i: number) => (
                  <tr key={i}>
                    <td>{c.variable}</td>
                    <td>{c.b}</td>
                    <td>{c.se}</td>
                    <td>{c.beta}</td>
                    <td>{c.t}</td>
                    <td>
                      {c.p} {c.variable !== 'Constant' && <SigBadge p={c.p} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableSection>
        </div>
      )}

      {/* F-Test */}
      {results.f_test && (
        <div className="card" style={{ marginBottom: 16 }}>
          <TableSection title="8. Uji F (Simultan)">
            <table className="spss-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Sum of Squares</th>
                  <th>df</th>
                  <th>Mean Square</th>
                  <th>F</th>
                  <th>Sig.</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Regression</td>
                  <td>{results.f_test.ss_reg}</td>
                  <td>{results.f_test.df_reg}</td>
                  <td>{results.f_test.ms_reg}</td>
                  <td rowSpan={3} style={{ fontWeight: 700, verticalAlign: 'middle' }}>{results.f_test.f_statistic}</td>
                  <td rowSpan={3} style={{ verticalAlign: 'middle' }}>
                    {results.f_test.p_value} <SigBadge p={results.f_test.p_value} />
                  </td>
                </tr>
                <tr>
                  <td>Residual</td>
                  <td>{results.f_test.ss_res}</td>
                  <td>{results.f_test.df_res}</td>
                  <td>{results.f_test.ms_res}</td>
                </tr>
              </tbody>
            </table>
            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginTop: 12 }}>
              <p style={{ margin: 0, fontSize: 13 }}>
                <strong>F-hitung:</strong> {results.f_test.f_statistic} | <strong>F-tabel:</strong> {results.f_test.f_critical}
              </p>
              <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.6 }}>
                {results.f_test.conclusion}
              </p>
            </div>
          </TableSection>
        </div>
      )}

      {/* t-Test */}
      {results.t_test && (
        <div className="card" style={{ marginBottom: 16 }}>
          <TableSection title="9. Uji t (Parsial)">
            <table className="spss-table">
              <thead>
                <tr>
                  <th>Variabel</th>
                  <th>B</th>
                  <th>Beta</th>
                  <th>t-hitung</th>
                  <th>t-tabel</th>
                  <th>Sig.</th>
                  <th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {results.t_test.tests.map((t: any, i: number) => (
                  <tr key={i}>
                    <td>{t.variable}</td>
                    <td>{t.b}</td>
                    <td>{t.beta}</td>
                    <td>{t.t_statistic}</td>
                    <td>{t.t_critical}</td>
                    <td className={t.significant ? 'sig-significant' : 'sig-not-significant'}>{t.p_value}</td>
                    <td><strong>{t.significant ? 'Signifikan' : 'Tidak Signifikan'}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 12 }}>
              {results.t_test.tests.map((t: any, i: number) => (
                <p key={i} style={{ fontSize: 12, color: '#475569', margin: '4px 0', lineHeight: 1.5 }}>
                  {t.conclusion}
                </p>
              ))}
            </div>
          </TableSection>
        </div>
      )}

      {/* R² */}
      {results.r_squared && (
        <div className="card" style={{ marginBottom: 16 }}>
          <TableSection title="10. Koefisien Determinasi (R²)">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
              <div style={{ background: '#eff6ff', padding: 16, borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>R²</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#1e40af' }}>{results.r_squared.r_squared_pct}</div>
              </div>
              <div style={{ background: '#eff6ff', padding: 16, borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Adjusted R²</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#1e40af' }}>{results.r_squared.adj_r_squared_pct}</div>
              </div>
            </div>
            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8 }}>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
                {results.r_squared.interpretation}
              </p>
            </div>
          </TableSection>
        </div>
      )}
    </div>
  );
}
