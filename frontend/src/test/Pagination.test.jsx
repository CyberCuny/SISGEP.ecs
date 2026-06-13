import { render, screen, fireEvent } from '@testing-library/react';
import Pagination from '../components/Pagination';
import { describe, it, expect, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k }),
}));

describe('Pagination', () => {
  it('returns null when totalPages <= 1', () => {
    const { container } = render(<Pagination count={5} page={1} pageSize={10} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders page buttons for multiple pages', () => {
    render(<Pagination count={50} page={1} pageSize={10} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls onPageChange when a page is clicked', () => {
    const onPageChange = vi.fn();
    render(<Pagination count={50} page={1} pageSize={10} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByText('2'));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('disables prev button on first page', () => {
    render(<Pagination count={50} page={1} pageSize={10} />);
    expect(screen.getAllByRole('button')[0]).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(<Pagination count={50} page={5} pageSize={10} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[buttons.length - 1]).toBeDisabled();
  });
});
