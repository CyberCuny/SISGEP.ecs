import { lazy } from 'react';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Activities = lazy(() => import('./pages/Activities'));
const ActivityForm = lazy(() => import('./pages/ActivityForm'));
const ActivityDetail = lazy(() => import('./pages/ActivityDetail'));
const Schedule = lazy(() => import('./pages/Schedule'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const CalendarIndividual = lazy(() => import('./pages/CalendarIndividual'));
const CalendarAnnual = lazy(() => import('./pages/CalendarAnnual'));
const Compliance = lazy(() => import('./pages/Compliance'));
const Approvals = lazy(() => import('./pages/Approvals'));
const Units = lazy(() => import('./pages/Units'));
const Users = lazy(() => import('./pages/Users'));
const Catalog = lazy(() => import('./pages/Catalog'));
const Reports = lazy(() => import('./pages/Reports'));
const ImportPage = lazy(() => import('./pages/ImportPage'));
const WorkDays = lazy(() => import('./pages/WorkDays'));
const AuditLog = lazy(() => import('./pages/AuditLog'));
const Profile = lazy(() => import('./pages/Profile'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Messages = lazy(() => import('./pages/Messages'));
const Backup = lazy(() => import('./pages/Backup'));
const EmailConfig = lazy(() => import('./pages/EmailConfig'));
const SystemConfig = lazy(() => import('./pages/SystemConfig'));
const Guidelines = lazy(() => import('./pages/Guidelines'));
const ApprovedPlans = lazy(() => import('./pages/ApprovedPlans'));
const Roles = lazy(() => import('./pages/Roles'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const NotFound = lazy(() => import('./pages/NotFound'));

export const publicRoutes = [
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  { path: '/forgot-password', element: <ForgotPassword /> },
  { path: '/reset-password', element: <ResetPassword /> },
  { path: '/verify-email', element: <VerifyEmail /> },
];

export const protectedRoutes = [
  { path: '/', element: <Dashboard /> },
  { path: '/activities', element: <Activities /> },
  { path: '/activities/new', element: <ActivityForm /> },
  { path: '/activities/:id/edit', element: <ActivityForm /> },
  { path: '/activities/:id', element: <ActivityDetail /> },
  { path: '/schedule', element: <Schedule /> },
  { path: '/calendar', element: <CalendarPage /> },
  { path: '/calendar-individual', element: <CalendarIndividual /> },
  { path: '/calendar-annual', element: <CalendarAnnual /> },
  { path: '/compliance', element: <Compliance /> },
  { path: '/approvals', element: <Approvals /> },
  { path: '/units', element: <Units /> },
  { path: '/users', element: <Users /> },
  { path: '/catalog', element: <Catalog /> },
  { path: '/reports', element: <Reports /> },
  { path: '/import', element: <ImportPage /> },
  { path: '/work-days', element: <WorkDays /> },
  { path: '/audit-log', element: <AuditLog /> },
  { path: '/profile', element: <Profile /> },
  { path: '/notifications', element: <Notifications /> },
  { path: '/messages', element: <Messages /> },
  { path: '/backups', element: <Backup /> },
  { path: '/guidelines', element: <Guidelines /> },
  { path: '/approved-plans', element: <ApprovedPlans /> },
  { path: '/roles', element: <Roles /> },
  { path: '/email-config', element: <EmailConfig /> },
  { path: '/system-config', element: <SystemConfig /> },
];

