import { STATUS_META, QUOTE_STATUS_META, statusLabel } from '../api.js';

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export default function StatusBadge({ status, kind = 'shipment', mode = 'air' }) {
  const meta = (kind === 'quote' ? QUOTE_STATUS_META : STATUS_META)[status]
    || { label: status, color: '#7a6a78' };
  const label = kind === 'quote' ? meta.label : statusLabel(status, mode);
  return (
    <span className="badge" style={{ color: meta.color, background: hexToRgba(meta.color, 0.14) }}>
      <span className="pip" />
      {label}
    </span>
  );
}
