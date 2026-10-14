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
  const perPage = 4;

  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentPage, setRecentPage] = useState(0);

  const [recommended, setRecommended] = useState([]);
  const [recommendedLoading, setRecommendedLoading] = useState(true);
  const [recommendedPage, setRecommendedPage] = useState(0);

  useEffect(() => {
    apiFetch('/api/recently-viewed', { auth: true })
      .then((data) => setRecentlyViewed(Array.isArray(data) ? data : []))
      .catch(() => setRecentlyViewed([]))
      .finally(() => setRecentLoading(false));
  }, []);

  useEffect(() => {
    apiFetch('/api/listings?limit=10')
      .then((data) => setRecommended(data.listings || []))
      .catch(() => setRecommended([]))
      .finally(() => setRecommendedLoading(false));
  }, []);

  const recentPages = Math.ceil(recentlyViewed.length / perPage);
  const recommendedPages = Math.ceil(recommended.length / perPage);

  const shownRecent = recentlyViewed.slice(recentPage * perPage, recentPage * perPage + perPage);
  const shownRecommended = recommended.slice(recommendedPage * perPage, recommendedPage * perPage + perPage);

  return (
    <>
        <div id="headerImage">
            <img src="src/img/panorama_background.webp" alt="background image" style={bannerImgStyle} />
        </div>

        <div id="contentBackground">
            <div className="wideContent">
                <h1>Recently viewed</h1>
            </div>
            <div className="homeListings">
                <ListingGrid
                  listings={shownRecent}
                  loading={recentLoading}
                  error=""
                  emptyMessage="No recently viewed items yet."
                />
                {recentPages > 1 ? (
                  <div className="homeArrows">
                    <button onClick={() => setRecentPage(recentPage - 1)} disabled={recentPage === 0}>←</button>
                    <span>{recentPage + 1} / {recentPages}</span>
                    <button onClick={() => setRecentPage(recentPage + 1)} disabled={recentPage === recentPages - 1}>→</button>
                  </div>
                ) : null}
            </div>
        </div>

        <div id="contentBackground">
            <div className="wideContent">
                <h1>Recommended Items</h1>
            </div>
            <div className="homeListings">
                <ListingGrid
                  listings={shownRecommended}
                  loading={recommendedLoading}
                  error=""
                  emptyMessage="No recommended items right now."
                />
                {recommendedPages > 1 ? (
                  <div className="homeArrows">
                    <button onClick={() => setRecommendedPage(recommendedPage - 1)} disabled={recommendedPage === 0}>←</button>
                    <span>{recommendedPage + 1} / {recommendedPages}</span>
                    <button onClick={() => setRecommendedPage(recommendedPage + 1)} disabled={recommendedPage === recommendedPages - 1}>→</button>
                  </div>
                ) : null}
            </div>
        </div>
    </>
  )
}

export default App
