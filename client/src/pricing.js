// Miroir client du moteur tarifaire (server/src/pricing.js) : permet l'estimation
// instantanée pendant la saisie, sans aller-retour réseau. Le serveur reste la
// référence lors de l'enregistrement d'un devis ou d'un colis.

export function roundWeight(weightKg, stepKg = 0.1) {
  const step = Number(stepKg) || 0.1;
  const w = Math.max(0, Number(weightKg) || 0);
  return Math.ceil((w - 1e-9) / step) * step;
}

export function computePrice(category, weightKg, declaredValueEur, settings = {}) {
  const step = Number(settings.weight_step_kg) || 0.1;
  const rate = Number(settings.fcfa_rate) || 650;
  const threshold = Number(settings.declaration_threshold_eur) || 300;
  const globalPct = Number(settings.value_surcharge_pct) || 10;

  const billedWeight = roundWeight(weightKg, step);
  const value = Math.max(0, Number(declaredValueEur) || 0);

  if (!category || category.quote_only || category.price_eur == null) {
    return {
      quote_only: true,
      billed_weight_kg: round2(billedWeight),
      declared_value_eur: value,
      base_eur: 0, surcharge_eur: 0, surcharge_pct: 0,
      total_eur: 0, total_fcfa: 0,
      declaration_required: value >= threshold,
      fcfa_rate: rate
    };
  }

  const base = billedWeight * Number(category.price_eur);
  const catPct = Number(category.value_pct) || 0;
  const pct = value >= threshold ? Math.max(catPct, globalPct) : catPct;
  const surcharge = (value * pct) / 100;
  const total = base + surcharge;

  return {
    quote_only: false,
    billed_weight_kg: round2(billedWeight),
    declared_value_eur: value,
    base_eur: round2(base),
    surcharge_eur: round2(surcharge),
    surcharge_pct: pct,
    total_eur: round2(total),
    total_fcfa: Math.round(total * rate),
    declaration_required: value >= threshold,
    fcfa_rate: rate
  };
}

export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function eurToFcfa(eur, rate = 650) {
  return Math.round((Number(eur) || 0) * (Number(rate) || 650));
}
