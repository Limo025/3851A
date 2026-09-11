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
      <h1> Purchase History </h1>
    </div>
  </div>
</>


  )
}

export default App
