import '../css/styles/item-page.css';
import bannerImg from '../img/panorama_background.webp';
const bannerImgStyle = {
    objectFit: 'cover',
    width: '100%',
    height: '350px',
  };

function App() {
  return (
    <>
        
        {/* BACKGROUND IMAGE FOR MAIN PAGE*/}
        <div id="headerImage">
            <img src="src/img/panorama_background.webp" alt="background image" style={bannerImgStyle} />
        </div>
        <div id="contentBackground">
            <div class="wideContent">
                <h1>Recently viewed</h1>
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
                <h1>Recommended Items </h1>
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
