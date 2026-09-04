import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './css/modern.css'
import './js/script.js'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import Item from './pages/Item.jsx'
import NotFound from './pages/NotFound.jsx'
import CreateAccount from './pages/CreateAccount.jsx'
import About from './pages/About.jsx'
import Categories from './pages/Categories.jsx'
import Search from './pages/Search.jsx'
import Messages from './pages/Messages.jsx'
import Settings from './pages/Settings.jsx'
import Marketplace from './pages/Marketplace.jsx'
import ListingDetail from './pages/ListingDetail.jsx'
import CreateListing from './pages/CreateListing.jsx'
import MyListings from './pages/MyListings.jsx'
import EditListing from './pages/EditListing.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import About from './pages/About.jsx'
import Sell from './pages/Sell.jsx'
import Watchlist from './pages/Watchlist.jsx'
import Categories from './pages/Categories.jsx'
import { initializeApp } from "firebase/app"

const firebaseConfig = {
  apiKey: "AIzaSyBgVJj8-z3-qsMxXY5EfrRDIC_cxizJ130",
  authDomain: "dp2marketplace.firebaseapp.com",
  projectId: "dp2marketplace",
  storageBucket: "dp2marketplace.firebasestorage.app",
  messagingSenderId: "774988147172",
  appId: "1:774988147172:web:5bda105c78d3d1a804fff1"
};
// Initialize Firebase
initializeApp(firebaseConfig);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/item" element={<Item />} />
        <Route path="/createAccount" element={<CreateAccount />} />
        <Route path="/search" element={<Search />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/about" element={<About />} />
        <Route path="/sell" element={<Sell />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/listings/:id" element={<ListingDetail />} />
        <Route path="/sell" element={<RequireAuth><CreateListing /></RequireAuth>} />
        <Route path="/my-listings" element={<RequireAuth><MyListings /></RequireAuth>} />
        <Route path="/listings/:id/edit" element={<RequireAuth><EditListing /></RequireAuth>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
