import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { getCurrentUser } from '../data/auth';

const Header = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const { count } = useCart();

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  return (
    <header className="header">
      <div className="header-content">
        {/* кнопки вместо div — работает навигация с клавиатуры */}
        <button
          type="button"
          className="header-item header-logo"
          onClick={() => navigate('/')}
        >
          <svg width="24" height="24" viewBox="0 0 120 120" aria-hidden="true">
            <polygon
              points="60,24 71.2,46.6 96.1,50.3 78.1,67.9 82.3,92.7 60,81 37.7,92.7 41.9,67.9 23.9,50.3 48.8,46.6"
              fill="#f3d488"
              stroke="#f3d488"
              strokeWidth="14"
              strokeLinejoin="round"
            />
          </svg>
          <span>Звездочёт</span>
        </button>

        <nav className="header-nav">
          <button type="button" className="header-item" onClick={() => navigate('/stars')}>
            Звезды
          </button>
          {/* Корзина со счётчиком выбранных звёзд */}
          <button
            type="button"
            className="header-item header-cart"
            onClick={() => navigate('/cart')}
            aria-label={count > 0 ? `Корзина, ${count} звёзд` : 'Корзина'}
          >
            Корзина
            {count > 0 && <span className="header-cart-count">{count}</span>}
          </button>
          {user ? (
            <button
              type="button"
              className="header-item header-user"
              onClick={() => navigate('/profile')}
            >
              {user.username || user.name}
            </button>
          ) : (
            <button type="button" className="header-item" onClick={() => navigate('/login')}>
              Вход
            </button>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
