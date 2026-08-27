import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom';

//replace this whole thing with toggleNav()
// let isOpen = false;

// function openNav() {
//   if (isOpen == true){
//       document.getElementById("sidebar").style.display = "none";
//       isOpen=false;
//   } else{
//       document.getElementById("sidebar").style.display = "block";
//       isOpen=true;
//   }
// }
// function closeNav() {
//   document.getElementById("sidebar").style.display = "none";
//   isOpen=false;
// }

var strictModeLoop = false;

function handleSearch(event) {
    if (event.key === 'Enter') {
        alert('hello world');
        const query = event.target.value.trim();
        if (query) {
            window.location.href = '/search?=' + encodeURIComponent(query);
        }
    }
}

function loadItemData(event){
    if (strictModeLoop){
        return;
    }
    strictModeLoop = true;
    
  const urlParams = new URLSearchParams(window.location.search);
  if(urlParams.has('itemid')){
    const itemID = urlParams.get('itemid');
    const pageItemID = document.getElementById('itemID_onPage');
    pageItemID.textContent = '#' + itemID;
    itemCookies(event, itemID);
  }else{  // send the user to a 404 page, as we don't have all the data in the URL params to load. 
    window.location.href = '/invalid';
  }

}

function itemCookies(event, itemID){
  // for some reason, this runs 6 times. 
  // 1. get the user's cookies if they have them, create it if they dont. 

  document.cookie = "lastItems=" + itemID;
  // 2. add the current ID of the item to the lastItems tag of cookies. 
  // eg.  'lastItems=0001,0002,0003,0004,0005. 
  // Firstly, check if the current itemID is in the cookies. If so, do nothing. 
  // else, remove the last item (in the above example, 0005), and add the new one. 

}

function itemSmallClick(event, a){
  const x = 'imgS_' + a;
  const newImage = document.getElementById(x);
  const bigImage = document.getElementById('itemImage');
  bigImage.src = newImage.src;
}

function App() {
  useEffect(() => {loadItemData();}, []);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const toggleNav = () => setIsNavOpen(!isNavOpen);
  async function logIn() {

      document.getElementById("loadingIcon").style.display = "inline";
        try {
            const res = await fetch('http://localhost:8000/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            navigate('/');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An error occurred');
            document.getElementById("loadingIcon").style.display = "none";
        }
    }

  return (
<>
  <div id="contentBackground">
    <div id="content">
      <div class="itemInformation ">
          <div class="itemInformationGrid">

              <img id='itemImage' alt='itemImage' src="src/img/testImage_1.png" ></img> 
              {/* Images should be 600x600; the itemImage style forces this.   */}

              <div class='itemImageSmallGrid'>
                <img onClick={() => itemSmallClick(1, 1)}  class='itemImageSmall' id='imgS_1' alt='image1' src="src/img/testImage_1.png"></img>
                <img onClick={() => itemSmallClick(1, 2)}  class='itemImageSmall' id='imgS_2' alt='image2' src="src/img/testImage_2.png"></img>
                <img onClick={() => itemSmallClick(1, 3)}  class='itemImageSmall' id='imgS_3' alt='image3' src="src/img/testImage_3.png"></img>
              </div>

              <div id='itemName'>
                  <h1 id='itemName'>nameOfItem</h1>
                  <p id='itemID_onPage'>#</p>
                  <h3 id='itemSellerName'>Seller: </h3>
                  {/* name of the Item, as given by the seller.   */}
              </div>
              <br/>
              <div id='itemPrice'>
                  <h1>$price</h1>
                  {/* Price on offer   */}

                  <div id='itemSellerButton'>
                    <button class="bigButton">Contact Seller</button>
                    {/* Contact seller button  */}
                  </div>
              </div>
              <div id='itemDescriptionDiv'>
                    <h3 id='itemDescriptionTitle'>Description</h3>
                    <div class='itemDescriptionBox'>
                      <div id='itemDescription'>
                        <p>Standardd lorum ipsum: <br/><br/>
                            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
                            tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim 
                            veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
                            commodo consequat. Duis aute irure dolor in reprehenderit in voluptate
                            velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint 
                            occaecat cupidatat non proident, sunt in culpa qui officia deserunt 
                            mollit anim id est laborum.
                        </p>
                      </div>
                    </div>
                    {/* Description  */}
              </div>

              {/* Report Button */}
              {/* Favourite Button  */}
              {/* Send Button  */}
          </div>
      </div>

      <br/><br/>
      <h3>You may also like</h3>
    
        <div class='recItemsFromItem'>

          <div class='recItem'>
            <img class='recItemImage' alt='itemImageNotFound' src="src/img/testImage_2.png"></img>
            <h3>item</h3>
            <h3>$item</h3>
          </div>

          <div class='recItem'>
            <img class='recItemImage' alt='itemImageNotFound' src="src/img/testImage_2.png"></img>
            <h3>item</h3>
            <h3>$item</h3>
          </div>

    
        </div>

    </div>
  </div>
</>


  )
}

export default App
