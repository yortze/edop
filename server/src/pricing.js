// Moteur tarifaire E-DOP — la même logique est reprise côté client (client/src/pricing.js)
// pour l'estimation instantanée ; le serveur reste la source de vérité.

export function roundWeight(weightKg, stepKg = 0.1) {
  const step = Number(stepKg) || 0.1;
  const w = Math.max(0, Number(weightKg) || 0);
  // Poids arrondi au 100 g supérieur (ex. 1,45 kg -> 1,5 kg)
  return Math.ceil((w - 1e-9) / step) * step;
}

/**
 * Calcule le prix d'une expédition.
 * @param {{price_eur:number|null, value_pct:number, quote_only:number}} category
 * @param {number} weightKg poids brut
 * @param {number} declaredValueEur valeur déclarée du contenu
 * @param {object} settings réglages (seuil, %, taux FCFA, pas d'arrondi)
 */
export function computePrice(category, weightKg, declaredValueEur, settings) {
  const step = Number(settings.weight_step_kg) || 0.1;
  const rate = Number(settings.fcfa_rate) || 650;
  const threshold = Number(settings.declaration_threshold_eur) || 300;
  const globalPct = Number(settings.value_surcharge_pct) || 10;

  const billedWeight = roundWeight(weightKg, step);
  const value = Math.max(0, Number(declaredValueEur) || 0);

  if (!category || category.quote_only || category.price_eur == null) {
    return {
      quote_only: true,
      billed_weight_kg: billedWeight,
      declared_value_eur: value,
      base_eur: 0,
      surcharge_eur: 0,
      surcharge_pct: 0,
      total_eur: 0,
      total_fcfa: 0,
      declaration_required: value >= threshold,
      fcfa_rate: rate
    };
  }

  const base = billedWeight * Number(category.price_eur);

  // Deux sources de majoration à la valeur :
  //  - la catégorie « objets de valeur » majore dès le premier euro (value_pct) ;
  //  - au-delà du seuil de déclaration, la majoration générale s'applique.
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
