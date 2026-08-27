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
    <div id="contentHeading">
      <h1> Messages</h1>
    </div>
    <div class="wideContent">
      <div class="messageFrame">
        <div class="messageTopBar">
          {/*  some search bar, and a create chat icon.      */}
            <input class="messageSearchBar" type="text" placeholder="Search users"></input>
        </div>
        <div class="messageUsers">
          <div class="messageUsersPartition">
              <img class="messageUserIcon" src="src/img/testImage_1.png" alt="account image"></img>
              <h3 class="messageUserName">userTestName</h3>
              <p class="messageUserLastChat">lastChat</p>
          </div>
          <div class="messageUsersPartition">
              <img class="messageUserIcon" src="src/img/testImage_2.png" alt="account image"></img>
              <h3 class="messageUserName">userTestName</h3>
              <p class="messageUserLastChat">lastChat</p>
          </div>
                    <div class="messageUsersPartition">
              <img class="messageUserIcon" src="src/img/testImage_3.png" alt="account image"></img>
              <h3 class="messageUserName">userTestName</h3>
              <p class="messageUserLastChat">lastChat</p>
          </div>
        </div>

        <div class="messageComms">
          <p>example communication (receiver's username would go here)</p>

          <div class="receiverMessage">
            <p>hello there</p>
          </div>
          <div class="senderMessage">
            <p>general kenobi!</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</>


  )
}

export default App
