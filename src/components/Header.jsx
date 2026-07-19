import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('currentUser');
      setUser(saved ? JSON.parse(saved) : null);
    } catch {
      setUser(null);
    }
  }, []);

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-item header-logo" onClick={() => navigate('/')}>
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
        </div>

        <nav className="header-nav">
          <div className="header-item" onClick={() => navigate('/stars')}>
            Звезды
          </div>
          {user ? (
            <div className="header-item header-user" onClick={() => navigate('/profile')}>
              {user.username || user.name}
            </div>
          ) : (
            <div className="header-item" onClick={() => navigate('/login')}>
              Вход
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
