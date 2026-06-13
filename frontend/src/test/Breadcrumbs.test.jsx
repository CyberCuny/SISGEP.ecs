import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs';
import { describe, it, expect } from 'vitest';

describe('Breadcrumbs', () => {
  it('renders a single item without link', () => {
    render(<BrowserRouter><Breadcrumbs items={[{ label: 'Inicio' }]} /></BrowserRouter>);
    expect(screen.getByText('Inicio')).toBeInTheDocument();
  });

  it('renders multiple items with separator', () => {
    render(
      <BrowserRouter>
        <Breadcrumbs items={[{ to: '/', label: 'Inicio' }, { label: 'Actividades' }]} />
      </BrowserRouter>
    );
    expect(screen.getByText('Inicio')).toBeInTheDocument();
    expect(screen.getByText('Actividades')).toBeInTheDocument();
  });

  it('renders link for items with "to" prop', () => {
    render(<BrowserRouter><Breadcrumbs items={[{ to: '/test', label: 'Link' }]} /></BrowserRouter>);
    const link = screen.getByRole('link', { name: 'Link' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test');
  });
});
