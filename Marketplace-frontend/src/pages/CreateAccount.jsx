import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import backgroundImg from '../img/well.jpg';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldDescription,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function App() {
  const [username, setUsername] = useState('');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [conduct, setConduct] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const backgroundStyle = {
      backgroundImage: ` url(${backgroundImg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      width: '100vw',
      minHeight: '100vh',
    };

  async function createAccount() {
    setError('');

    if (!terms || !privacy || !conduct) {
      setError('You must agree to all terms before creating an account.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Password and Confirm password do not match!');
      return;
    }

    setLoading(true);
    try {
        const res = await fetch('http://localhost:8000/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, username }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        navigate('/login');
    } catch (e) {
        setError(e instanceof Error ? e.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }
  
  document.title = "Create Account | UON Marketplace";
  return (
    <div id="loginPageBackground" className="flex justify-center py-10 px-4" style={backgroundStyle}>
      <div className='flex flex-col items-start gap-4 bg-white rounded-2xl shadow-lg p-8 w-full max-w-lg h-fit'>
        <div>
          <h1 className="text-3xl font-semibold">Create Account</h1>
          <p className="text-sm text-gray-500">All fields are required.</p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
          <FieldSet id="registerForm" className='createAccountForm w-full'>
            <FieldGroup className="gap-3">
              <Field>
                <FieldLabel htmlFor="username" className="text-20">Username</FieldLabel>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  placeholder="Your username"
                  required
                  onChange={(e) => setUsername(e.target.value)}
                />
                <FieldDescription>
                This will be your displayed name by default, unless changed otherwise.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="dob">Date of birth</FieldLabel>
                <Input
                  id="dob"
                  type="date"
                  value={dob}
                  required
                  onChange={e => setDob(e.target.value)}
                />
                <FieldDescription>
                  You must be at least 18 years of age to use the Marketplace.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email Address</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  required
                  placeholder="Your email address"
                  onChange={e => setEmail(e.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  minLength="8"
                  placeholder="Your password"
                  required
                  onChange={e => setPassword(e.target.value)}
                />
                <FieldDescription>Minimum 8 characters.</FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="passwordConfirm">Confirm Password</FieldLabel>
                <Input
                  id="passwordConfirm"
                  type="password"
                  value={confirmPassword}
                  placeholder="Confirm password"
                  required
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </Field>
            </FieldGroup>
          </FieldSet>

          <div className="flex flex-col gap-2 w-full text-sm">
            <label htmlFor="terms" className="flex items-start gap-2">
              <input
                type="checkbox"
                id="terms"
                checked={terms}
                required
                onChange={e => setTerms(e.target.checked)}
                className="mt-1"
              />
              <span>
                I agree to the Community Marketplace{' '}
                <a href="#" className="underline">Terms and Conditions</a>.
              </span>
            </label>

            <label htmlFor="privacy" className="flex items-start gap-2">
              <input
                type="checkbox"
                id="privacy"
                checked={privacy}
                required
                onChange={e => setPrivacy(e.target.checked)}
                className="mt-1"
              />
              <span>
                I acknowledge the Community Marketplace{' '}
                <a href="#" className="underline">Privacy Policy</a>.
              </span>
            </label>

            <label htmlFor="conduct" className="flex items-start gap-2">
              <input
                type="checkbox"
                id="conduct"
                checked={conduct}
                required
                onChange={e => setConduct(e.target.checked)}
                className="mt-1"
              />
              <span>
                I agree to the University of Marketplace{' '}
                <a href="#" className="underline">Code of Conduct</a>.
              </span>
            </label>
          </div>

          <Button className="w-full p-6 text-xl font-['FuseV2']" onClick={createAccount} disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </Button>

          <hr className="w-full" />

          <p className="text-lg font-normal">Already have an account? 
            <Link to="/login" className="w-full pl-1.5">Log In</Link>
          </p>
          
      </div>
    </div>


  )
}

export default App
