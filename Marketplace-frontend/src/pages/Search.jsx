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
     // strict mode runs this twice. To fix this, i added a check that skips the function if it has already been called. 
    if (strictModeLoop){
        return;
    }
    strictModeLoop = true;

    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.has('query')){
        const itemID = urlParams.get('query');
        console.log(itemID);
        document.getElementById('searchHeading').textContent += itemID;

        // now it would search items in a database with the query.
        

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
        <h3 id="searchHeading">Results for </h3>

    </div>
  </div>
</>


  )
}

export default App
