import { FRUIT_COLORS } from '../api.js';

export const PageHeader = ({ title, subtitle, children }) => (
  <div className="page-head"><div><h1>{title}</h1>{subtitle && <p className="muted">{subtitle}</p>}</div><div className="actions">{children}</div></div>
);

export const SearchBox = ({ value, onChange, placeholder = 'Search…' }) => (
  <input className="search" type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
);

export const FilterSelect = ({ value, onChange, options, label }) => (
  <select className="filter" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
    <option value="">{label}</option>
    {options.map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
  </select>
);

export const Badge = ({ status }) => <span className={`badge s-${status.toLowerCase().replace(/[^a-z]+/g, '-')}`}>{status}</span>;

export const FruitChip = ({ name }) => <span className="fruit"><i style={{ background: FRUIT_COLORS[name] || '#999' }} />{name}</span>;

export const Empty = ({ children }) => <div className="empty">{children}</div>;

export function BarChart({ data, format = (v) => v }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="bars">
      {data.map((d) => (
        <div className="bar-row" key={d.label}>
          <span className="bar-label">{d.label}</span>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${(d.value / max) * 100}%`, background: d.color }} /></div>
          <span className="bar-value">{format(d.value)}</span>
        </div>
      ))}
    </div>
  );
}

export const FormError = ({ message }) => (message ? <div className="form-error" role="alert">{message}</div> : null);
