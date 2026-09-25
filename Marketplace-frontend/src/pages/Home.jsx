import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client.js';
import '../css/styles/home.css';
import '../css/styles/recommended-item.css';
import bannerImg from '../img/panorama_background.webp';

const bannerImgStyle = {
    objectFit: 'cover',
    width: '100%',
    height: '350px',
  };



function App() {
  document.title = "UON Marketplace";
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  useEffect(() => {
    apiFetch('/api/recently-viewed', { auth: true })
      .then(setRecentlyViewed)
      .catch(() => setRecentlyViewed([]));
  }, []);

  return (
    
    <>
        
        {/* BACKGROUND IMAGE FOR MAIN PAGE*/}
        <div id="headerImage">
            <img src="src/img/panorama_background.webp" alt="background image" style={bannerImgStyle} />
        </div>
        <div id="contentBackground">
            <div className="wideContent">
                <h1>Recently viewed</h1>
            </div>
                <div className='recItemsHomepage'>
                    {recentlyViewed.length === 0 ? (
                        <p>No recently viewed items yet.</p>
                    ) : (
                        recentlyViewed.map((item) => (
                            <div className='recItem' key={item._id}>
                                <img
                                    className='recItemImage'
                                    alt={item.title || 'itemImageNotFound'}
                                    src={item.images?.[0]?.url || 'src/img/testImage_1.png'}
                                />
                                <h3>{item.title}</h3>
                                <h3>${item.price}</h3>
                            </div>
                        ))
                    )}
                </div>
        </div>
                <div id="contentBackground">
            <div className="wideContent">
                <h1>Recommended Items </h1>
            </div>
                <div className='recItemsHomepage'>
                    
                    <div className='recItem'>
                        <img className='recItemImage' alt='itemImageNotFound' src="src/img/testImage_2.png"></img>
                        <h3>item</h3>
                        <h3>$item</h3>
                    </div>

                    <div className='recItem'>
                        <img className='recItemImage' alt='itemImageNotFound' src="src/img/testImage_1.png"></img>
                        <h3>item</h3>
                        <h3>$item</h3>
                    </div>

                    <div className='recItem'>
                        <img className='recItemImage' alt='itemImageNotFound' src="src/img/testImage_2.png"></img>
                        <h3>item</h3>
                        <h3>$item</h3>
                    </div>

                    <div className='recItem'>
                        <img className='recItemImage' alt='itemImageNotFound' src="src/img/testImage_3.png"></img>
                        <h3>item</h3>
                        <h3>$item</h3>
                    </div>

                    <div className='recItem'>
                        <img className='recItemImage' alt='itemImageNotFound' src="src/img/testImage_1.png"></img>
                        <h3>item</h3>
                        <h3>$item</h3>
                    </div>

                    
                </div>
        </div>
        </>

  )
}

export default App
