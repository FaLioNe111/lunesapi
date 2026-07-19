import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import typewriterImage from '../assets/write.jpg';
import Header from '../components/Header';
import Footer from '../components/Footer';
import '../style/index.css';

const StartPage = () => {
  const navigate = useNavigate();
  const [displayText, setDisplayText] = useState('');
  const fullText = 'НАША ИСТОРИЯ НАЧИНАЛАСЬ С ЭТОЙ МАЛЕНЬКОЙ ПЛАНЕТЫ';

  useEffect(() => {
    let currentIndex = 0;
    
    const interval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setDisplayText(fullText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(interval);
        // Сразу переходим на главную после завершения текста
        setTimeout(() => {
          navigate('/');
        }, 200); 
      }
    }, 100);

    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className="start-page-wrapper">
      <Header />

      <div className="start-loading">
        <div className="loading-content">
          {/* Печатная машинка */}
          <div className="typewriter-wrapper">
            <img 
              src={typewriterImage} 
              alt="Typewriter" 
              className="typewriter-small"
            />
            <div className="typewriter-pulse"></div>
          </div>
          
          {/* Текст */}
          <div className="text-container">
            <p className="loading-text">
              {displayText}
              <span className="cursor">|</span>
            </p>
          </div>

          {/* Прогресс бар */}
          <div className="progress-wrapper">
            <div className="progress-track">
              <div 
                className="progress-line"
                style={{ 
                  width: `${(displayText.length / fullText.length) * 100}%` 
                }}
              />
            </div>
            <div className="progress-text">
              {Math.round((displayText.length / fullText.length) * 100)}%
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default StartPage;