import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { session } from '../auth/session.js';
import { getPostLoginPath } from '../auth/returnPath.js';
import { getPasswordInputType } from '../auth/loginForm.js';

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  async function logIn() {
      document.getElementById("loadingIcon").style.display = "inline";
        try {
            const res = await fetch('http://localhost:8000/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            session.saveLogin(data);
            navigate(getPostLoginPath(location.state), { replace: true });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An error occurred');
            document.getElementById("loadingIcon").style.display = "none";
        }
    }

  function handleSubmit(event) {
    event.preventDefault();
    logIn();
  }

  return (
<>
  {/* MAIN CONTENT*/}
  <div id="contentBackground">
    <div id="content" className="login-page">
      <h1>Log in</h1>
      <form id="loginForm" className="loginAccountForm" onSubmit={handleSubmit}>
        <label htmlFor="email">Your Email</label>
        <input
          placeholder="name@example.com"
          id='email'
          type="email"
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)} />
        <label htmlFor="password">Password</label>
        <div className={`login-password-field${error ? ' login-password-field--error' : ''}`}>
          <input
            placeholder="Your password"
            id='password'
            type={getPasswordInputType(isPasswordVisible)}
            autoComplete="current-password"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'login-error' : undefined}
            value={password}
            onChange={e => setPassword(e.target.value)} />
          <button
            className="login-password-toggle"
            type="button"
            aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
            aria-pressed={isPasswordVisible}
            onClick={() => setIsPasswordVisible(visible => !visible)}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
              <circle cx="12" cy="12" r="2.75" />
              {!isPasswordVisible && <path d="m4 4 16 16" />}
            </svg>
          </button>
        </div>
        <div className="login-support-row">
          <p id="login-error" className="login-error" role={error ? 'alert' : undefined}>{error}</p>
          <Link className="login-forgot-link" to="/forgot-password">Forgot password?</Link>
        </div>
        <div className="login-actions">
          <button className="bigButton login-submit" type="submit">Continue</button>
          <img id="loadingIcon" className="loadingIcon" src="/src/icon/loading.gif" alt="Signing in" />
        </div>
      </form>

      {/* bear with me, google is strict with this stuff...*/}
      {/*<button className="gsi-material-button">
        <div className="gsi-material-button-state" />
        <div className="gsi-material-button-content-wrapper">
          <div className="gsi-material-button-icon">
            <svg
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              xmlnsXlink="http://www.w3.org/1999/xlink"
              style={{ display: "block" }}
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
              <path fill="none" d="M0 0h48v48H0z" />
            </svg>
          </div>
          <span className="gsi-material-button-contents">
            Continue with Google
          </span>
          <span style={{ display: "none" }}>Continue with Google</span>
        </div>
      </button>*/}
      <div className="login-create-account">
        <p>New to Marketplace?</p>
        <button className="bigButton" onClick={()=> window.location.href='/createAccount'}>Create an account</button>
      </div>
    </div>
  </div>
</>


  )
}

export default App
