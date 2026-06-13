import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import { publicRoutes, protectedRoutes } from './routes';

const NotFound = lazy(() => import('./pages/NotFound'));

function PageLoader() {
  return (
    <div className="page-loader">
      <div className="skeleton" style={{ width: '60%', height: 24, marginBottom: 16 }} />
      <div className="skeleton" style={{ width: '100%', height: 120 }} />
      <div className="skeleton" style={{ width: '100%', height: 120, marginTop: 12 }} />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {publicRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          {protectedRoutes.map((r) => (
            <Route key={r.path} path={r.path} element={r.element} />
          ))}
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}