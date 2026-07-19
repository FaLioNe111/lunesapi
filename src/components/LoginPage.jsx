import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import '../style/index.css';
import '../style/Auth.css';
import starryVideo from '../assets/stars.mp4';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Сохраняем данные пользователя в localStorage
    const userData = {
      username: formData.username,
      name: formData.username, // Если нет отдельного поля name, используем username
      email: `${formData.username}@example.com`
    };
    
    localStorage.setItem('currentUser', JSON.stringify(userData));
    
    // Переход в личный кабинет
    navigate('/profile');
  };

  return (
    <div className="auth-page-wrapper">
      <Header />

      <div className="auth-container">
        {/* Видео фон */}
        <video 
          autoPlay 
          loop 
          muted 
          className="auth-video"
          playsInline
        >
          <source src={starryVideo} type="video/mp4" />
        </video>

        {/* Затемнение фона */}
        <div className="auth-overlay"></div>

        {/* Форма */}
        <div className="auth-form-wrapper">
          <div className="auth-form">
            <h1 className="auth-title">Вход</h1>
            
            <form onSubmit={handleSubmit} className="auth-form-content">
              <div className="form-group">
                <label className="form-label">Имя пользователя</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Введите логин"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Пароль</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Введите пароль"
                  required
                />
              </div>

              <button type="submit" className="auth-button">
                Войти
              </button>
            </form>

            <div className="auth-switch">
              <p>
                Нет аккаунта?
                <button 
                  type="button" 
                  onClick={() => navigate('/register')}
                  className="switch-button"
                >
                  Зарегистрироваться
                </button>
              </p>
            </div>
          </div>
        </div>

        <div className="stars"></div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default LoginPage;