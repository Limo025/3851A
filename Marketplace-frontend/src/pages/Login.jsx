import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { session } from '../auth/session.js';
import { getPostLoginPath } from '../auth/returnPath.js';
import backgroundImg from '../img/loginBackground.jpeg';
import '../css/login.css'
import toast from 'react-hot-toast'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  const loadingIcon = document.getElementById('loadingIcon');

  const toggleNav = () => setIsNavOpen(!isNavOpen);

  const backgroundStyle = {
    backgroundImage: `url(${backgroundImg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    width: '100vw',
    height: '100vh',
  };

  async function logIn() {
      if (loadingIcon) {
        loadingIcon.style.display = 'inline';
      }
        try {
            const res = await fetch('http://localhost:8000/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            session.saveLogin(data);
            toast.success("Login success")
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
  <div id="loginPageBackground" style={backgroundStyle}>
    <div className='flex flex-col items-center gap-4 p-8'>
      <div className="flex flex-col items-start gap-4 bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <h1 >
          <img src='https://ok2static2.oktacdn.com/fs/bco/1/fs01bgsfcgbz8rdD10x8' alt='University of Newcastle logo'></img>
        </h1>
        <h2 className="font-['FuseV2Bold'] text-3xl">Login page</h2>
        {error && <p>{error}</p>}
        <FieldSet id="loginForm" className="loginAccountForm w-full max-w-xs">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input 
                id="email" 
                value={email}
                onChange={e => setEmail(e.target.value)} 
                type="text" 
                placeholder="Your email address" />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input 
                id="password" 
                type="password" 
                placeholder="Your password"
                value={password}
                onChange={e => setPassword(e.target.value)} />
            </Field>
          </FieldGroup>
        </FieldSet>
        <a href='/forgot-password' className="font-['Corbel'] text-lg">Forgot your password?</a>
        <Button className="p-6 text-xl font-['FuseV2']" onClick={logIn}>Log In</Button>
        <img id="loadingIcon" className="loadingIcon" src="src/icon/loading.gif" alt="loading" />
        <h2 className="font-['Corbel'] text-lg font-normal"> or, <a href='/createAccount'>Create an Account</a></h2>
        <br />
      </div>
    </div>
  </div>
</>


  )
}

export default App
