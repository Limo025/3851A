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

      {/*  
          on opening this page, redirect to login if user is not logged in. Then,
          the database should query all items that this user has watchlisted. 
          Items that are AVAILABLE should be put under "Watchlisted Items", 
          and items that are NOT AVAILABLE should be put under "Items that are no longer available:"
      
          IF (user.wishlistedItems.Exist && user.wishlistedItems.available.exist)
          {
              hide document.getElementByID('availableWatchlistNull')
              for every user.wishlistedItems.available, 
                new <div class='recItem'>
                        <img class='recItemImage' alt='itemImageNotFound' src="{itemImage}"></img>
                        <h3>{itemName}</h3>
                        <h3>{itemCost}</h3>
                    </div>
          }

          IF (user.wishlistedItemsExist && user.wishlistedItems.unavailable.exist)
          {
              hide document.getElementByID('unavailableWatchlistNull')
              for every user.wishlistedItems.unavailable, 
                new <div class='recItem'>
                        <img class='recItemImage' alt='itemImageNotFound' src="{itemImage}"></img>
                        <h3>{itemName}</h3>
                        <h3>unavailable. </h3>
                    </div>
          }
      
      */}
      <h3> Watchlisted Items: </h3>
        <p id="availableWatchlistNull">There are no items that are watchlisted. </p>


      <h3> Items that are no longer available: </h3>
          <p id="unavailableWatchlistNull">There are no items that are watchlisted, and are not available. </p>
    </div>
  </div>
</>


  )
}

export default App
