// Python analysis scripts that run inside Pyodide in the browser

export const ANALYSIS_SCRIPT = `
import pandas as pd
import numpy as np
import json
from io import StringIO

def read_data(file_content, file_ext):
    """Read data from various file formats"""
    if file_ext == 'csv':
        return pd.read_csv(StringIO(file_content))
    elif file_ext == 'tsv':
        return pd.read_csv(StringIO(file_content), sep='\\t')
    else:
        raise ValueError(f"Unsupported format: {file_ext}")

def get_data_info(df):
    """Get basic info about the dataframe"""
    info = {
        'rows': len(df),
        'columns': list(df.columns),
        'dtypes': {col: str(df[col].dtype) for col in df.columns},
        'numeric_columns': list(df.select_dtypes(include=[np.number]).columns),
        'head': df.head(10).to_dict('records'),
        'describe': df.describe().to_dict(),
        'missing': df.isnull().sum().to_dict()
    }
    return json.dumps(info)

def run_validity(df, item_cols, total_col):
    """Uji Validitas - Pearson Product Moment correlation of each item with total"""
    from scipy import stats
    results = []
    r_table = 0.361  # critical value for N=30, alpha=0.05
    
    for col in item_cols:
        # Item-total correlation (excluding the item itself from total)
        other_items = [c for c in item_cols if c != col]
        total_without = df[other_items].sum(axis=1)
        
        r, p = stats.pearsonr(df[col], total_without)
        valid = abs(r) > r_table
        results.append({
            'variable': col,
            'r_count': round(r, 4),
            'r_table': r_table,
            'n': len(df),
            'valid': bool(valid),
            'conclusion': 'Valid' if valid else 'Tidak Valid'
        })
    
    return json.dumps(results)

def run_reliability(df, items):
    """Uji Reliabilitas - Cronbach's Alpha"""
    k = len(items)
    item_vars = df[items].var(ddof=1)
    total_var = df[items].sum(axis=1).var(ddof=1)
    
    alpha = (k / (k - 1)) * (1 - item_vars.sum() / total_var)
    reliable = alpha > 0.6
    
    return json.dumps({
        'alpha': round(alpha, 4),
        'n_items': k,
        'reliable': bool(reliable),
        'conclusion': 'Reliabel (α > 0.60)' if reliable else 'Tidak Reliabel (α ≤ 0.60)',
        'item_stats': {
            col: {
                'mean': round(df[col].mean(), 4),
                'var': round(df[col].var(ddof=1), 4)
            } for col in items
        }
    })

def run_normality(df, residual_col=None, iv_cols=None, dv_col=None):
    """Uji Normalitas - Kolmogorov-Smirnov"""
    from scipy import stats
    
    # If residual_col provided, use that; otherwise compute residuals from regression
    if residual_col and residual_col in df.columns:
        data = df[residual_col].dropna()
    elif iv_cols and dv_col:
        from numpy.linalg import lstsq
        X = df[iv_cols].values
        y = df[dv_col].values
        X_with_const = np.column_stack([np.ones(len(X)), X])
        beta, _, _, _ = lstsq(X_with_const, y, rcond=None)
        residuals = y - X_with_const @ beta
        data = pd.Series(residuals)
    else:
        return json.dumps({'error': 'No data for normality test'})
    
    stat, p = stats.kstest(data, 'norm', args=(data.mean(), data.std()))
    
    return json.dumps({
        'test': 'Kolmogorov-Smirnov',
        'n': len(data),
        'statistic': round(stat, 4),
        'p_value': round(p, 4),
        'alpha': 0.05,
        'normal': bool(p > 0.05),
        'conclusion': 'Data berdistribusi normal (p > 0.05)' if p > 0.05 else 'Data TIDAK berdistribusi normal (p ≤ 0.05)',
        'mean': round(data.mean(), 4),
        'std': round(data.std(), 4)
    })

def run_multicollinearity(df, iv_cols, dv_col):
    """Uji Multikolinearitas - VIF & Tolerance"""
    from numpy.linalg import inv
    
    X = df[iv_cols].values
    corr = np.corrcoef(X, rowvar=False)
    
    results = []
    for i, col in enumerate(iv_cols):
        other_idx = [j for j in range(len(iv_cols)) if j != i]
        if len(other_idx) > 0:
            r_sq = np.corrcoef(X[:, i], np.mean(X[:, other_idx], axis=1))[0, 1] ** 2
        else:
            r_sq = 0
        
        # Simple VIF calculation
        X_i = X[:, i]
        X_others = X[:, other_idx]
        if X_others.shape[1] > 0:
            X_others_const = np.column_stack([np.ones(len(X_others)), X_others])
            beta, _, _, _ = np.linalg.lstsq(X_others_const, X_i, rcond=None)
            predicted = X_others_const @ beta
            ss_res = np.sum((X_i - predicted) ** 2)
            ss_tot = np.sum((X_i - np.mean(X_i)) ** 2)
            r_sq_reg = 1 - ss_res / ss_tot if ss_tot > 0 else 0
        else:
            r_sq_reg = 0
        
        vif = 1 / (1 - r_sq_reg) if r_sq_reg < 1 else float('inf')
        tolerance = 1 - r_sq_reg
        
        results.append({
            'variable': col,
            'tolerance': round(tolerance, 4),
            'vif': round(vif, 4),
            'ok_tolerance': bool(tolerance > 0.1),
            'ok_vif': bool(vif < 10),
            'conclusion': 'Bebas multikolinearitas' if (tolerance > 0.1 and vif < 10) else 'Ada multikolinearitas'
        })
    
    return json.dumps(results)

def run_heteroscedasticity(df, iv_cols, dv_col):
    """Uji Heteroskedastisitas - Glejser Test"""
    from scipy import stats
    from numpy.linalg import lstsq
    
    X = df[iv_cols].values
    y = df[dv_col].values
    X_const = np.column_stack([np.ones(len(X)), X])
    beta, _, _, _ = lstsq(X_const, y, rcond=None)
    residuals = np.abs(y - X_const @ beta)
    
    results = []
    for i, col in enumerate(iv_cols):
        slope, intercept, r, p, se = stats.linregress(df[col].values, residuals)
        results.append({
            'variable': col,
            'b': round(slope, 4),
            'sig': round(p, 4),
            'r': round(r, 4),
            'heteroscedastic': bool(p < 0.05),
            'conclusion': 'Ada heteroskedastisitas (p < 0.05)' if p < 0.05 else 'Bebas heteroskedastisitas (p ≥ 0.05)'
        })
    
    # Constant
    slope, intercept, r, p, se = stats.linregress(np.ones(len(residuals)), residuals)
    
    return json.dumps({
        'tests': results,
        'overall': 'Bebas heteroskedastisitas' if all(bool(r['sig'] >= 0.05) for r in results) else 'Terdeteksi heteroskedastisitas'
    })

def run_autocorrelation(df, iv_cols, dv_col):
    """Uji Autokorelasi - Durbin-Watson"""
    from numpy.linalg import lstsq
    
    X = df[iv_cols].values
    y = df[dv_col].values
    X_const = np.column_stack([np.ones(len(X)), X])
    beta, _, _, _ = lstsq(X_const, y, rcond=None)
    residuals = y - X_const @ beta
    
    # Durbin-Watson statistic
    diff_resid = np.diff(residuals)
    dw = np.sum(diff_resid ** 2) / np.sum(residuals ** 2)
    
    # Interpretation (rough: d ≈ 2 = no autocorrelation)
    if dw < 1.5:
        conclusion = 'Positif autokorelasi (d < 1.5)'
    elif dw > 2.5:
        conclusion = 'Negatif autokorelasi (d > 2.5)'
    else:
        conclusion = 'Tidak ada autokorelasi (d ≈ 2)'
    
    return json.dumps({
        'dw_statistic': round(dw, 4),
        'n': len(residuals),
        'k': len(iv_cols),
        'conclusion': conclusion,
        'interpretation': {
            'd < 1.5': 'Positif autokorelasi',
            '1.5 ≤ d ≤ 2.5': 'Tidak ada autokorelasi',
            'd > 2.5': 'Negatif autokorelasi'
        }
    })

def run_regression(df, iv_cols, dv_col):
    """Regresi Linier Berganda - OLS"""
    from scipy import stats as scipy_stats
    from numpy.linalg import lstsq, inv
    
    X = df[iv_cols].values
    y = df[dv_col].values
    n = len(y)
    k = len(iv_cols)
    
    X_const = np.column_stack([np.ones(n), X])
    beta, residuals_sum, rank, sv = lstsq(X_const, y, rcond=None)
    
    y_pred = X_const @ beta
    residuals = y - y_pred
    ss_res = np.sum(residuals ** 2)
    ss_tot = np.sum((y - np.mean(y)) ** 2)
    ss_reg = ss_tot - ss_res
    
    r_sq = 1 - ss_res / ss_tot
    adj_r_sq = 1 - (1 - r_sq) * (n - 1) / (n - k - 1)
    
    # Standard errors
    mse = ss_res / (n - k - 1)
    try:
        se = np.sqrt(np.diag(mse * inv(X_const.T @ X_const)))
    except:
        se = np.full(k + 1, float('nan'))
    
    # t-values and p-values
    t_values = beta / se
    p_values = 2 * (1 - scipy_stats.t.cdf(np.abs(t_values), df=n - k - 1))
    
    # F-statistic
    ms_reg = ss_reg / k
    ms_res = ss_res / (n - k - 1)
    f_stat = ms_reg / ms_res
    f_p = 1 - scipy_stats.f.cdf(f_stat, k, n - k - 1)
    
    # Standardized coefficients (Beta)
    std_x = np.std(X, axis=0, ddof=1)
    std_y = np.std(y, ddof=1)
    std_beta = np.zeros(k)
    for i in range(k):
        std_beta[i] = beta[i + 1] * std_x[i] / std_y
    
    coefficients = []
    # Constant
    coefficients.append({
        'variable': 'Constant',
        'b': round(beta[0], 4),
        'se': round(se[0], 4),
        'beta': '-',
        't': round(t_values[0], 4),
        'p': round(p_values[0], 4),
        'significant': bool(p_values[0] < 0.05)
    })
    
    for i, col in enumerate(iv_cols):
        coefficients.append({
            'variable': col,
            'b': round(beta[i + 1], 4),
            'se': round(se[i + 1], 4),
            'beta': round(std_beta[i], 4),
            't': round(t_values[i + 1], 4),
            'p': round(p_values[i + 1], 4),
            'significant': bool(bool(p_values[i + 1] < 0.05))
        })
    
    # Equation string
    eq_parts = [f'{round(beta[0], 4)}']
    for i, col in enumerate(iv_cols):
        b = round(beta[i + 1], 4)
        sign = '+' if b >= 0 else ''
        eq_parts.append(f'{sign}{b}{col}')
    equation = f'{dv_col} = {" ".join(eq_parts)}'
    
    return json.dumps({
        'coefficients': coefficients,
        'r_squared': round(r_sq, 4),
        'adj_r_squared': round(adj_r_sq, 4),
        'f_statistic': round(f_stat, 4),
        'f_p_value': round(f_p, 4),
        'ss_reg': round(ss_reg, 4),
        'ss_res': round(ss_res, 4),
        'ss_total': round(ss_tot, 4),
        'df_reg': k,
        'df_res': n - k - 1,
        'df_total': n - 1,
        'ms_reg': round(ms_reg, 4),
        'ms_res': round(ms_res, 4),
        'n': n,
        'k': k,
        'equation': equation,
        'durbin_watson': round(np.sum(np.diff(residuals) ** 2) / np.sum(residuals ** 2), 4)
    })

def run_f_test(df, iv_cols, dv_col):
    """Uji F - Simultaneous test (ANOVA table)"""
    result = json.loads(run_regression(df, iv_cols, dv_col))
    
    from scipy import stats as scipy_stats
    f_crit = scipy_stats.ppf(0.95, result['df_reg'], result['df_res'])
    
    return json.dumps({
        'f_statistic': result['f_statistic'],
        'f_critical': round(f_crit, 4),
        'p_value': result['f_p_value'],
        'df_reg': result['df_reg'],
        'df_res': result['df_res'],
        'ss_reg': result['ss_reg'],
        'ss_res': result['ss_res'],
        'ms_reg': result['ms_reg'],
        'ms_res': result['ms_res'],
        'significant': bool(result['f_p_value'] < 0.05),
        'conclusion': f"F-hitung ({result['f_statistic']}) > F-tabel ({round(f_crit, 4)}) atau p ({result['f_p_value']}) < 0.05, maka H0 ditolak. Variabel independen secara SIMULTAN berpengaruh signifikan terhadap variabel dependen." if result['f_p_value'] < 0.05 else f"F-hitung ({result['f_statistic']}) ≤ F-tabel ({round(f_crit, 4)}) atau p ({result['f_p_value']}) ≥ 0.05, maka H0 diterima. Variabel independen secara SIMULTAN TIDAK berpengaruh signifikan terhadap variabel dependen."
    })

def run_t_test(df, iv_cols, dv_col):
    """Uji t - Partial test for each variable"""
    result = json.loads(run_regression(df, iv_cols, dv_col))
    
    from scipy import stats as scipy_stats
    t_crit = scipy_stats.ppf(0.975, result['df_res'])
    
    tests = []
    for coef in result['coefficients']:
        if coef['variable'] != 'Constant':
            sig = bool(coef['p'] < 0.05)
            tests.append({
                'variable': coef['variable'],
                't_statistic': coef['t'],
                't_critical': round(t_crit, 4),
                'p_value': coef['p'],
                'significant': sig,
                'b': coef['b'],
                'beta': coef['beta'],
                'conclusion': f"{coef['variable']} berpengaruh SIGNIFIKAN terhadap DV (t-hitung {coef['t']} > t-tabel {round(t_crit, 4)}, p = {coef['p']})" if sig else f"{coef['variable']} TIDAK berpengaruh signifikan terhadap DV (t-hitung {coef['t']} ≤ t-tabel {round(t_crit, 4)}, p = {coef['p']})"
            })
    
    return json.dumps({
        't_critical': round(t_crit, 4),
        'df': result['df_res'],
        'tests': tests
    })

def run_r_squared(df, iv_cols, dv_col):
    """Koefisien Determinasi R²"""
    result = json.loads(run_regression(df, iv_cols, dv_col))
    
    return json.dumps({
        'r_squared': result['r_squared'],
        'adj_r_squared': result['adj_r_squared'],
        'r_squared_pct': f"{round(result['r_squared'] * 100, 2)}%",
        'adj_r_squared_pct': f"{round(result['adj_r_squared'] * 100, 2)}%",
        'interpretation': f"Variabel independen menjelaskan {round(result['r_squared'] * 100, 2)}% variasi variabel dependen. Sisanya ({round((1 - result['r_squared']) * 100, 2)}%) dijelaskan oleh variabel lain di luar model."
    })

def run_analysis(data_json, iv_cols, dv_col, selected_tests):
    """Main function to run selected analyses"""
    import json as j
    df = pd.DataFrame(j.loads(data_json))
    
    # Convert numeric columns
    for col in iv_cols + [dv_col]:
        df[col] = pd.to_numeric(df[col], errors='coerce')
    df = df.dropna(subset=iv_cols + [dv_col])
    
    results = {}
    
    if 'validity' in selected_tests:
        results['validity'] = j.loads(run_validity(df, iv_cols, dv_col))
    
    if 'reliability' in selected_tests:
        results['reliability'] = j.loads(run_reliability(df, iv_cols))
    
    if 'normality' in selected_tests:
        results['normality'] = j.loads(run_normality(df, iv_cols=iv_cols, dv_col=dv_col))
    
    if 'multicollinearity' in selected_tests:
        results['multicollinearity'] = j.loads(run_multicollinearity(df, iv_cols, dv_col))
    
    if 'heteroscedasticity' in selected_tests:
        results['heteroscedasticity'] = j.loads(run_heteroscedasticity(df, iv_cols, dv_col))
    
    if 'autocorrelation' in selected_tests:
        results['autocorrelation'] = j.loads(run_autocorrelation(df, iv_cols, dv_col))
    
    if 'regression' in selected_tests:
        results['regression'] = j.loads(run_regression(df, iv_cols, dv_col))
    
    if 'f_test' in selected_tests:
        results['f_test'] = j.loads(run_f_test(df, iv_cols, dv_col))
    
    if 't_test' in selected_tests:
        results['t_test'] = j.loads(run_t_test(df, iv_cols, dv_col))
    
    if 'r_squared' in selected_tests:
        results['r_squared'] = j.loads(run_r_squared(df, iv_cols, dv_col))
    
    return j.dumps(results)
`;
