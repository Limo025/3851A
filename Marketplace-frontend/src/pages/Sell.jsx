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
      <h1> Sell </h1>
      {/*       
      Information for the user to input: 
      - account details are autoprovided via account - if the user is not signed in, redirect them to login page. 
      - *Name of item
      - *price
      - *description
      - *image(s)
      - tags
      
      */}
      <div class="ItemForm">

          <label for="itemNameForm">Name of Item:  </label>
          <input required placeholder="The name of your item; for customers to identity." name="itemNameForm" id='itemNameForm'/>

          <label for="itemPriceForm">Price (in Australian Dollars)</label>
          <input required type="number" name="itemPriceForm" id="itemPriceForm" placeholder="$"></input>
          
          <label for="itemDescription">Description:  </label>
          <textarea class="itemDescription" id="itemDescription" name="itemDescription" placeholder="A simple description for users to know anything about the item, such as any faults, irregularities, or features, as well as information regarding collection of item (eg. Delivery / Pickup only, or whether negotiation is allowed" required></textarea>

          <label for="itemImageFile">Upload Image(s)</label>
          <input class="uploadButton" type="file" id="itemImageFile" name="itemImageFile" placeholder="Choose Files" multiple accept="image/png, image/jpeg, image/jpg" />

          <label for="itemDescription">Tags:  </label>
          <textarea class="itemDescription" id="itemDescription" name="itemDescription" placeholder="This helps customers find the item better through searching and looking at similar items such as this. 
          
          Enter a tag in lowercase, followed by ';', and additional tags you wish to add. For example, a television would have tags such as 'television; tv; 4k; 50inch; sony;  etc. ' " ></textarea>

        <button class="bigButton" >Submit</button>
      </div>
    </div>
  </div>
</>


  )
}

export default App
