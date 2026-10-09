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

function ItemCard({ item }) {
  return (
    <div className='recItem'>
      <img
        className='recItemImage'
        alt={item.title || 'itemImageNotFound'}
        src={item.images?.[0]?.url || 'src/img/testImage_1.png'}
      />
      <p className='recItem__category'>{item.category}</p>
      <h3 className='recItem__title' title={item.title}>{item.title}</h3>
      <p className='recItem__price'>${item.price}</p>
      <p className='recItem__seller'>Seller: {item.seller?.username || 'Unknown'}</p>
    </div>
  );
}

function App() {
  document.title = "UON Marketplace";
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [recommended, setRecommended] = useState([]);

  useEffect(() => {
    apiFetch('/api/recently-viewed', { auth: true })
      .then(setRecentlyViewed)
      .catch(() => setRecentlyViewed([]));
  }, []);

  useEffect(() => {
    apiFetch('/api/listings?limit=5')
      .then((data) => setRecommended(data.listings || []))
      .catch(() => setRecommended([]));
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
                    recentlyViewed.map((item) => <ItemCard item={item} key={item._id} />)
                )}
            </div>
        </div>

        <div id="contentBackground">
            <div className="wideContent">
                <h1>Recommended Items</h1>
            </div>
            <div className='recItemsHomepage'>
                {recommended.length === 0 ? (
                    <p>No recommended items right now.</p>
                ) : (
                    recommended.map((item) => <ItemCard item={item} key={item._id} />)
                )}
            </div>
        </div>
    </>
  )
}

export default App
