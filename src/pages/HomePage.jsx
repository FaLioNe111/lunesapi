import React from 'react';
import { useNavigate } from 'react-router-dom';
import nightScene from '../assets/night-scene.png';
import Header from '../components/Header';
import Footer from '../components/Footer';
import '../style/index.css';

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="home-page-wrapper">
      <Header />

      {/* Секция с картинкой */}
      <div className="hero-section">
        <div className="hero-image-wrapper">
          <img
            src={nightScene}
            alt="Night Scene"
            className="hero-image"
          />

          {/* Сияние луны и мерцающие искры на небе */}
          <div className="moon-glow" aria-hidden="true"></div>
          <div className="hero-sparkle s1" aria-hidden="true"></div>
          <div className="hero-sparkle s2" aria-hidden="true"></div>
          <div className="hero-sparkle s3" aria-hidden="true"></div>
          <div className="hero-sparkle s4" aria-hidden="true"></div>
          <div className="hero-sparkle s5" aria-hidden="true"></div>

          {/* Разговор человечков */}
          <div className="speech-bubble speech-girl">
            Загадала желание вон на ту, самую яркую…
          </div>
          <div className="speech-bubble speech-boy">
            Не загадывай — я её тебе подарю
          </div>

          {/* Телескоп с анимацией */}
          <button
            onClick={() => navigate('/start')}
            className="telescope-container"
            aria-label="Смотреть в телескоп"
          >
            <div className="telescope-glow"></div>
          </button>

          <div className="telescope-hint">
            Нажмите, чтобы начать
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default HomePage;