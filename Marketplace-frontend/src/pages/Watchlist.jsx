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
    <h1>Watchlist</h1><br/>
      {/*  
          on opening this page, redirect to login if user is not logged in. Then,
          the database should query all items that this user has watchlisted. 
          Items that are AVAILABLE should be put under "Watchlisted Items", 
          and items that are NOT AVAILABLE should be put under "Items that are no longer available:"
      
          IF (user.wishlistedItems.Exist && user.wishlistedItems.available.exist)
          {
              hide document.getElementByID('availableWatchlistNull')
              for every user.wishlistedItems.available, 
                new <div class='watchlistItem'>
                        <img class='watchlistItemImage' alt='itemImageNotFound' src="{itemImage}"></img>
                        <h3>{itemName}</h3>
                        <h3>{itemCost}</h3>
                    </div>
          }

          IF (user.wishlistedItemsExist && user.wishlistedItems.unavailable.exist)
          {
              hide document.getElementByID('unavailableWatchlistNull')
              for every user.wishlistedItems.unavailable, 
                new <div class='watchlistItgemUnavaiulable'>
                        <img class='watchlistItemImage' alt='itemImageNotFound' src="{itemImage}"></img>
                        <h3>{itemName}</h3>
                        <h3>unavailable. </h3>
                    </div>
          }

            CONDENSED VIEW ITEM TEMPLATE
          <div class="watchlistItemGridSmall">
            <div class='watchlistItemSmall'>
                          <p>Item Name</p>
                          <p>$99.99</p>
          </div>
        </div>



      */}
      <h3> Watchlisted Items: </h3>
        {/* remove this if there is items in this category. */}<p id="availableWatchlistNull">There are no items that are watchlisted. </p>
        <div class="watchlistItemGrid">
          <div class='watchlistItem'>
            <img class='recItemImage' alt='itemImageNotFound' src="src/img/testImage_1.png"></img>
                          <p>Item Name</p>
                          <p>$99.99</p>
          </div>

        </div><br/><br/>
      <h3> Items that are no longer available: </h3>
          <p id="unavailableWatchlistNull">There are no items that are watchlisted, and are not available. </p>
          <div class="watchlistItemGrid">
            <div class='watchlistItemUnavailable'>
              <img class='recItemImage' alt='itemImageNotFound' src="src/img/testImage_1.png"></img>
                          <p>Item Name</p>
                          <p>$99.99</p>
          </div>
        </div>
    </div>
  </div>
</>


  )
}

export default App
