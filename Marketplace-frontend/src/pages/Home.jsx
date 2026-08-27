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
        
        {/* BACKGROUND IMAGE FOR MAIN PAGE*/}
        <div id="headerImage">
            <img src="src/img/panorama_background.webp" alt="background image" />
        </div>
        <div id="contentBackground">
            <div class="wideContent">
                <h3>Recently viewed</h3>
            </div>
                <div class='recItemsHomepage'>

                    <div class='recItem'>
                        <img class='recItemImage' alt='itemImageNotFound' src="src/img/testImage_2.png"></img>
                        <h3>item</h3>
                        <h3>$item</h3>
                    </div>

                    <div class='recItem'>
                        <img class='recItemImage' alt='itemImageNotFound' src="src/img/testImage_1.png"></img>
                        <h3>item</h3>
                        <h3>$item</h3>
                    </div>

                    <div class='recItem'>
                        <img class='recItemImage' alt='itemImageNotFound' src="src/img/testImage_2.png"></img>
                        <h3>item</h3>
                        <h3>$item</h3>
                    </div>

                    <div class='recItem'>
                        <img class='recItemImage' alt='itemImageNotFound' src="src/img/testImage_3.png"></img>
                        <h3>item</h3>
                        <h3>$item</h3>
                    </div>

                    <div class='recItem'>
                        <img class='recItemImage' alt='itemImageNotFound' src="src/img/testImage_1.png"></img>
                        <h3>item</h3>
                        <h3>$item</h3>
                    </div>

                    
                </div>
        </div>
                <div id="contentBackground">
            <div class="wideContent">
                <h3>Recommended Items </h3>
            </div>
                <div class='recItemsHomepage'>
                    
                    <div class='recItem'>
                        <img class='recItemImage' alt='itemImageNotFound' src="src/img/testImage_2.png"></img>
                        <h3>item</h3>
                        <h3>$item</h3>
                    </div>

                    <div class='recItem'>
                        <img class='recItemImage' alt='itemImageNotFound' src="src/img/testImage_1.png"></img>
                        <h3>item</h3>
                        <h3>$item</h3>
                    </div>

                    <div class='recItem'>
                        <img class='recItemImage' alt='itemImageNotFound' src="src/img/testImage_2.png"></img>
                        <h3>item</h3>
                        <h3>$item</h3>
                    </div>

                    <div class='recItem'>
                        <img class='recItemImage' alt='itemImageNotFound' src="src/img/testImage_3.png"></img>
                        <h3>item</h3>
                        <h3>$item</h3>
                    </div>

                    <div class='recItem'>
                        <img class='recItemImage' alt='itemImageNotFound' src="src/img/testImage_1.png"></img>
                        <h3>item</h3>
                        <h3>$item</h3>
                    </div>

                    
                </div>
        </div>
        </>

  )
}

export default App
