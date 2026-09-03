import { Search } from 'lucide-react';

export default function SearchInput({ value, onChange, placeholder = 'Rechercher…' }) {
  return (
    <div className="search">
      <span className="ic"><Search size={18} /></span>
      <input
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
