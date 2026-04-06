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
  <meta charSet="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>UON Marketplace</title>
  <link rel="icon" type="image/x-icon" href="src/icon/favicon.png" />
  <link rel="stylesheet" href="style.css" />
  {/* TOP PART OF THE PAGE*/}
  <div id="headerSection">
    <div id="headerElements">
      {/* University Logo*/}
      <div className="marketplaceLogo">
        <a href="/">
          <img
            src="src/img/logo.jpg"
            alt="University of Newcastle Marketplace"
            width={200}
            id="logo"
          />
        </a>
      </div>
      {/* Search Bar */}
      <div id="searchBar">
        <input type="text" onkeypress="handleSearch(event)" />
      </div>
      {/* Icon Buttons */}
      {/* Messages */}
      <div
        className="messageButton"
        onclick="window.location.href='messages.html'"
      >
        <img src="src/icon/messagesIcon.png" alt="Messages" width={100} />
      </div>
      {/* Account */}
      <div
        className="accountButton"
        onclick="window.location.href='login.html'"
      >
        <img src="src/icon/accountIcon.png" alt="Messages" width={100} />
      </div>
      {/* Options */}
      <div className="optionsButton">
        <div className="optionsButtonImage">
          <img
            src="src/icon/optionsIcon.png"
            alt="Messages"
            width={100}
            onclick="openNav()"
          />
        </div>
        <div className="sidebar" id="sidebar">
          <div className="sidebarContent">
            <div className="sidebarTop">
              <p>Sell</p>
              <p>Watchlist</p>
              <a
                href="javascript:void(0)"
                className="closebtn"
                onclick="closeNav()"
                style={{ fontSize: 60, color: "white", textDecoration: "none" }}
              >
                ×
              </a>
              <p />
            </div>
            <a href="main.html">
              <p>Home</p>
            </a>
            <p>Categories</p>
            <p>Message</p>
            <p>Purchase History</p>
            <p>Settings</p>
            <p>Help</p>
            <br />
            <p>About</p>
          </div>
        </div>
      </div>
    </div>
  </div>
  {/* MAIN CONTENT*/}
  <div id="contentBackground">
    <div id="content">
      <h1> Login using:</h1>
      <button>Normal Login</button>
      <br />
      <br />
      {/* bear with me, google is strict with this stuff...*/}
      <button className="gsi-material-button">
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
      </button>
      <br />
      <h1> or, Create an Account</h1>
      <button>Create an Account</button>
      <br />
    </div>
  </div>
  {/* ENDING NOTE FOR ALL PAGES*/}
  <div id="end">
    <div id="endContents">
      <a href="https://www.newcastle.edu.au/">
        <img
          src="src/img/uniLogo.jpg"
          alt="University of Newcastle"
          width={200}
        />
      </a>
      <p>
        <br />
        <br />
        The University of Newcastle acknowledges the traditional custodians of
        the lands within our footprint areas: Awabakal, Darkinjung, Biripai,
        Worimi, Wonnarua, and Eora Nations. We also pay respect to the wisdom of
        our Elders past and present.
        <br />
        DISCLAIMER: Every effort has been made to ensure the accuracy of the
        information on this website. However, changes to courses and programs
        may occur. The University accepts no responsibility for any information
        supplied on this web site or any actions taken on the basis of the
        information. Users are advised to seek confirmation of the information
        from the relevant area of the University.
      </p>
    </div>
  </div>
</>


  )
}

export default App
