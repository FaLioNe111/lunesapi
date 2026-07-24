import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { getCurrentUser } from '../data/auth';
import { getBalance } from '../data/tokens';

const Header = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState(0);
  const { count } = useCart();

  useEffect(() => {
    setUser(getCurrentUser());
    setTokens(getBalance());

    /* баланс мог измениться на другой странице — слушаем событие */
    const onTokensChange = (e) => setTokens(e.detail);
    window.addEventListener('tokens:change', onTokensChange);
    return () => window.removeEventListener('tokens:change', onTokensChange);
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
          <span>Лого</span>
        </button>

        <nav className="header-nav">
          <button type="button" className="header-item" onClick={() => navigate('/stars')}>
            Звезды
          </button>
          <button type="button" className="header-item" onClick={() => navigate('/wheel')}>
            Рулетка
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
            <>
              {/* баланс токенов — валюта рулетки */}
              <button
                type="button"
                className="header-item header-tokens"
                onClick={() => navigate('/profile?tab=tokens')}
                aria-label={`Токены: ${tokens}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
                  <polygon
                    points="12,7 13.5,10.6 17.4,11 14.5,13.6 15.4,17.4 12,15.5 8.6,17.4 9.5,13.6 6.6,11 10.5,10.6"
                    fill="currentColor"
                  />
                </svg>
                {tokens}
              </button>
              <button
                type="button"
                className="header-item header-user"
                onClick={() => navigate('/profile')}
              >
                {user.username || user.name}
              </button>
            </>
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
