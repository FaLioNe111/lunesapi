import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import '../style/index.css';
import '../style/Profile.css';
import starryVideo from '../assets/stars.mp4';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [copiedId, setCopiedId] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    // Загружаем данные пользователя из localStorage
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setUserData(JSON.parse(savedUser));
    } else {
      // Если данных нет, перенаправляем на вход
      navigate('/login');
    }
  }, [navigate]);

  // Купленные звёзды 
  const purchasedStars = [
    {
      id: 1,
      name: 'Сириус',
      constellation: 'Большой Пёс',
      giftedTo: 'Анна', 
      link: 'http://localhost:5173/',
      purchaseDate: '15.03.2024'
    },
    {
      id: 2,
      name: 'Вега',
      constellation: 'Лира',
      giftedTo: 'Мария', 
      link: 'http://localhost:5173/',
      purchaseDate: '22.04.2024'
    },
    {
      id: 3,
      name: 'Полярная звезда',
      constellation: 'Малая Медведица',
      giftedTo: 'Екатерина', 
      link: 'http://localhost:5173/',
      purchaseDate: '10.05.2024'
    }
  ];

  const handleCopyLink = async (starId, link) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(starId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Не удалось скопировать ссылку:', err);
    }
  };

  const handleLogout = () => {
    // Удаляем данные пользователя
    localStorage.removeItem('currentUser');
    navigate('/login');
  };

  // Если данные ещё не загружены
  if (!userData) {
    return null;
  }

  return (
    <div className="profile-page-wrapper">
      <Header />

      <div className="profile-container">
        {/* Видео фон */}
        <video 
          autoPlay 
          loop 
          muted 
          className="profile-video"
          playsInline
        >
          <source src={starryVideo} type="video/mp4" />
        </video>

        {/* Затемнение фона */}
        <div className="profile-overlay"></div>

        {/* Контент */}
        <div className="profile-content">
          <div className="profile-header">
            <h1 className="profile-title">Личный кабинет</h1>
            <button onClick={handleLogout} className="logout-button">
              Выйти
            </button>
          </div>

          {/* Информация о пользователе */}
          <div className="profile-section">
            <h2 className="section-title">Информация о пользователе</h2>
            <div className="user-info-card">
              <div className="info-row">
                <span className="info-label">Имя:</span>
                <span className="info-value">{userData.name}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Имя пользователя:</span>
                <span className="info-value">{userData.username}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Email:</span>
                <span className="info-value">{userData.email}</span>
              </div>
            </div>
          </div>

          {/* Купленные звёзды */}
          <div className="profile-section">
            <h2 className="section-title">Мои звёзды ({purchasedStars.length})</h2>
            
            {purchasedStars.length === 0 ? (
              <div className="no-stars">
                <p>У вас пока нет купленных звёзд</p>
                <button 
                  onClick={() => navigate('/')}
                  className="browse-stars-button"
                >
                  Выбрать звезду
                </button>
              </div>
            ) : (
              <div className="stars-grid">
                {purchasedStars.map((star) => (
                  <div key={star.id} className="star-card">
                    <div className="star-header">
                      <h3 className="star-name">{star.name}</h3>
                      <span className="star-constellation">{star.constellation}</span>
                    </div>
                    
                    <div className="star-details">
                      <div className="detail-row">
                        <span className="detail-label">Подарена:</span>
                        <span className="detail-value">{star.giftedTo}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Дата покупки:</span>
                        <span className="detail-value">{star.purchaseDate}</span>
                      </div>
                    </div>

                    <div className="star-actions">
                      <a 
                        href={star.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="view-star-button"
                      >
                        Посмотреть вашу звезду на нашей карте
                      </a>
                      <button 
                        onClick={() => handleCopyLink(star.id, star.link)}
                        className="copy-link-button"
                      >
                        {copiedId === star.id ? (
                          <span className="copied-text">✓ Скопировано</span>
                        ) : (
                          <span className="copy-text">Копировать ссылку</span>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default ProfilePage;