import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { login, requestPasswordReset } from '../data/auth';
import '../style/index.css';
import '../style/Auth.css';
import starryVideo from '../assets/stars.mp4';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [formError, setFormError] = useState(null);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Простая валидация на фронте
    if (formData.username.trim().length < 3) {
      setFormError('Логин должен быть не короче 3 символов');
      return;
    }
    if (formData.password.length < 6) {
      setFormError('Пароль должен быть не короче 6 символов');
      return;
    }
    setFormError(null);

    // Вход через мок-API (TODO(backend): реальная проверка пароля на сервере)
    await login(formData);

    // Переход в личный кабинет
    navigate('/profile');
  };

  /* Мок восстановления пароля: «отправляем письмо» на логин-почту */
  const handleForgot = async () => {
    if (formData.username.trim().length < 3) {
      setFormError('Укажите логин — на его почту придёт письмо для восстановления');
      return;
    }
    setFormError(null);
    await requestPasswordReset(formData.username);
    setResetSent(true);
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

              {formError && <p className="auth-error">{formError}</p>}

              <button type="submit" className="auth-button">
                Войти
              </button>
            </form>

            {/* Восстановление пароля (мок) */}
            <div className="auth-forgot">
              {resetSent ? (
                <p className="auth-success">
                  Письмо для восстановления отправлено — проверьте почту
                </p>
              ) : forgotMode ? (
                <button
                  type="button"
                  className="switch-button"
                  onClick={handleForgot}
                >
                  Отправить письмо для восстановления
                </button>
              ) : (
                <button
                  type="button"
                  className="switch-button"
                  onClick={() => setForgotMode(true)}
                >
                  Забыли пароль?
                </button>
              )}
            </div>

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