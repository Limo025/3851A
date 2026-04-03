import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>UON Marketplace</title>
        <link rel="icon" type="image/x-icon" href="res/icon/favicon.png" />
        <link rel="stylesheet" href="style.css" />
        <script type="text/javascript" src="js/script.js"></script>
        <script type="text/javascript" src="js/sidebar.js"></script>
        {/* TOP PART OF THE PAGE*/}
        <div id="headerSection">
            <div id="headerElements">
            {/* University Logo*/}
            <div className="marketplaceLogo">
                <a href="main.html">
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
            <div className="accountButton" onclick="window.location.href='login.jsx'">
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
        {/* BACKGROUND IMAGE FOR MAIN PAGE*/}
        <div id="headerImage">
            <img src="src/img/background.png" alt="background image" />
        </div>
        <div id="contentBackground"></div>
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
