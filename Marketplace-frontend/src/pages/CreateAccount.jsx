import { useState } from 'react'
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
  const [count, setCount] = useState(0)

  return (
<>
  {/* MAIN CONTENT*/}

  <div id="contentBackground">
    <div id="content">
      <h1> Create Account</h1>
      <h3>All fields are required. </h3><br />
      <hr /><br />
        <form class="createAccountForm">

          {/* Given Name (s) */}
          <label for="givenName">Given Name(s):</label>
          <input type="text" id="givenName" name="givenName" required/>

          {/* Family Name */}
          <label for="surname">Family Name:</label>
          <input type="text" id="surname" name="surname" required/>

          {/* Username */}
          <label for="username">Username:</label>
          <input type="text" id="username" name="username" required/><br />
          <i>This will be your displayed name by default, unless changed otherwise.</i>

          {/* Date of Birth */}
          <label for="dob">Date of Birth</label>
          <input type="date" id="dob" name="dob" max="2009-01-01" required/><br />
          <i>You must be at least 18 years of age to use the Marketplace.</i>

          {/* E-Mail Address */}
          <label for="email">Email Address:</label>
          <input type="email" id="email" name="email" required/>

          {/* Password */}
          <label for="password">Password:</label>
          <input type="password" id="password" name="password" minLength="8" required/>
          <br />
          <i>Minimum 8 characters.</i>

          {/* Confirm Password */}
          <label for="passwordConfirm">Confirm Password:</label>
          <input type="password" id="passwordConfirm" name="passwordConfirm" required/><hr /><br></br>
          
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
          <input type="submit"></input>

        </form>
        <hr />
    </div>
  </div>
</>


  )
}

export default App
