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
      <h1> Error 404</h1>
      <h3> The website you were trying to go to is either unavailable, or doesn't exist.<br /> If you think this is a mistake, please contact support. </h3>

    </div>
  </div>
</>


  )
}

export default App
