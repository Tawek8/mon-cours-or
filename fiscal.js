// Règles communes au comparateur d'achat et à l'estimation client.
window.GoldFiscal = (() => {
  const amount = value => {
    const s = String(value ?? '')
      .replace(/\s/g, '')
      .replace(',', '.');
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };
  function date(value, today = new Date()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return null;
    const [y, m, d] = value.split('-').map(Number),
      result = new Date(y, m - 1, d, 12);
    const limit = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
    return result.getFullYear() === y &&
      result.getMonth() === m - 1 &&
      result.getDate() === d &&
      result <= limit
      ? result
      : null;
  }
  function compare(gross, costRaw, dateRaw, today = new Date()) {
    if (!Number.isFinite(gross) || gross < 0) return null;
    const tmp = gross * 0.115,
      cost = amount(costRaw),
      acquired = date(dateRaw, today);
    if (cost === null || !acquired)
      return { tmp, pv: null, tax: tmp, regime: 'TMP', complete: false, years: 0, allowance: 0 };
    let years = today.getFullYear() - acquired.getFullYear();
    if (
      today.getMonth() < acquired.getMonth() ||
      (today.getMonth() === acquired.getMonth() && today.getDate() < acquired.getDate())
    )
      years--;
    const allowance = Math.min(1, Math.max(0, years - 2) * 0.05),
      gain = Math.max(0, gross - cost),
      pv = gain * (1 - allowance) * 0.362;
    const regime = pv < tmp ? 'TPV' : 'TMP';
    return {
      tmp,
      pv,
      tax: Math.min(tmp, pv),
      regime,
      complete: true,
      years,
      allowance,
      gain,
      cost,
    };
  }
  return { amount, date, compare };
})();
