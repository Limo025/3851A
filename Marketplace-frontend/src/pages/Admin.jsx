import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminAppeal from '../components/AdminAppeal.jsx';
import AdminDefault from '../components/AdminDefault.jsx';
import AdminReports from '../components/AdminReports.jsx';
import { handleAuthenticationError } from '../auth/handleAuthenticationError.js';
import { session } from '../auth/session.js';
import '../css/styles/admin.css';

const ADMIN_MODE_STORAGE_KEY = 'adminMode';
const ADMIN_MODES = [
  { id: 'default', label: 'Users & listings', Component: AdminDefault },
  { id: 'appeal', label: 'Appeals', Component: AdminAppeal },
  { id: 'reports', label: 'Reports', Component: AdminReports },
];

const validAdminModes = new Set(ADMIN_MODES.map(({ id }) => id));

function getInitialMode() {
  if (typeof window === 'undefined') return ADMIN_MODES[0].id;

  const storedMode = window.localStorage.getItem(ADMIN_MODE_STORAGE_KEY);
  return validAdminModes.has(storedMode) ? storedMode : ADMIN_MODES[0].id;
}

export default function Admin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [userRefresh, setUserRefresh] = useState(0);
  const [currentMode, setCurrentMode] = useState(getInitialMode);

  const report = useCallback((errorValue) => {
    if (!handleAuthenticationError(errorValue, { sessionManager: session, navigate, returnPath: location.pathname })) {
      setError(errorValue.message || 'The request failed. Please try again.');
    }
  }, [navigate, location.pathname]);

  const sharedProps = { pending, setPending, setError, setNotice, report };
  const activeMode = ADMIN_MODES.find(({ id }) => id === currentMode) ?? ADMIN_MODES[0];
  const ActiveComponent = activeMode.Component;

  function changeMode(mode) {
    if (!validAdminModes.has(mode)) return;

    window.localStorage.setItem(ADMIN_MODE_STORAGE_KEY, mode);
    setCurrentMode(mode);
    setError('');
    setNotice('');
  }

  useEffect(() => {
    document.title = 'ADMIN | UON Marketplace';
  }, []);

  return (
    <main className="admin-page">
      <div className="admin-page__inner">
        <h1>Admin</h1>
        <p>Manage users, listings, reports, and ban appeals.</p>
        <div className="admin-page__mode-panel">
          <nav className="admin-page__modes" aria-label="Admin sections">
            {ADMIN_MODES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={currentMode === id ? 'admin-page__mode admin-page__mode--active' : 'admin-page__mode'}
                aria-pressed={currentMode === id}
                onClick={() => changeMode(id)}
              >
                {label}
              </button>
            ))}
          </nav>
          {error && <p role="alert" className="admin-page__error">{error}</p>}
          {notice && <p role="status" className="admin-page__notice">{notice}</p>}
          <ActiveComponent
            {...sharedProps}
            refreshKey={userRefresh}
            onReviewed={() => setUserRefresh((value) => value + 1)}
          />
        </div>
      </div>
    </main>
  );
}
