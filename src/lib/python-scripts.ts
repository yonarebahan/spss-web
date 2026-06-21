// Python analysis scripts that run inside Pyodide in the browser

export const ANALYSIS_SCRIPT = `
import pandas as pd
import numpy as np
import json
from io import StringIO
from scipy import stats

# ============================================================
# HELPERS
# ============================================================

def get_r_table(N, alpha=0.05):
    """Hitung r-tabel dinamis dari distribusi t (sama seperti SPSS)"""
    df = N - 2
    if df < 1:
        return 1.0
    t_crit = stats.t.ppf(1 - alpha / 2, df)
    r_crit = t_crit / np.sqrt(t_crit**2 + df)
    return round(float(r_crit), 4)

# Durbin-Watson critical values (alpha=0.05)
# Format: DW_TABLE[N] = [(dL_k1, dU_k1), (dL_k2, dU_k2), ...] for k=1..6
DW_TABLE = {
    6:  [(0.610, 1.400)],
    7:  [(0.700, 1.356), (0.467, 1.896)],
    8:  [(0.763, 1.332), (0.559, 1.777)],
    9:  [(0.824, 1.320), (0.629, 1.699), (0.455, 2.100)],
    10: [(0.879, 1.320), (0.697, 1.641), (0.525, 1.977)],
    11: [(0.927, 1.324), (0.758, 1.604), (0.595, 1.864)],
    12: [(0.971, 1.331), (0.812, 1.579), (0.658, 1.781)],
    13: [(1.010, 1.340), (0.861, 1.562), (0.715, 1.714)],
    14: [(1.045, 1.350), (0.905, 1.551), (0.767, 1.660)],
    15: [(1.077, 1.361), (0.946, 1.543), (0.814, 1.616), (0.685, 1.924)],
    16: [(1.106, 1.371), (0.982, 1.539), (0.857, 1.579), (0.735, 1.852)],
    17: [(1.133, 1.381), (1.015, 1.536), (0.897, 1.549), (0.781, 1.792)],
    18: [(1.158, 1.391), (1.046, 1.535), (0.933, 1.524), (0.823, 1.742)],
    19: [(1.180, 1.401), (1.074, 1.536), (0.967, 1.503), (0.862, 1.700)],
    20: [(1.201, 1.411), (1.100, 1.537), (0.998, 1.485), (0.898, 1.664), (0.798, 1.960)],
    22: [(1.239, 1.429), (1.147, 1.542), (1.053, 1.457), (0.961, 1.606), (0.871, 1.862)],
    24: [(1.273, 1.446), (1.188, 1.548), (1.101, 1.437), (1.015, 1.562), (0.934, 1.787)],
    25: [(1.288, 1.454), (1.206, 1.552), (1.123, 1.429), (1.039, 1.544), (0.962, 1.757), (0.885, 2.047)],
    26: [(1.302, 1.461), (1.224, 1.556), (1.143, 1.422), (1.062, 1.528), (0.988, 1.730), (0.916, 2.004)],
    28: [(1.328, 1.476), (1.255, 1.564), (1.180, 1.411), (1.103, 1.502), (1.034, 1.684), (0.971, 1.933)],
    30: [(1.352, 1.489), (1.284, 1.572), (1.214, 1.403), (1.139, 1.481), (1.075, 1.647), (1.018, 1.877)],
    32: [(1.373, 1.502), (1.309, 1.580), (1.244, 1.397), (1.171, 1.464), (1.111, 1.616), (1.059, 1.832)],
    35: [(1.402, 1.519), (1.343, 1.592), (1.284, 1.390), (1.212, 1.445), (1.157, 1.579), (1.112, 1.779)],
    40: [(1.442, 1.544), (1.391, 1.609), (1.338, 1.382), (1.268, 1.423), (1.220, 1.533), (1.182, 1.716)],
    45: [(1.475, 1.566), (1.430, 1.625), (1.383, 1.388), (1.312, 1.409), (1.270, 1.501), (1.234, 1.671)],
    50: [(1.503, 1.584), (1.462, 1.639), (1.421, 1.396), (1.350, 1.400), (1.311, 1.476), (1.278, 1.635)],
    55: [(1.526, 1.599), (1.490, 1.651), (1.452, 1.406), (1.383, 1.396), (1.346, 1.457), (1.315, 1.606)],
    60: [(1.546, 1.612), (1.513, 1.662), (1.478, 1.418), (1.411, 1.396), (1.376, 1.442), (1.347, 1.582)],
    65: [(1.563, 1.623), (1.533, 1.671), (1.501, 1.431), (1.436, 1.398), (1.402, 1.431), (1.374, 1.562)],
    70: [(1.578, 1.633), (1.550, 1.679), (1.520, 1.444), (1.458, 1.403), (1.425, 1.422), (1.398, 1.546)],
    75: [(1.591, 1.642), (1.565, 1.686), (1.537, 1.457), (1.477, 1.410), (1.446, 1.416), (1.420, 1.533)],
    80: [(1.602, 1.650), (1.578, 1.692), (1.552, 1.469), (1.494, 1.418), (1.464, 1.412), (1.439, 1.522)],
    90: [(1.621, 1.664), (1.600, 1.703), (1.578, 1.492), (1.523, 1.436), (1.494, 1.408), (1.472, 1.505)],
    100:[(1.636, 1.676), (1.617, 1.713), (1.598, 1.512), (1.546, 1.453), (1.520, 1.410), (1.499, 1.493)],
    150:[(1.683, 1.720), (1.671, 1.746), (1.659, 1.582), (1.623, 1.512), (1.600, 1.447), (1.578, 1.438)],
    200:[(1.710, 1.748), (1.701, 1.770), (1.692, 1.628), (1.668, 1.553), (1.649, 1.486), (1.632, 1.427)],
}

def get_dw_critical(n, k):
    """Cari dL dan dU dari tabel Durbin-Watson. Interpolasi linear jika N tidak ada."""
    sorted_n = sorted(DW_TABLE.keys())
    k_idx = min(max(k, 1), 6) - 1

    if n <= sorted_n[0]:
        e = DW_TABLE[sorted_n[0]]
        return e[min(k_idx, len(e)-1)]
    if n >= sorted_n[-1]:
        e = DW_TABLE[sorted_n[-1]]
        return e[min(k_idx, len(e)-1)]

    lower_n = max(x for x in sorted_n if x <= n)
    upper_n = min(x for x in sorted_n if x >= n)
    if lower_n == upper_n:
        e = DW_TABLE[lower_n]
        return e[min(k_idx, len(e)-1)]

    e_lo = DW_TABLE[lower_n]
    e_hi = DW_TABLE[upper_n]
    ki_lo = min(k_idx, len(e_lo)-1)
    ki_hi = min(k_idx, len(e_hi)-1)
    t = (n - lower_n) / (upper_n - lower_n)
    dL = e_lo[ki_lo][0] + t * (e_hi[ki_hi][0] - e_lo[ki_lo][0])
    dU = e_lo[ki_lo][1] + t * (e_hi[ki_hi][1] - e_lo[ki_lo][1])
    return (round(dL, 4), round(dU, 4))

def interpret_dw(d, n, k):
    """Interpretasi Durbin-Watson sesuai tabel dL/dU (bukan rule of thumb)"""
    dL, dU = get_dw_critical(n, k)
    dU4 = 4 - dU
    dL4 = 4 - dL
    if d < dL:
        return 'Positif autokorelasi', dL, dU, 'd < dL'
    elif d < dU:
        return 'Inkonklusif (zona positif)', dL, dU, 'dL <= d < dU'
    elif d <= dU4:
        return 'Tidak ada autokorelasi', dL, dU, 'dU <= d <= 4-dU'
    elif d <= dL4:
        return 'Inkonklusif (zona negatif)', dL, dU, '4-dU < d <= 4-dL'
    else:
        return 'Negatif autokorelasi', dL, dU, 'd > 4-dL'

# ============================================================
# DATA READING
# ============================================================

def read_data(file_content, file_ext):
    if file_ext == 'csv':
        return pd.read_csv(StringIO(file_content))
    elif file_ext == 'tsv':
        return pd.read_csv(StringIO(file_content), sep='\\t')
    else:
        raise ValueError(f"Unsupported format: {file_ext}")

def get_data_info(df):
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

# ============================================================
# UJI VALIDITAS (Corrected Item-Total, dynamic r-tabel)
# ============================================================

def run_validity(df, item_cols, total_col=None):
    results = []
    N = len(df)
    r_table = get_r_table(N, alpha=0.05)
    for col in item_cols:
        other_items = [c for c in item_cols if c != col]
        total_without = df[other_items].sum(axis=1)
        r, p = stats.pearsonr(df[col], total_without)
        valid = bool(abs(r) >= r_table)
        results.append({
            'variable': col,
            'r_count': round(float(r), 4),
            'r_table': r_table,
            'n': N,
            'sig': round(float(p), 4),
            'valid': valid,
            'conclusion': 'Valid' if valid else 'Tidak Valid'
        })
    return json.dumps(results)

# ============================================================
# UJI RELIABILITAS (Cronbach's Alpha + Alpha-if-deleted)
# ============================================================

def run_reliability(df, items):
    k = len(items)
    item_data = df[items]
    item_means = item_data.mean()
    item_vars = item_data.var(ddof=1)
    total_var = item_data.sum(axis=1).var(ddof=1)
    alpha = (k / (k - 1)) * (1 - item_vars.sum() / total_var)
    reliable = bool(alpha > 0.6)

    # Corrected Item-Total Correlation
    item_total_corr = {}
    for col in items:
        other = [c for c in items if c != col]
        total_wo = df[other].sum(axis=1)
        r, _ = stats.pearsonr(df[col], total_wo)
        item_total_corr[col] = round(float(r), 4)

    # Alpha if item deleted
    alpha_if_deleted = {}
    for col in items:
        remaining = [c for c in items if c != col]
        kr = len(remaining)
        if kr > 1:
            vr = df[remaining].var(ddof=1)
            tvr = df[remaining].sum(axis=1).var(ddof=1)
            ar = (kr / (kr - 1)) * (1 - vr.sum() / tvr)
            alpha_if_deleted[col] = round(float(ar), 4)

    return json.dumps({
        'alpha': round(float(alpha), 4),
        'n_items': k,
        'reliable': reliable,
        'conclusion': 'Reliabel (Alpha > 0.60)' if reliable else 'Tidak Reliabel (Alpha <= 0.60)',
        'item_stats': {
            col: {
                'mean': round(float(item_means[col]), 4),
                'var': round(float(item_vars[col]), 4),
                'corrected_item_total': item_total_corr[col],
                'alpha_if_deleted': alpha_if_deleted.get(col, '-')
            } for col in items
        }
    })

# ============================================================
# UJI NORMALITAS (Shapiro-Wilk N<50, KS N>=50)
# ============================================================

def run_normality(df, residual_col=None, iv_cols=None, dv_col=None):
    if residual_col and residual_col in df.columns:
        data = df[residual_col].dropna()
    elif iv_cols and dv_col:
        from numpy.linalg import lstsq
        X = df[iv_cols].values.astype(float)
        y = df[dv_col].values.astype(float)
        X_with_const = np.column_stack([np.ones(len(X)), X])
        beta, _, _, _ = lstsq(X_with_const, y, rcond=None)
        residuals = y - X_with_const @ beta
        data = pd.Series(residuals)
    else:
        return json.dumps({'error': 'No data for normality test'})

    N = len(data)
    if N < 50:
        # Shapiro-Wilk: standar SPSS untuk sampel kecil
        stat, p = stats.shapiro(data)
        test_name = 'Shapiro-Wilk'
    else:
        # KS dengan standarisasi (mendekati Lilliefors)
        standardized = (data - data.mean()) / data.std(ddof=1)
        stat, p = stats.kstest(standardized, 'norm')
        test_name = 'Kolmogorov-Smirnov (Lilliefors)'

    return json.dumps({
        'test': test_name,
        'n': N,
        'statistic': round(float(stat), 4),
        'p_value': round(float(p), 4),
        'alpha': 0.05,
        'normal': bool(p > 0.05),
        'conclusion': 'Data berdistribusi normal (p > 0.05)' if p > 0.05 else 'Data TIDAK berdistribusi normal (p <= 0.05)',
        'mean': round(float(data.mean()), 4),
        'std': round(float(data.std(ddof=1)), 4)
    })

# ============================================================
# UJI MULTIKOLINEARITAS (VIF & Tolerance via OLS)
# ============================================================

def run_multicollinearity(df, iv_cols, dv_col):
    X = df[iv_cols].values.astype(float)
    results = []
    for i, col in enumerate(iv_cols):
        other_idx = [j for j in range(len(iv_cols)) if j != i]
        if len(other_idx) == 0:
            results.append({
                'variable': col, 'tolerance': 1.0, 'vif': 1.0,
                'ok_tolerance': True, 'ok_vif': True,
                'conclusion': 'Bebas multikolinearitas'
            })
            continue
        X_i = X[:, i]
        X_others = X[:, other_idx]
        X_others_const = np.column_stack([np.ones(len(X_others)), X_others])
        beta, _, _, _ = np.linalg.lstsq(X_others_const, X_i, rcond=None)
        predicted = X_others_const @ beta
        ss_res = float(np.sum((X_i - predicted) ** 2))
        ss_tot = float(np.sum((X_i - np.mean(X_i)) ** 2))
        r_sq = 1 - ss_res / ss_tot if ss_tot > 0 else 0
        tolerance = 1 - r_sq
        vif = 1 / (1 - r_sq) if r_sq < 1 else float('inf')
        ok_t = bool(tolerance > 0.1)
        ok_v = bool(vif < 10)
        results.append({
            'variable': col,
            'tolerance': round(float(tolerance), 4),
            'vif': round(float(vif), 4),
            'ok_tolerance': ok_t, 'ok_vif': ok_v,
            'conclusion': 'Bebas multikolinearitas' if (ok_t and ok_v) else 'Ada multikolinearitas'
        })
    return json.dumps(results)

# ============================================================
# UJI HETEROSKEDASTISITAS (Glejser)
# ============================================================

def run_heteroscedasticity(df, iv_cols, dv_col):
    from numpy.linalg import lstsq
    X = df[iv_cols].values.astype(float)
    y = df[dv_col].values.astype(float)
    X_const = np.column_stack([np.ones(len(X)), X])
    beta, _, _, _ = lstsq(X_const, y, rcond=None)
    residuals = np.abs(y - X_const @ beta)

    results = []
    for i, col in enumerate(iv_cols):
        slope, intercept, r, p, se = stats.linregress(
            df[col].values.astype(float), residuals)
        results.append({
            'variable': col,
            'b': round(float(slope), 4),
            'sig': round(float(p), 4),
            'r': round(float(r), 4),
            'heteroscedastic': bool(p < 0.05),
            'conclusion': 'Ada heteroskedastisitas (p < 0.05)' if p < 0.05 else 'Bebas heteroskedastisitas (p >= 0.05)'
        })
    return json.dumps({
        'method': 'Glejser',
        'tests': results,
        'overall': 'Bebas heteroskedastisitas' if all(bool(r['sig'] >= 0.05) for r in results) else 'Terdeteksi heteroskedastisitas'
    })

# ============================================================
# UJI AUTOKORELASI (Durbin-Watson dengan tabel dL/dU)
# ============================================================

def run_autocorrelation(df, iv_cols, dv_col):
    from numpy.linalg import lstsq
    X = df[iv_cols].values.astype(float)
    y = df[dv_col].values.astype(float)
    X_const = np.column_stack([np.ones(len(X)), X])
    beta, _, _, _ = lstsq(X_const, y, rcond=None)
    residuals = y - X_const @ beta
    n = len(residuals)
    k = len(iv_cols)

    diff_resid = np.diff(residuals)
    dw = float(np.sum(diff_resid ** 2) / np.sum(residuals ** 2))

    conclusion, dL, dU, rule = interpret_dw(dw, n, k)

    return json.dumps({
        'dw_statistic': round(dw, 4),
        'n': n, 'k': k,
        'dL': dL, 'dU': dU,
        'dU_4': round(4 - dU, 4),
        'dL_4': round(4 - dL, 4),
        'conclusion': conclusion,
        'rule': rule,
        'interpretation': {
            'd < dL': 'Positif autokorelasi',
            'dL <= d < dU': 'Inkonklusif (zona positif)',
            'dU <= d <= 4-dU': 'Tidak ada autokorelasi',
            '4-dU < d <= 4-dL': 'Inkonklusif (zona negatif)',
            'd > 4-dL': 'Negatif autokorelasi'
        }
    })

# ============================================================
# REGRESI LINEAR BERGANDA (OLS - output mirip SPSS)
# ============================================================

def run_regression(df, iv_cols, dv_col):
    from scipy import stats as scipy_stats
    from numpy.linalg import lstsq, inv

    X = df[iv_cols].values.astype(float)
    y = df[dv_col].values.astype(float)
    n = len(y)
    k = len(iv_cols)

    X_const = np.column_stack([np.ones(n), X])
    beta, residuals_sum, rank, sv = lstsq(X_const, y, rcond=None)
    y_pred = X_const @ beta
    residuals = y - y_pred
    ss_res = float(np.sum(residuals ** 2))
    ss_tot = float(np.sum((y - np.mean(y)) ** 2))
    ss_reg = ss_tot - ss_res

    r_sq = 1 - ss_res / ss_tot
    adj_r_sq = 1 - (1 - r_sq) * (n - 1) / (n - k - 1)
    mse = ss_res / (n - k - 1)

    try:
        se = np.sqrt(np.diag(mse * inv(X_const.T @ X_const)))
    except:
        se = np.full(k + 1, float('nan'))

    t_values = beta / se
    p_values = 2 * (1 - scipy_stats.t.cdf(np.abs(t_values), df=n - k - 1))

    ms_reg = ss_reg / k
    ms_res = mse
    f_stat = ms_reg / ms_res
    f_p = 1 - scipy_stats.f.cdf(f_stat, k, n - k - 1)

    # Standardized Beta
    std_x = np.std(X, axis=0, ddof=1)
    std_y = np.std(y, ddof=1)
    std_beta = np.zeros(k)
    for i in range(k):
        std_beta[i] = beta[i + 1] * std_x[i] / std_y

    # Durbin-Watson
    dw = float(np.sum(np.diff(residuals) ** 2) / np.sum(residuals ** 2))
    r_multiple = float(np.sqrt(r_sq))
    std_error_est = float(np.sqrt(mse))

    # Coefficients table
    coefficients = []
    coefficients.append({
        'variable': 'Constant',
        'b': round(float(beta[0]), 4),
        'se': round(float(se[0]), 4),
        'beta': '-',
        't': round(float(t_values[0]), 4),
        'p': round(float(p_values[0]), 4),
        'significant': bool(p_values[0] < 0.05)
    })
    for i, col in enumerate(iv_cols):
        coefficients.append({
            'variable': col,
            'b': round(float(beta[i + 1]), 4),
            'se': round(float(se[i + 1]), 4),
            'beta': round(float(std_beta[i]), 4),
            't': round(float(t_values[i + 1]), 4),
            'p': round(float(p_values[i + 1]), 4),
            'significant': bool(p_values[i + 1] < 0.05)
        })

    # Equation string
    eq_parts = [f'{round(float(beta[0]), 4)}']
    for i, col in enumerate(iv_cols):
        b = round(float(beta[i + 1]), 4)
        sign = ' + ' if b >= 0 else ' - '
        eq_parts.append(f'{sign}{abs(b)} * {col}')
    equation = f'{dv_col} = {"".join(eq_parts)}'

    return json.dumps({
        'model_summary': {
            'r': round(r_multiple, 4),
            'r_squared': round(float(r_sq), 4),
            'adj_r_squared': round(float(adj_r_sq), 4),
            'std_error_estimate': round(std_error_est, 4),
            'r_squared_pct': f'{round(float(r_sq) * 100, 2)}%',
            'adj_r_squared_pct': f'{round(float(adj_r_sq) * 100, 2)}%'
        },
        'anova': {
            'regression': {
                'ss': round(float(ss_reg), 4), 'df': int(k),
                'ms': round(float(ms_reg), 4),
                'f': round(float(f_stat), 4),
                'sig': round(float(f_p), 4)
            },
            'residual': {
                'ss': round(float(ss_res), 4), 'df': int(n - k - 1),
                'ms': round(float(ms_res), 4)
            },
            'total': {
                'ss': round(float(ss_tot), 4), 'df': int(n - 1)
            }
        },
        'coefficients': coefficients,
        'equation': equation,
        'durbin_watson': round(dw, 4),
        'n': n, 'k': k
    })

# ============================================================
# UJI F (Simultan) - dari ANOVA table
# ============================================================

def run_f_test(df, iv_cols, dv_col):
    result = json.loads(run_regression(df, iv_cols, dv_col))
    anova = result['anova']
    f_crit = float(stats.f.ppf(0.95, anova['regression']['df'], anova['residual']['df']))
    f_hit = anova['regression']['f']
    p_val = anova['regression']['sig']
    significant = bool(p_val < 0.05)

    return json.dumps({
        'f_statistic': f_hit,
        'f_critical': round(f_crit, 4),
        'p_value': p_val,
        'df_regression': anova['regression']['df'],
        'df_residual': anova['residual']['df'],
        'ss_regression': anova['regression']['ss'],
        'ss_residual': anova['residual']['ss'],
        'ms_regression': anova['regression']['ms'],
        'ms_residual': anova['residual']['ms'],
        'significant': significant,
        'conclusion': f"F-hitung ({f_hit}) > F-tabel ({round(f_crit, 4)}) atau p ({p_val}) < 0.05, maka H0 ditolak. Variabel independen secara SIMULTAN berpengaruh signifikan terhadap {dv_col}." if significant else f"F-hitung ({f_hit}) <= F-tabel ({round(f_crit, 4)}) atau p ({p_val}) >= 0.05, maka H0 diterima. Variabel independen secara SIMULTAN TIDAK berpengaruh signifikan terhadap {dv_col}."
    })

# ============================================================
# UJI t (Parsial) - dari coefficients table
# ============================================================

def run_t_test(df, iv_cols, dv_col):
    result = json.loads(run_regression(df, iv_cols, dv_col))
    t_crit = float(stats.t.ppf(0.975, result['anova']['residual']['df']))

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
                'b': coef['b'], 'se': coef['se'], 'beta': coef['beta'],
                'conclusion': f"{coef['variable']} berpengaruh SIGNIFIKAN terhadap DV (t-hitung {coef['t']} > t-tabel {round(t_crit, 4)}, p = {coef['p']})" if sig else f"{coef['variable']} TIDAK berpengaruh signifikan terhadap DV (t-hitung {coef['t']} <= t-tabel {round(t_crit, 4)}, p = {coef['p']})"
            })

    return json.dumps({
        't_critical': round(t_crit, 4),
        'df': result['anova']['residual']['df'],
        'tests': tests
    })

# ============================================================
# R-SQUARED
# ============================================================

def run_r_squared(df, iv_cols, dv_col):
    result = json.loads(run_regression(df, iv_cols, dv_col))
    model = result['model_summary']
    return json.dumps({
        'r': model['r'],
        'r_squared': model['r_squared'],
        'adj_r_squared': model['adj_r_squared'],
        'r_squared_pct': model['r_squared_pct'],
        'adj_r_squared_pct': model['adj_r_squared_pct'],
        'std_error_estimate': model['std_error_estimate'],
        'interpretation': f"Variabel independen menjelaskan {model['r_squared_pct']} variasi variabel dependen. Sisanya ({round((1 - model['r_squared']) * 100, 2)}%) dijelaskan oleh variabel lain di luar model."
    })

# ============================================================
# MAIN ANALYSIS RUNNER
# ============================================================

def run_analysis(data_json, iv_cols, dv_col, selected_tests):
    import json as j
    df = pd.DataFrame(j.loads(data_json))
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
