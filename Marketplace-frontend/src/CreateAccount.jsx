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

function handleSearch(event) {
    if (event.key === 'Enter') {
        alert('hello world');
        const query = event.target.value.trim();
        if (query) {
            window.location.href = '/search?=' + encodeURIComponent(query);
        }
    }
}

function App() {
  const [count, setCount] = useState(0)

  return (
<>
  {/* MAIN CONTENT*/}

  <div id="contentBackground">
    <div id="content">
      <h1> Create Account</h1>
      <h3>All fields are required. </h3>
      <div id="createAccountGrid">
      <p>First Name</p>
      <p>Surname</p>
      <p>Username</p>
      <p>Date of Birth</p>
      <p>Address</p>
      <p>Password</p>
      <p>Confirm Password</p>
      <p>Terms and Conditions</p>
      <p>Privacy Policy</p>
      <p>University Code of Conduct</p>
      </div>
      <button class="bigButton"> Finish</button>
    </div>
  </div>
</>


  )
}

export default App
