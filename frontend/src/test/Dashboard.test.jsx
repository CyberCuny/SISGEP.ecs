import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Dashboard from '../pages/Dashboard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k }),
}));

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { results: [], count: 0 } }),
    post: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { is_staff: false, roles: [] } }),
}));

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }),
}));

vi.mock('react-chartjs-2', () => ({
  Doughnut: () => null,
  Bar: () => null,
}));

describe('Dashboard', () => {
  it('renders page title', async () => {
    render(<BrowserRouter><Dashboard /></BrowserRouter>);
    expect(screen.getByText('page.dashboard.title')).toBeInTheDocument();
  });

  it('hides new activity button for executor', () => {
    render(<BrowserRouter><Dashboard /></BrowserRouter>);
    expect(screen.queryByText('page.dashboard.new_activity')).not.toBeInTheDocument();
  });

  it('hides view approvals button for executor', () => {
    render(<BrowserRouter><Dashboard /></BrowserRouter>);
    expect(screen.queryByText('page.dashboard.view_approvals')).not.toBeInTheDocument();
  });
});
