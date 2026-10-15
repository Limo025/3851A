import { useState } from 'react'
import toast from 'react-hot-toast'

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
          <p>The University of Newcastle Marketplace was created for members of the local Newcastle and Central Coast area, including students, staff, and 
                    members of the community, to allow them to distribute items to individuals willing to buy them. It was proposed as a concept idea in 2026 as 
                    part of a Final Project by a group of students. </p><br/>
                  <p>The University of Newcastle Marketplace works like a traditional online shopping platform - customers may search for an item that they wish
                    to purchase, or be recommended one by our algorithms, that take what the user has previously looked at, into account. They can find an item, and
                    if they'd like, get in contact with the seller, to discuss potential pricing, as well as a time and date for collection of the item, if both
                    parties agree on the item transaction. 
                  </p><br/>
                  <p>Users are also able to sell their items onto the platform - no fees, charges, or subscriptions needed! Just have an account with us, and 
                    provide details on the item you are trying to sell <a href="sell">here.</a> Users can favourite an item for later use, and message users for 
                    reasons other than transactions.
                  </p><br/>
                  <p>If you have any questions or problems, we'd recommend checking out the <a href="help">help page.</a></p>
        </div>
      </div>

            <div class="helpTab">
        <div class="helpQuestion" onClick={openAnswer}>
          <p>How do I log in / create an account?</p>
          <img class="helpDropdown" src="src/icon/dropdown.svg" alt="down"></img>
        </div>
        <div class="helpAnswer" id="helpAnswer" hidden>
          <p>Click on the account icon to the top of the page (in between the Messages icon and the Sidebar Icon). </p> <br/>
            <p>To Log into your account, enter in your email address, followed by your password. If you have 
            forgotten your password, please click on the link stating such, and follow the on-screen instructions. </p>
            <p> * Note that University of Newcastle accounts are not usable here. Do not enter staff/student information. </p>
            <br/><p>To Create an account from the Login page, click on 'Create Account', and follow the on-screen instructions
              to make an account.
            </p>
            <p>* Although possible, it is recommended you use different information/passwords to
               that of your University of Newcastle account, if you have one. </p>
        </div>
      </div>

            <div class="helpTab">
        <div class="helpQuestion" onClick={openAnswer}>
          <p>How do I purchase an item from the marketplace?</p>
          <img class="helpDropdown" src="src/icon/dropdown.svg" alt="down"></img>
        </div>
        <div class="helpAnswer" id="helpAnswer" hidden>
          <p>On the page of the item you wish to purchase, click on 'Contact Seller'. You will need to negotiate cost, pickup/delivery, and potentially 
            verify condition of the item yourself. Ideally, here is a sample structure you could follow: </p>
            <dl>
              <br/>
            <dt> - Click on Contact Seller, on the page of the item. </dt>
            <dt> - Ask if the item is still available, as there is a change the item may have been sold, and not been updated on the website. </dt>
            <dd>  "Hey, just wondering if this item is still available?"</dd>
            <br/>
            <dt> - If the seller still has the item, it's time to negotiate a price. Normally, the price listed on the website would be fine, however 
              because this is a marketplace, you are able to haggle/set on a different price. It is recommended you go into communication with the seller
              being able to pay the price listed, with a discount being a benefit, not an expectation. You should also communicate what payment method 
              would be acceptable (Cash, Card, Transfer, Trade) </dt>
            <dd>    * "I saw this item was listed for $100; If you'd like, I can purchase it as that price?" </dd>
            <dd>    * "You have the item listed for $100, would you be able to do $90?" " </dd>
            <dd>    * "I can do $100 for this, or $90 if you want to do cash." </dd>
            <br/>
            <dt> Once you and the seller have agreed on a price, communicate as to how you'll receive the item. This can include
              it being delivered to you, or you going to a negotiated address to pick it up. 
            </dt>
            </dl>
        </div>
      </div>

            <div class="helpTab">
        <div class="helpQuestion" onClick={openAnswer}>
          <p>Do I need to be a student of the University of Newcastle to access the marketplace?</p>
          <img class="helpDropdown" src="src/icon/dropdown.svg" alt="down"></img>
        </div>
        <div class="helpAnswer" id="helpAnswer" hidden>
          <p>Not at all! The marketplace is open to all members of the community. Being a student, staff member, or otherwise affiliated
            with UON is not a requirement to use the marketplace. 
          </p>
        </div>
      </div>

            <div class="helpTab">
        <div class="helpQuestion" onClick={openAnswer}>
          <p>How do I sell an item?</p>
          <img class="helpDropdown" src="src/icon/dropdown.svg" alt="down"></img>
        </div>
        <div class="helpAnswer" id="helpAnswer" hidden>
          <p>After logging in, head to the 'My Listings' tab located on the sidebar. Click on 'Add Listing', and fill in the information.  </p>
        </div>
      </div>

            <div class="helpTab">
        <div class="helpQuestion" onClick={openAnswer}>
          <p>What isn't allowed on the marketplace?</p>
          <img class="helpDropdown" src="src/icon/dropdown.svg" alt="down"></img>
        </div>
        <div class="helpAnswer" id="helpAnswer" hidden>
          <p>To comply with legal restrictions, items classified as illegal to sell or have, or could otherwise bring harm to people, are not permitted on the website. Our detection system will
            automatically remove or flag items that could be considered as such. These include:
          </p>
          <br/>
          <i>Airsofts, Air Rifles, BB Guns, Alcohol, Adult Items, Animal Traps, Contracts, Counterfeit Items, Credit and Debit Cards, 
             items obtained through disasters or tragedy, Embargoed goods, Firearms, Food, Funeral Items, Gift Cards, 
             Government Items, Hazardous Materials, Human body parts, knives, Lockpicking Items, Lottery Tickets, Military Items,
             Plants, Police items, Prescription Medicines, items considered Price Gouged, Real Estate, Replica Firearms, Slot Machines, 
             Social Media Accounts, Stocks, Tobacco, E-cigarettes or Vapes, Stolen Property, Virtual Currency, Vouchers, or Weapons.  </i>

          <br/> <br/>
          <p> Items flagged as such will be subject to a manual review by Marketplace staff. Items automatically considered as such will be removed
            automatically. Accounts that repeatedly upload prohibited items for sale will be banned. Furthermore, items with images that are either
            unrelated to the item, or considered inappropriate or prohibited will be subject to the same actions as items. If necessary, Marketplace will
            redirect illegal items to law enforcement. 
          </p>
        </div>
      </div>

      <div class="helpTab">
        <div class="helpQuestion" onClick={openAnswer}>
          <p>How do I report something?</p>
          <img class="helpDropdown" src="src/icon/dropdown.svg" alt="down"></img>
        </div>
        <div class="helpAnswer" id="helpAnswer" hidden>
          <p>If you feel as though an item on the marketplace is in breach of our conditions, click on the Report button on an item, and fill in the information. We will manually review
            the item in question, and take appropriate action.
          </p>
        </div>
      </div>
      
    </div>
  </div>
</>


  )
}

export default App
