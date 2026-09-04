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
    window.location = "search?query=" + categoryName;
  };

  return (
<>
  {/* MAIN CONTENT*/}
  <div id="contentBackground">
    <div id="content">
      <h1> Categories </h1>
      {/*  This is a sample grid - REACT should create one for appropriate categories.  */}
      <div class="categoryGrid">
        <div class="categoryBox" onClick={clickOnCategory}>
          <p class="categoryName">CategoryA</p>
        </div>
        <div class="categoryBox" onClick={clickOnCategory}>
          <p class="categoryName">CategoryB</p>
        </div>
        <div class="categoryBox" onClick={clickOnCategory}>
          <p class="categoryName">CategoryC</p>
        </div>
        <div class="categoryBox" onClick={clickOnCategory}>
          <p class="categoryName">CategoryD</p>
        </div>
        <div class="categoryBox" onClick={clickOnCategory}>
          <p class="categoryName">CategoryE</p>
        </div>
        <div class="categoryBox" onClick={clickOnCategory}>
          <p class="categoryName">CategoryF</p>
        </div>
      </div>
    </div>
  </div>
</>


  )
}

export default App
