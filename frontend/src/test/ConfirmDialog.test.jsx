import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmDialog from '../components/ConfirmDialog';
import { describe, it, expect, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k }),
}));

describe('ConfirmDialog', () => {
  it('returns null when open is false', () => {
    const { container } = render(<ConfirmDialog open={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders title and message when open', () => {
    render(<ConfirmDialog open={true} title="Eliminar" message="¿Está seguro?" />);
    expect(screen.getByText('Eliminar')).toBeInTheDocument();
    expect(screen.getByText('¿Está seguro?')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog open={true} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: 'common.confirm' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog open={true} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
