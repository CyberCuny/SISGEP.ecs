import { render, screen } from '@testing-library/react';
import Spinner from '../components/Spinner';
import { describe, it, expect } from 'vitest';

describe('Spinner', () => {
  it('renders loading text', () => {
    render(<Spinner />);
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('renders spinner div', () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector('.spinner')).toBeInTheDocument();
  });
});
