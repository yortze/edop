/**
 * Marque E-DOP : hexagone magenta, colis en volume à l'intérieur,
 * traits de vitesse à gauche — repris du logo de la fiche tarifaire.
 */
export function LogoMark({ size = 34, mono = false }) {
  const id = `edop-g-${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ff4fa3" />
          <stop offset="0.5" stopColor="#e5308f" />
          <stop offset="1" stopColor="#d81159" />
        </linearGradient>
      </defs>

      {/* Traits de vitesse */}
      <g stroke={mono ? 'currentColor' : '#e5308f'} strokeWidth="2.6" strokeLinecap="round" opacity={mono ? 0.5 : 0.85}>
        <path d="M2 17h6" />
        <path d="M0.5 24h5" />
        <path d="M2 31h6" />
      </g>

      {/* Hexagone */}
      <path
        d="M26.2 3.6a5.6 5.6 0 0 0-5.6 0L11.4 8.9a5.6 5.6 0 0 0-2.8 4.85v10.5a5.6 5.6 0 0 0 2.8 4.85l9.2 5.3a5.6 5.6 0 0 0 5.6 0l9.2-5.3a5.6 5.6 0 0 0 2.8-4.85v-10.5a5.6 5.6 0 0 0-2.8-4.85z"
        transform="translate(4 5)"
        fill={mono ? 'currentColor' : `url(#${id})`}
      />

      {/* Colis en volume */}
      <g stroke="#fff" strokeWidth="2.1" strokeLinejoin="round" strokeLinecap="round" fill="none">
        <path d="M27.6 20.2 20 24.4l-7.6-4.2 7.6-4.2z" transform="translate(4 5)" />
        <path d="M12.4 20.2v8.2l7.6 4.2v-8.2" transform="translate(4 5)" />
        <path d="M27.6 20.2v8.2L20 32.6" transform="translate(4 5)" />
      </g>
    </svg>
  );
}

export function Brand({ size = 34, sub = 'Achetez, nous vous livrons', light = false }) {
  return (
    <span className="brand">
      <LogoMark size={size} mono={light} />
      <span className="brand-word" style={light ? { color: '#fff' } : undefined}>
        E-DOP
        {sub && <small>{sub}</small>}
      </span>
    </span>
  );
}

export default Brand;
