import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Approvals from '../pages/Approvals';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k }),
}));

const mockGet = vi.hoisted(() => vi.fn().mockResolvedValue({ data: [] }));

vi.mock('../services/api', () => ({
  default: {
    get: mockGet,
    post: vi.fn().mockResolvedValue({}),
  },
}));

const mockUseAuth = vi.hoisted(() => vi.fn().mockReturnValue({ user: { is_staff: true, roles: [] } }));

vi.mock('../context/AuthContext', () => ({
  useAuth: mockUseAuth,
}));

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }),
}));

describe('Approvals', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockGet.mockResolvedValue({ data: [] });
  });

  it('renders page title', () => {
    render(<BrowserRouter><Approvals /></BrowserRouter>);
    expect(screen.getByText('page.approvals.title')).toBeInTheDocument();
  });

  it('shows empty state for activities tab', async () => {
    render(<BrowserRouter><Approvals /></BrowserRouter>);
    await waitFor(() => expect(screen.getByText('page.approvals.empty_activities')).toBeInTheDocument());
  });

  it('fetches pending approvals on mount', async () => {
    render(<BrowserRouter><Approvals /></BrowserRouter>);
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/activities/pending_approval/');
    });
  });

  it('renders activity and cronogram tabs', () => {
    render(<BrowserRouter><Approvals /></BrowserRouter>);
    expect(screen.getByText(/page.approvals.tab_activities/)).toBeInTheDocument();
    expect(screen.getByText(/page.approvals.tab_cronograms/)).toBeInTheDocument();
  });

  it('shows approve all button when activities are pending', async () => {
    mockGet.mockResolvedValueOnce({ data: [{ id: 1, activity_description: 'Test Act', status: 'Nuevo' }] });
    mockGet.mockResolvedValueOnce({ data: [] });
    render(<BrowserRouter><Approvals /></BrowserRouter>);
    await waitFor(() => expect(screen.getByText(/page.approvals.approve_all/)).toBeInTheDocument());
  });

  it('shows no access message for non-approver', async () => {
    mockUseAuth.mockReturnValue({ user: { is_staff: false, roles: [] } });
    render(<BrowserRouter><Approvals /></BrowserRouter>);
    await waitFor(() => expect(screen.getByText('page.approvals.no_access')).toBeInTheDocument());
  });
});
