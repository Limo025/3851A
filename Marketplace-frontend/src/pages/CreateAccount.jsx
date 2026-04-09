import { useState } from 'react'
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { Link, useNavigate } from 'react-router-dom';
let isOpen = false;

function openNav() {
  if (isOpen == true){
      document.getElementById("sidebar").style.display = "none";
      isOpen=false;
  } else{
      document.getElementById("sidebar").style.display = "block";
      isOpen=true;
  }
}
function closeNav() {
  document.getElementById("sidebar").style.display = "none";
  isOpen=false;
}



function App() {
  const [count, setCount] = useState(0);
  
  const [username, setUsername] = useState('');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  async function createAccount() {
    if (password !== confirmPassword) {
        setError('Password and Confirm password do not match!');
    }
    try {
        await createUserWithEmailAndPassword(getAuth(), email, password);
        navigate('/login');
    } catch (e) {
        setError(e instanceof Error ? e.message : 'An error occurred');
    }
  }
  
  return (
<>
  {/* MAIN CONTENT*/}

  <div id="contentBackground">
    <div id="content">
      <h1> Create Account</h1>
      <h3>All fields are required. </h3><br />
      {error && <p>{error}</p>}
      <hr /><br />
        <form class="createAccountForm">

          {/* Username */}
          <label for="username">Username:</label>
          <input type="text" value={username} id="username" name="username" required onChange={e => setUsername(e.target.value)} /><br />
          <i>This will be your displayed name by default, unless changed otherwise.</i>

          {/* Date of Birth */}
          <label for="dob">Date of Birth</label>
          <input type="date" value={dob} id="dob" name="dob" max="2009-01-01" required onChange={e => setDob(e.target.value)} /><br />
          <i>You must be at least 18 years of age to use the Marketplace.</i>

          {/* E-Mail Address */}
          <label for="email">Email Address:</label>
          <input type="email" value={email} id="email" name="email" required onChange={e => setEmail(e.target.value)} />

          {/* Password */}
          <label for="password">Password:</label>
          <input type="password" value={password} id="password" name="password" minLength="8" required onChange={e => setPassword(e.target.value)} />
          <br />
          <i>Minimum 8 characters.</i>

          {/* Confirm Password */}
          <label for="passwordConfirm">Confirm Password:</label>
          <input type="password" value={confirmPassword} id="passwordConfirm" name="passwordConfirm" required onChange={e => setConfirmPassword(e.target.value)} /><hr /><br></br>
          
          {/* Terms and Conditions */}
          <label for="terms">Community Marketplace Terms and Conditions Agreement:</label>
          <input type="checkbox" id="terms" name="terms" value="termsTrue" required></input>
          <br />
          <i>T&C: (put link here)</i>

          {/* Privacy Policy */}
          <label for="privacy">Community Marketplace Privacy Policy Acknowledgement:</label>
          <input type="checkbox" id="privacy" name="privacy" value="privacyTrue" required></input>
          <br />
          <i>Privacy Policy: (put link here)</i>

          {/* University Code of Conduct */}
          <label for="conduct">University of Marketplace Code of Conduct Agreement:</label>
          <input type="checkbox" id="conduct" name="conduct" value="conductTrue" required></input>
          <br />
          <i>Code of Conduct: (put link here)</i>
          

        </form>
        <button onClick={createAccount}>Create Account</button>
        <hr />
        <Link to='/login'>Already have an account? Log In</Link>
    </div>
  </div>
</>


  )
}

export default App
