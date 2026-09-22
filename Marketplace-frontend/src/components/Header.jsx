import '../css/styles/header.css';
import '../css/styles/sidebar.css';
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react';
import { getHeaderAuthView, getMarketplaceSearchTerm, buildMarketplaceSearchUrl } from '@/js/script'
import { session } from '@/auth/session';
import { useChatStore } from '@/store/useChatStore';

export default function Header()  {
    const navigate = useNavigate();
    const location = useLocation();

    const [authView, setAuthView] = useState(() => getHeaderAuthView(session.hasSession()));
    const [searchValue, setSearchValue] = useState(() => getMarketplaceSearchTerm(location));
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const hasUnreadMessages = useChatStore((state) => state.unreadConversationIds.length > 0);

    const sidebarRef = useRef(null);
    const toggleRef = useRef(null);
    const closeRef = useRef(null);

    // keep track of current session to modify behaviour of user icon
    useEffect(() => {
        const updateSession = () => setAuthView(getHeaderAuthView(session.hasSession()))
        const unsubscribe = session.subscribe?.(updateSession) ?? (() => {});
        return unsubscribe;
    },[]);

    useEffect(() => {
        setSearchValue(getMarketplaceSearchTerm(location));
    }, [location.pathname, location.search]);

    // handle sidebar, mostly copy from sidebar.js
    useEffect(() => {
        if (isSidebarOpen) {
            closeRef.current?.focus();
        }

        function handlePointerDown(event) {
            if (!isSidebarOpen) return;
            if (sidebarRef.current?.contains(event.target) || toggleRef.current?.contains(event.target)) {
                return;
            }
            setSidebarOpen(false);
        }

        function handleKeyDown(event) {
            if (event.key === 'Escape' && isSidebarOpen) {
                event.preventDefault();
                setSidebarOpen(false);
                toggleRef.current?.focus();
            }
        }
        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isSidebarOpen]);

    function handleSearchSubmit(event) {
        event.preventDefault();
        const destination = buildMarketplaceSearchUrl(searchValue);
        if (destination) {
            navigate(destination);
        }
    }

    function handleLogout(event) {
        event.preventDefault();
        useChatStore.getState().resetChatState();
        session.clear();
        closeSidebarAndFocusToggle();
        navigate('/');
    }

    function closeSidebarAndFocusToggle() {
        setSidebarOpen(false);
        toggleRef.current?.focus();
    }
  
    return (
        <div id="headerSection">
            <div id="headerElements">
                <div className="marketplaceLogo">
                    <Link to="/">
                        <img src="/src/img/logo.jpg" alt="University of Newcastle Marketplace" width="200" id="logo"/>
                    </Link>
                </div>
                {/* <!-- Search Bar --> */}
                <form id="headerSearch" role="search" onSubmit={handleSearchSubmit}>
                    <input id="headerSearchInput" type="search" name="search" aria-label="Search marketplace" placeholder="Search the marketplace..." autoComplete="off" value={searchValue} onChange={(e) => setSearchValue(e.target.value)}/>
                    <button className="headerSearchSubmit" type="submit" aria-label="Search">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                            <circle cx="10.5" cy="10.5" r="6.5"/>
                            <path d="m16 16 4 4"/>
                        </svg>
                    </button>
                </form>
                {/* <!-- Icon Buttons -->
                <!-- Messages --> */}
                <Link className="messageButton" to="/messages" aria-label={hasUnreadMessages ? 'Messages, unread messages' : 'Messages'}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16v12H8l-4 4V4z"/>
                    </svg>
                    {hasUnreadMessages && <span className="messageUnreadDot" aria-hidden="true" />}
                </Link>
                {/* <!-- Account --> */}
                <Link className="accountButton" id="accountLink" to={authView.accountHref} aria-label={authView.accountLabel}>
                    <svg id="accountImage" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="8" r="4"/>
                        <path d="M4 20c0-4 3.5-6 8-6s8 2 8 6"/>
                    </svg>
                </Link>
                {/* <!-- Options --> */}
                <div className="optionsButton">
                    <button ref={toggleRef} className="optionsButtonImage" id="sidebarToggle" type="button" aria-controls="sidebar" aria-expanded="false" aria-label="Open navigation menu" onClick={() => setSidebarOpen((open) => !open)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <line x1="4" y1="7" x2="20" y2="7"/>
                            <line x1="4" y1="12" x2="20" y2="12"/>
                            <line x1="4" y1="17" x2="20" y2="17"/>
                        </svg>
                    </button>
                    <nav ref={sidebarRef} className="sidebar" id="sidebar" aria-label="Site navigation" hidden={!isSidebarOpen}>
                        <div className="sidebarContent">
                            <div className="sidebarTop">
                                {authView.showSellerLinks && (
                                    <Link to="/sell" onClick={closeSidebarAndFocusToggle}><p>Sell</p></Link>
                                )}
                                <Link to="/watchlist" onClick={closeSidebarAndFocusToggle}><p>Watchlist</p></Link>
                                <button ref={closeRef} id="sidebarClose" className="closebtn" type="button" aria-label="Close navigation menu" onClick={closeSidebarAndFocusToggle}>&times;</button>
                            </div>
                            <Link to="/" onClick={closeSidebarAndFocusToggle}><p>Home</p></Link>
                            <Link to="/marketplace" onClick={closeSidebarAndFocusToggle}><p>Marketplace</p></Link>
                            <Link to="/categories" onClick={closeSidebarAndFocusToggle}><p>Categories</p></Link>
                            {authView.showSellerLinks && (
                                <Link to="/my-listings" onClick={closeSidebarAndFocusToggle}><p>My Listings</p></Link>
                            )}
                            {authView.showLoginLink && (
                                <Link to="/login" onClick={closeSidebarAndFocusToggle}><p>Log In</p></Link>
                            )}
                            {authView.showLogoutButton && (
                                <Link to="/" onClick={handleLogout}><p>Log Out</p></Link>
                            )}
                            <Link to="/messages" onClick={closeSidebarAndFocusToggle}><p>Messages</p></Link>
                            <p>Purchase History</p>
                            <Link to="/settings" onClick={closeSidebarAndFocusToggle}><p>Settings</p></Link>
                            <p>Help</p>
                            <Link to="/about" onClick={closeSidebarAndFocusToggle}><p>About</p></Link>
                        </div>
                    </nav>
                </div>
            </div>
      </div>
    )
}
