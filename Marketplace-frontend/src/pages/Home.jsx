import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client.js';
import ListingGrid from '../components/ListingGrid.jsx';
import '../css/listings.css';
import '../css/styles/home.css';

const bannerImgStyle = {
    objectFit: 'cover',
    width: '100%',
    height: '350px',
  };

function App() {
  document.title = "UON Marketplace";
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recommended, setRecommended] = useState([]);
  const [recommendedLoading, setRecommendedLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/recently-viewed', { auth: true })
      .then((data) => setRecentlyViewed(Array.isArray(data) ? data : []))
      .catch(() => setRecentlyViewed([]))
      .finally(() => setRecentLoading(false));
  }, []);

  useEffect(() => {
    apiFetch('/api/listings?limit=5')
      .then((data) => setRecommended(data.listings || []))
      .catch(() => setRecommended([]))
      .finally(() => setRecommendedLoading(false));
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
            <ListingGrid
              listings={recentlyViewed}
              loading={recentLoading}
              error=""
              emptyMessage="No recently viewed items yet."
            />
        </div>

        <div id="contentBackground">
            <div className="wideContent">
                <h1>Recommended Items</h1>
            </div>
            <ListingGrid
              listings={recommended}
              loading={recommendedLoading}
              error=""
              emptyMessage="No recommended items right now."
            />
        </div>
    </>
  )
}

export default App
