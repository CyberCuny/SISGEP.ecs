import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Reports from '../pages/Reports';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k }),
}));

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { results: [] } }),
    post: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { is_staff: false, roles: [] } }),
}));

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }),
}));

describe('Reports', () => {
  it('shows no_access for executor', () => {
    render(<BrowserRouter><Reports /></BrowserRouter>);
    expect(screen.getByText('page.reports.no_access')).toBeInTheDocument();
  });
});
