import { Link } from 'react-router-dom';

export default function Breadcrumbs({ items }) {
  return (
    <nav className="breadcrumbs" aria-label="breadcrumb">
      {items.map((item, i) => (
        <span key={i}>
          {i > 0 && <span className="breadcrumb-sep">/</span>}
          {item.to ? (
            <Link to={item.to} className="breadcrumb-link">{item.label}</Link>
          ) : (
            <span className="breadcrumb-current">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
