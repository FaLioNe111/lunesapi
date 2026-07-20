import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import StarAvatar from '../components/StarAvatar';
import { RARITIES, normalizeRarity } from '../data/rarities';
import { getCurrentUser, updateProfile, logout } from '../data/auth';
import { fetchOrders } from '../data/orders';
import '../style/index.css';
import '../style/Profile.css';
import starryVideo from '../assets/stars.mp4';

/**
 * ===== Личный кабинет =====
 *
 * Вкладки: «Мои звёзды», «Заказы», «Настройки».
 * Купленные звёзды складываются из демо-набора и заказов,
 * оформленных через корзину (localStorage 'orders').
 * TODO(backend): заменить localStorage на API профиля и заказов.
 */

/* Вкладки кабинета */
const PROFILE_TABS = [
  { id: 'stars', label: 'Мои звёзды' },
  { id: 'orders', label: 'Заказы' },
  { id: 'settings', label: 'Настройки' },
];

// Купленные звёзды (демо-набор — как будто куплены раньше).
// cartId совпадают с реальными звёздами каталога, чтобы работали
// страницы звезды и подарка
const purchasedStars = [
  {
    id: 1,
    cartId: 'star-guiding-1',
    name: 'Сириус',
    constellation: 'Большой Пёс',
    rarity: 'guiding',
    face: 'joy',
    decor: 'sparkles',
    giftedTo: 'Анна',
    giftMessage: 'Пусть самая яркая звезда неба светит только тебе',
    purchaseDate: '15.03.2024',
  },
  {
    id: 2,
    cartId: 'star-guiding-2',
    name: 'Вега',
    constellation: 'Лира',
    rarity: 'guiding',
    face: 'happy',
    decor: 'ring',
    giftedTo: 'Мария',
    giftMessage: 'Теперь у тебя есть своя точка опоры на небе',
    purchaseDate: '22.04.2024',
  },
  {
    id: 3,
    cartId: 'star-guiding-0',
    name: 'Полярная звезда',
    constellation: 'Малая Медведица',
    rarity: 'guiding',
    face: 'wink',
    decor: 'orbit',
    giftedTo: 'Екатерина',
    giftMessage: 'Чтобы ты всегда находила дорогу домой',
    purchaseDate: '10.05.2024',
  },
];

/* Ссылка на праздничную страницу подарка — её и отправляют получателю.
   TODO(backend): сервер должен выдавать короткий id подарка вместо параметров */
