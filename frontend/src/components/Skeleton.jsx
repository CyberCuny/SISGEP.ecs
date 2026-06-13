export function SkeletonText({ lines = 3, width, lastShort = true }) {
  return (
    <div>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skeleton skeleton-text"
          style={i === lines - 1 && lastShort ? { width: '60%' } : width ? { width } : undefined} />
      ))}
    </div>
  );
}

export function SkeletonCard({ height = '120px' }) {
  return <div className="skeleton" style={{ height, borderRadius: 'var(--radius-lg)', marginBottom: '1rem' }} />;
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            {Array.from({ length: cols }, (_, i) => (
              <th key={i}><div className="skeleton skeleton-text short" style={{ margin: 0 }} /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }, (_, c) => (
                <td key={c}><div className="skeleton skeleton-text" style={{ width: `${50 + Math.random() * 40}%`, margin: 0 }} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonFilters() {
  return (
    <div className="card" style={{ marginBottom: '0.75rem' }}>
      <div className="filter-bar">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="form-group" style={{ minWidth: '140px' }}>
            <div className="skeleton skeleton-text short" style={{ marginBottom: '0.35rem' }} />
            <div className="skeleton" style={{ height: '34px', borderRadius: 'var(--radius-sm)' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
