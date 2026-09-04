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
      <h1> About </h1>
      {/* In this page, we add some text describing what the marketplace is, and why it is made.    */}
        <p>The University of Newcastle Marketplace was created for members of the local Newcastle and Central Coast area, including students, staff, and 
          members of the community, to allow them to distribute items to individuals willing to buy them. It was proposed as a concept idea in 2026 as 
          part of a Final Project by a group of students. </p>
        <p>The University of Newcastle Marketplace works like a traditional online shopping platform - customers may search for an item that they wish
          to purchase, or be recommended one by our algorithms, that take what the user has previously looked at, into account. They can find an item, and
          if they'd like, get in contact with the seller, to discuss potential pricing, as well as a time and date for collection of the item, if both
          parties agree on the item transaction. 
        </p>
        <p>Users are also able to sell their items onto the platform - no fees, charges, or subscriptions needed! Just have an account with us, and 
          provide details on the item you are trying to sell <a href="sell">here.</a> Users can favourite an item for later use, and message users for 
          reasons other than transactions.
        </p>
        <p>If you have any questions or problems, we'd recommend checking out the <a href="help">help page.</a></p>
    </div>
  </div>
</>


  )
}

export default App