const makeGiftLink = (cartId, giftedTo, fromName, message) => {
  const params = new URLSearchParams();
  if (giftedTo) params.set('to', giftedTo);
  if (fromName) params.set('from', fromName);
  if (message) params.set('m', message);
  const qs = params.toString();
  return `${window.location.origin}/gift/${cartId}${qs ? `?${qs}` : ''}`;
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const [copiedId, setCopiedId] = useState(null);
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState('stars');
  const [orders, setOrders] = useState([]);
  const [settingsForm, setSettingsForm] = useState(null);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    // Загружаем данные пользователя через мок-API авторизации
    const parsed = getCurrentUser();
    if (parsed) {
      setUserData(parsed);
      setSettingsForm({
        name: parsed.name || '',
        username: parsed.username || '',
        email: parsed.email || '',
      });
    } else {
      // Если данных нет, перенаправляем на вход
      navigate('/login');
    }

    // История заказов, оформленных через корзину
    fetchOrders().then(setOrders);
  }, [navigate]);

  /* Полный список звёзд: демо + купленные через корзину.
     У каждой — ссылка на праздничную страницу подарка */
  const allStars = useMemo(() => {
    const fromName = userData?.name || '';
    const fromOrders = orders.flatMap((order) =>
      order.items.map((it, idx) => ({
        id: `${order.number}-${idx}`,
        cartId: it.cartId,
        name: it.name,
        constellation: it.constellation,
        /* в старых заказах могли остаться прежние id редкостей */
        rarity: normalizeRarity(it.rarity),
        face: it.face,
        decor: it.decor,
        giftedTo: it.giftedTo,
        link: makeGiftLink(it.cartId, it.giftedTo, fromName, order.giftMessage),
        purchaseDate: order.date,
      }))
    );
    const demo = purchasedStars.map((s) => ({
      ...s,
      link: makeGiftLink(s.cartId, s.giftedTo, fromName, s.giftMessage),
    }));
    return [...fromOrders, ...demo];
  }, [orders, userData]);

  /* Статистика для верхней панели кабинета */
  const stats = useMemo(() => {
    const spent = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const best = allStars.reduce(
      (top, s) =>
        !top || (RARITIES[s.rarity]?.order ?? 0) > (RARITIES[top.rarity]?.order ?? 0)
          ? s
          : top,
      null
    );
    return {
      starsCount: allStars.length,
      ordersCount: orders.length,
      spent,
      bestRarity: best ? RARITIES[best.rarity]?.label : '—',
    };
  }, [allStars, orders]);

  const handleCopyLink = async (starId, link) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(starId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Не удалось скопировать ссылку:', err);
    }
  };

  const handleLogout = async () => {
    // Удаляем данные пользователя
    await logout();
    navigate('/login');
  };

  /* Сохранение настроек профиля через мок-API */
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    const updated = await updateProfile(settingsForm);
    setUserData(updated);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
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
          {/* Шапка кабинета: аватар, имя, выход */}
          <div className="profile-header">
            <div className="profile-identity">
              <div className="profile-avatar">
                {(userData.name || userData.username || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="profile-title">{userData.name || userData.username}</h1>
                <p className="profile-subtitle">
                  @{userData.username} · {userData.email}
                </p>
              </div>
            </div>
            <button onClick={handleLogout} className="logout-button">
              Выйти
            </button>
          </div>

          {/* Статистика */}
          <div className="profile-stats">
            <div className="stat-card">
              <span className="stat-value">{stats.starsCount}</span>
              <span className="stat-label">звёзд подарено</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats.ordersCount}</span>
              <span className="stat-label">заказов</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats.spent.toLocaleString('ru-RU')} ₽</span>
              <span className="stat-label">потрачено на небо</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats.bestRarity}</span>
              <span className="stat-label">лучшая редкость</span>
            </div>
          </div>

          {/* Вкладки */}
          <div className="profile-tabs">
            {PROFILE_TABS.map((tab) => (
              <button
                key={tab.id}
                className={`profile-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ===== Вкладка «Мои звёзды» ===== */}
          {activeTab === 'stars' && (
            <div className="profile-section">
              <h2 className="section-title">Мои звёзды ({allStars.length})</h2>

              {allStars.length === 0 ? (
                <div className="no-stars">
                  <p>У вас пока нет купленных звёзд</p>
                  <button
                    onClick={() => navigate('/stars')}
                    className="browse-stars-button"
                  >
                    Выбрать звезду
                  </button>
                </div>
              ) : (
                <div className="stars-grid">
                  {allStars.map((star) => (
                    <div key={star.id} className="star-card">
                      <div className="star-header">
                        <div className="star-header-visual">
                          <StarAvatar face={star.face} decor={star.decor} size={56} />
                          <div>
                            <h3 className="star-name">{star.name}</h3>
                            <span className="star-constellation">{star.constellation}</span>
                          </div>
                        </div>
                        {star.rarity && star.rarity !== 'nameless' && (
                          <span className={`profile-rarity ${star.rarity}`}>
                            {RARITIES[star.rarity]?.label}
                          </span>
                        )}
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
                          Открыть страницу подарка
                        </a>
                        <button
                          onClick={() => handleCopyLink(star.id, star.link)}
                          className="copy-link-button"
                        >
                          {copiedId === star.id ? (
                            <span className="copied-text">✓ Скопировано</span>
                          ) : (
                            <span className="copy-text">Копировать ссылку для получателя</span>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== Вкладка «Заказы» ===== */}
          {activeTab === 'orders' && (
            <div className="profile-section">
              <h2 className="section-title">История заказов</h2>

              {orders.length === 0 ? (
                <div className="no-stars">
                  <p>Заказов пока не было — всё впереди</p>
                  <button
                    onClick={() => navigate('/stars')}
                    className="browse-stars-button"
                  >
                    В каталог
                  </button>
                </div>
              ) : (
                <div className="orders-list">
                  {orders.map((order) => (
                    <div key={order.number} className="order-card">
                      <div className="order-head">
                        <span className="order-number">Заказ {order.number}</span>
                        <span className="order-status">{order.status}</span>
                      </div>
                      <div className="order-meta">
                        {order.date} · {order.items.length}{' '}
                        {order.items.length === 1 ? 'звезда' : 'звезды'} ·{' '}
                        {order.total.toLocaleString('ru-RU')} ₽
                      </div>
                      <div className="order-items">
                        {order.items.map((it, idx) => (
                          <span key={idx} className="order-item-chip">
                            {it.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== Вкладка «Настройки» ===== */}
          {activeTab === 'settings' && settingsForm && (
            <div className="profile-section">
              <h2 className="section-title">Настройки профиля</h2>

              <form className="settings-form" onSubmit={handleSaveSettings}>
                <label className="settings-field">
                  <span>Имя</span>
                  <input
                    type="text"
                    value={settingsForm.name}
                    onChange={(e) =>
                      setSettingsForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </label>
                <label className="settings-field">
                  <span>Имя пользователя</span>
                  <input
                    type="text"
                    value={settingsForm.username}
                    onChange={(e) =>
                      setSettingsForm((f) => ({ ...f, username: e.target.value }))
                    }
                  />
                </label>
                <label className="settings-field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={settingsForm.email}
                    onChange={(e) =>
                      setSettingsForm((f) => ({ ...f, email: e.target.value }))
                    }
                  />
                </label>

                <div className="settings-actions">
                  <button type="submit" className="browse-stars-button">
                    Сохранить
                  </button>
                  {settingsSaved && (
                    <span className="settings-saved">Сохранено</span>
                  )}
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default ProfilePage;
