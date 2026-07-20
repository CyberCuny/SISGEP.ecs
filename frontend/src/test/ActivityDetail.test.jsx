import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import ActivityDetail from '../pages/ActivityDetail';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k }),
}));

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn().mockImplementation((url) => {
      if (url.startsWith('/activities/')) return Promise.resolve({ data: { id: 1, description: 'Test Activity', created_by: 1 } });
      if (url.startsWith('/users/')) return Promise.resolve({ data: { results: [{ id: 1, display_name: 'User A' }] } });
      return Promise.resolve({ data: { results: [] } });
    }),
    delete: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../services', () => ({
  scheduleService: { list: vi.fn().mockResolvedValue({ data: { results: [] } }) },
  activityService: {
    mapToUser: vi.fn().mockResolvedValue({}),
    assignToUnits: vi.fn().mockResolvedValue({}),
    distribute: vi.fn().mockResolvedValue({}),
  },
  unitService: { list: vi.fn().mockResolvedValue({ data: { results: [] } }) },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { is_staff: true, roles: [] } }),
}));

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useParams: () => ({ id: '1' }) };
});

describe('ActivityDetail', () => {
  it('renders heading with activity title', async () => {
    render(<BrowserRouter><ActivityDetail /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Test Activity');
    });
  });

  it('renders general info section', async () => {
    render(<BrowserRouter><ActivityDetail /></BrowserRouter>);
    await waitFor(() => expect(screen.getByText('page.activity_detail.general_info')).toBeInTheDocument());
  });

  it('renders action buttons for staff', async () => {
    render(<BrowserRouter><ActivityDetail /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByTitle('page.activity_detail.edit')).toBeInTheDocument();
      expect(screen.getByTitle('page.activity_detail.distribute')).toBeInTheDocument();
      expect(screen.getByTitle('page.activity_detail.assign_units')).toBeInTheDocument();
      expect(screen.getByTitle('page.activity_detail.map_user')).toBeInTheDocument();
    });
  });

  it('renders comments section', async () => {
    render(<BrowserRouter><ActivityDetail /></BrowserRouter>);
    await waitFor(() => expect(screen.getByText('comments.title')).toBeInTheDocument());
  });

  it('renders attachments section', async () => {
    render(<BrowserRouter><ActivityDetail /></BrowserRouter>);
    await waitFor(() => expect(screen.getByText('attachments.title')).toBeInTheDocument());
  });
});
