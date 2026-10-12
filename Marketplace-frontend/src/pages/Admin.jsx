import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminAppeal from '../components/AdminAppeal.jsx';
import AdminDefault from '../components/AdminDefault.jsx';
import { handleAuthenticationError } from '../auth/handleAuthenticationError.js';
import { session } from '../auth/session.js';
import '../css/styles/Admin.css';

export default function Admin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [userRefresh, setUserRefresh] = useState(0);

  const report = useCallback((errorValue) => {
    if (!handleAuthenticationError(errorValue, { sessionManager: session, navigate, returnPath: location.pathname })) {
      setError(errorValue.message || 'The request failed. Please try again.');
    }
  }, [navigate, location.pathname]);

  const sharedProps = { pending, setPending, setError, setNotice, report };

  useEffect(() => {
    document.title = 'ADMIN | UON Marketplace';
  }, []);

  return (
    <main className="admin-page">
      <div className="admin-page__inner">
        <h1>Admin</h1>
        <p>Manage users, listings, and ban appeals.</p>
        {error && <p role="alert" className="admin-page__error">{error}</p>}
        {notice && <p role="status" className="admin-page__notice">{notice}</p>}

        <AdminAppeal
          {...sharedProps}
          onReviewed={() => setUserRefresh((value) => value + 1)}
        />
        <AdminDefault {...sharedProps} refreshKey={userRefresh} />
      </div>
    </main>
  );
}
