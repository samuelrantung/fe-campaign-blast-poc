// Filter/action bar above tables.
export function Toolbar({ children }) {
  return <div className="toolbar">{children}</div>;
}

// Search input with a leading magnifier icon (styled via CSS).
export function Search({ value, onChange, placeholder }) {
  return (
    <div className="search">
      <input
        className="input"
        type="text"
        value={value}
        placeholder={placeholder || 'Search'}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

// Native select with consistent styling. options: [{value,label}] or strings.
export function Select({ value, onChange, options, style }) {
  return (
    <select
      className="select"
      style={{ width: 'auto', ...(style || {}) }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
      ))}
    </select>
  );
}

// Segmented control (small inline toggle group).
export function Segmented({ value, onChange, options }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button
          key={o.value}
          className={value === o.value ? 'on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
