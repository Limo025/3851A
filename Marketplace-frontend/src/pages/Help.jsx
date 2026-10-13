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
  const openAnswer = (e) => {
    const helpAnswer = e.currentTarget.nextElementSibling;
    if (!helpAnswer?.classList.contains('helpAnswer')) return;
    helpAnswer.hidden = !helpAnswer.hidden;
  }

function App() {



  document.title = "Help | UON Marketplace";
  const [selectedCategory, setSelectedCategory] = useState(' ');
  const [count, setCount] = useState(0)

   const clickOnCategory = (e) => {
    const categoryName = e.currentTarget.querySelector('.categoryName')?.textContent?.trim();
    setSelectedCategory(categoryName);
    window.location = "marketplace?search=" + categoryName;
  };

  return (
<>
  {/* MAIN CONTENT*/}
  <div id="contentBackground">
    <div id="content">
      <h1> Help </h1>

      <div class="helpTab">
        <div class="helpQuestion" onClick={openAnswer}>
          <p>What is the University of Newcastle Marketplace?</p>
          <img class="helpDropdown" src="src/icon/dropdown.svg" alt="down"></img>
        </div>
        <div class="helpAnswer" id="helpAnswer" hidden>
          <p>pending response</p>
        </div>
      </div>

            <div class="helpTab">
        <div class="helpQuestion" onClick={openAnswer}>
          <p>How do I log in / create an account?</p>
          <img class="helpDropdown" src="src/icon/dropdown.svg" alt="down"></img>
        </div>
        <div class="helpAnswer" id="helpAnswer" hidden>
          <p>pending response</p>
        </div>
      </div>

            <div class="helpTab">
        <div class="helpQuestion" onClick={openAnswer}>
          <p>How do I purchase an item from the marketplace?</p>
          <img class="helpDropdown" src="src/icon/dropdown.svg" alt="down"></img>
        </div>
        <div class="helpAnswer" id="helpAnswer" hidden>
          <p>pending response</p>
        </div>
      </div>

            <div class="helpTab">
        <div class="helpQuestion" onClick={openAnswer}>
          <p>Do I need to be a student of the University of Newcastle to access the marketplace?</p>
          <img class="helpDropdown" src="src/icon/dropdown.svg" alt="down"></img>
        </div>
        <div class="helpAnswer" id="helpAnswer" hidden>
          <p>pending response</p>
        </div>
      </div>

            <div class="helpTab">
        <div class="helpQuestion" onClick={openAnswer}>
          <p>How do I sell an item?</p>
          <img class="helpDropdown" src="src/icon/dropdown.svg" alt="down"></img>
        </div>
        <div class="helpAnswer" id="helpAnswer" hidden>
          <p>pending response</p>
        </div>
      </div>

            <div class="helpTab">
        <div class="helpQuestion" onClick={openAnswer}>
          <p>What isn't allowed on the marketplace?</p>
          <img class="helpDropdown" src="src/icon/dropdown.svg" alt="down"></img>
        </div>
        <div class="helpAnswer" id="helpAnswer" hidden>
          <p>pending response</p>
        </div>
      </div>

      <div class="helpTab">
        <div class="helpQuestion" onClick={openAnswer}>
          <p>How do I report something?</p>
          <img class="helpDropdown" src="src/icon/dropdown.svg" alt="down"></img>
        </div>
        <div class="helpAnswer" id="helpAnswer" hidden>
          <p>pending response</p>
        </div>
      </div>
      
    </div>
  </div>
</>


  )
}

export default App
