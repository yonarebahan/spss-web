'use client';

import { ANALYSIS_SCRIPT } from './python-scripts';

let pyodideInstance: any = null;
let isLoading = false;
let loadPromise: Promise<any> | null = null;

export async function loadPyodideEngine(): Promise<any> {
  if (pyodideInstance) return pyodideInstance;
  if (loadPromise) return loadPromise;

  isLoading = true;
  loadPromise = (async () => {
    try {
      // @ts-ignore
      const pyodide = await (window as any).loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.0/full/',
      });
      
      await pyodide.loadPackage(['numpy', 'scipy', 'pandas']);
      await pyodide.runPythonAsync(ANALYSIS_SCRIPT);
      
      pyodideInstance = pyodide;
      isLoading = false;
      return pyodide;
    } catch (err) {
      isLoading = false;
      loadPromise = null;
      throw err;
    }
  })();

  return loadPromise;
}

export function getPyodideStatus() {
  return {
    loaded: !!pyodideInstance,
    loading: isLoading,
  };
}

export async function runAnalysis(
  data: Record<string, any>[],
  ivCols: string[],
  dvCol: string,
  selectedTests: string[]
): Promise<any> {
  const pyodide = await loadPyodideEngine();
  
  const dataJson = JSON.stringify(data);
  
  const code = `
import json
result = run_analysis('${dataJson.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}', ${JSON.stringify(ivCols)}, '${dvCol}', ${JSON.stringify(selectedTests)})
result
  `;
  
  const result = await pyodide.runPythonAsync(code);
  return JSON.parse(result);
}

export async function getDataInfo(data: Record<string, any>[]): Promise<any> {
  const pyodide = await loadPyodideEngine();
  
  const code = `
import json
import pandas as pd
df = pd.DataFrame(${JSON.stringify(data)})
get_data_info(df)
  `;
  
  const result = await pyodide.runPythonAsync(code);
  return JSON.parse(result);
}

// Lightweight version - run analysis without full Pyodide for basic stats
export function runBasicStats(data: Record<string, any>[], cols: string[]) {
  const n = data.length;
  const stats: Record<string, any> = {};
  
  for (const col of cols) {
    const values = data.map(r => parseFloat(r[col])).filter(v => !isNaN(v));
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / (values.length - 1);
    const std = Math.sqrt(variance);
    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    
    stats[col] = { n: values.length, mean, median, std, min: sorted[0], max: sorted[sorted.length - 1], variance };
  }
  
  return stats;
}
