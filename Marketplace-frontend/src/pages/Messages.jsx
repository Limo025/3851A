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

function receiveTextFromInput(text){
  console.log(text);
  document.getElementById('messageTextBox').value = "";
      // generate a new sender message
}

function receiveTextFromInputViaKey(event){
    if (event.key === 'Enter' && event.target.value.trim() != ''){
      // user entered text into input box, and pressed enter key to input text into service. 
      const text = event.target.value.trim();
      receiveTextFromInput(text);
    }
}

function receiveTextFromInputViaButton(){
    receiveTextFromInput(document.getElementById('messageTextBox').value);
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
  // if user isn't logged in, redirect them to login page. 
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
            <p>example receiver message</p>
          </div>
          <div class="senderMessage">
            <p>example sender message</p>
          </div>
          <div class="messageTextInput">
              <input id="messageTextBox" class="messageTextBox" type="text" placeholder="Type here..." onKeyDown={receiveTextFromInputViaKey}></input>
              <button class="messageTextButton" onClick={receiveTextFromInputViaButton}>Send</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</>


  )
}

export default App
