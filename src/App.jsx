import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import StartPage from './pages/StartPage';
import StarsPage from './pages/StarsPage';
import StarPage from './pages/StarPage';
import CartPage from './pages/CartPage';
import InfoPage from './pages/InfoPage';
import NotFoundPage from './pages/NotFoundPage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import ProfilePage from './components/ProfilePage';
import { CartProvider } from './context/CartContext';

function App() {
  return (
    /* CartProvider выше роутера — корзина доступна на любой странице */
    <CartProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/start" element={<StartPage />} />
          <Route path="/stars" element={<StarsPage />} />
          <Route path="/star/:cartId" element={<StarPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/info/:slug" element={<InfoPage />} />
          {/* всё неизвестное — на страницу 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </CartProvider>
  );
}

export default App;
