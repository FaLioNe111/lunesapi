import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import StarAvatar from '../components/StarAvatar';
import '../style/index.css';
import '../style/Stars.css';
import '../style/InfoPage.css';

/* ===== 404 — заблудились среди звёзд ===== */

const NotFoundPage = () => (
  <div className="stars-page-wrapper">
    <Header />

    <div className="sky-layer far"></div>
    <div className="sky-layer near"></div>
    <div className="shooting-star s1"></div>
    <div className="shooting-star s2"></div>

    <main className="notfound-page">
      <div className="notfound-star">
        <StarAvatar face="sleepy" decor="swoosh" size={140} />
      </div>
      <h1 className="notfound-code">404</h1>
      <p className="catalog-end-title">Вы заблудились среди звёзд</p>
      <p className="catalog-end-sub">
        Такой страницы на нашем небе нет. Зато есть двести звёзд,
        которые ждут, когда их подарят.
      </p>
      <div className="notfound-actions">
        <Link to="/" className="catalog-reset-button">
          На главную
        </Link>
        <Link to="/stars" className="catalog-reset-button">
          В каталог
        </Link>
      </div>
    </main>

    <Footer />
  </div>
);

export default NotFoundPage;
