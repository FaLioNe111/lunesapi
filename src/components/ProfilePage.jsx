import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import StarAvatar from '../components/StarAvatar';
import { RARITIES, normalizeRarity } from '../data/rarities';
import { getCurrentUser, updateProfile, logout } from '../data/auth';
import { fetchOrders } from '../data/orders';
import { TOKEN_PACKS, getBalance, buyTokens, ticketWord } from '../data/tokens';
import { getWins } from '../data/wheel';
import '../style/index.css';
import '../style/Profile.css';
import starryVideo from '../assets/stars.mp4';
import ticketImg from '../assets/ticket.webp';
import { makeGiftUrl } from '../data/gift';
import {
  fetchStarPrefs,
  patchStar,
  deleteStar,
  applyStarPrefs,
  canRename,
} from '../data/stars';
import QRCode from 'qrcode';

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
  { id: 'tokens', label: 'Билеты' },
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
    color: 'silver',
    image: 'guiding-2',
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
    color: 'blue',
    image: 'guiding-3',
    giftedTo: 'Мария',
    giftMessage: 'Теперь у тебя есть своя точка опоры на небе',
    purchaseDate: '22.04.2024',
  },
  {
    id: 3,
    cartId: 'star-guiding-0',
    name: 'Полярная',
    constellation: 'Малая Медведица',
    rarity: 'guiding',
    face: 'wink',
    decor: 'orbit',
    color: 'gold',
    image: 'guiding-1',
    giftedTo: 'Екатерина',
    giftMessage: 'Чтобы ты всегда находила дорогу домой',
    purchaseDate: '10.05.2024',
  },
];

/* Ссылка на праздничную страницу подарка — её показывают QR-кодом.
   Адрес намеренно длинный и непрозрачный: QR легко попадает в чужой кадр,
   а по такому токену посторонний ничего не подберёт. */
const makeGiftLink = (cartId, giftedTo, fromName, message, starName) =>
  makeGiftUrl({
    cartId,
    to: giftedTo,
    from: fromName,
    message,
    name: starName,
  });

const ProfilePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [copiedId, setCopiedId] = useState(null);
  const [userData, setUserData] = useState(null);
  /* вкладку можно открыть ссылкой: /profile?tab=tokens */
  const [activeTab, setActiveTab] = useState(
    () => searchParams.get('tab') || 'stars'
  );
  const [orders, setOrders] = useState([]);
  const [wins, setWins] = useState([]);
  const [settingsForm, setSettingsForm] = useState(null);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [tokens, setTokens] = useState(0);
  const [boughtPack, setBoughtPack] = useState(null);
  /* показ QR-кода подарка: { star, dataUrl } */
  const [qr, setQr] = useState(null);
  /* правки звёзд (скрытие, удаление, переименование) */
  const [prefs, setPrefs] = useState({});
  const [showHidden, setShowHidden] = useState(false);
  /* окно настройки звезды и подтверждение удаления */
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  /* Скрыть/показать звезду */
  const toggleHidden = async (star) => {
    setPrefs({ ...(await patchStar(star.id, { hidden: !star.hidden })) });
  };

  /* Удаление (мягкое: исходный заказ или выигрыш остаётся цел) */
  const handleDelete = async (star) => {
    setPrefs({ ...(await deleteStar(star.id)) });
    setConfirmDelete(null);
  };

  /* Сохранение настроек звезды */
  const handleSaveStar = async (e) => {
    e.preventDefault();
    const { id, name, giftedTo, giftMessage } = editing;
    setPrefs({ ...(await patchStar(id, { name: name.trim(), giftedTo, giftMessage })) });
    setEditing(null);
  };

  /* Рисуем QR прямо на клиенте — ссылка никуда не уходит */
  const openQr = async (star) => {
    const dataUrl = await QRCode.toDataURL(star.link, {
      width: 640,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0b1533', light: '#ffffff' },
    });
    setQr({ star, dataUrl });
  };

  useEffect(() => {
    setTokens(getBalance());
  }, []);

  /* Покупка набора токенов (мок: начисляем сразу).
     TODO(backend): сначала оплата, потом начисление с сервера */
  const handleBuyTokens = async (pack) => {
    const balance = await buyTokens(pack);
    setTokens(balance);
    setBoughtPack(pack.id);
    setTimeout(() => setBoughtPack(null), 2500);
  };

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
    // Звёзды, выигранные в рулетке
    setWins(getWins());
    // Пользовательские правки звёзд
    fetchStarPrefs().then(setPrefs);
  }, [navigate]);

  /* Исходный список звёзд: выигрыши + заказы + демо.
     id стабильный — по нему хранятся правки пользователя */
  const rawStars = useMemo(() => {
    const fromOrders = orders.flatMap((order) =>
      order.items.map((it, idx) => ({
        id: `${order.number}-${idx}`,
        cartId: it.cartId,
        name: it.name || 'Безымянная звезда',
        constellation: it.constellation,
        /* в старых заказах могли остаться прежние id редкостей */
        rarity: normalizeRarity(it.rarity),
        face: it.face,
        decor: it.decor,
        color: it.color,
        variant: it.variant,
        image: it.image,
        giftedTo: it.giftedTo,
        giftMessage: order.giftMessage,
        purchaseDate: order.date,
      }))
    );
    const demo = purchasedStars.map((s) => ({ ...s, id: `demo-${s.id}` }));
    /* выигранные в рулетке — свежие сверху */
    const fromWins = wins.map((w) => ({
      id: w.cartId,
      cartId: w.cartId,
      name: w.name,
      constellation: w.system || w.constellation || 'Рулетка звёзд',
      rarity: normalizeRarity(w.rarity),
      face: w.face,
      decor: w.decor,
      color: w.color,
      variant: w.variant,
      image: w.image,
      giftedTo: '',
      giftMessage: '',
      purchaseDate: w.wonAt,
      won: true,
    }));
    return [...fromWins, ...fromOrders, ...demo];
  }, [orders, wins]);

  /* Правки пользователя поверх исходных данных, затем — ссылка на подарок:
     переименовал звезду — новое имя уедет и в подарок */
  const allStars = useMemo(() => {
    const fromName = userData?.name || '';
    return applyStarPrefs(rawStars, prefs, showHidden).map((s) => ({
      ...s,
      link: makeGiftLink(s.cartId, s.giftedTo, fromName, s.giftMessage, s.name),
    }));
  }, [rawStars, prefs, showHidden, userData]);

  /* сколько сейчас скрыто — для переключателя */
  const hiddenCount = useMemo(
    () => rawStars.filter((s) => prefs[s.id]?.hidden && !prefs[s.id]?.deleted).length,
    [rawStars, prefs]
  );

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
            <div className="stat-card">
              <span className="stat-value">{tokens}</span>
              <span className="stat-label">{ticketWord(tokens)} для колеса</span>
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
              <div className="stars-toolbar">
                <h2 className="section-title">Мои звёзды ({allStars.length})</h2>
                {hiddenCount > 0 && (
                  <label className="hidden-toggle">
                    <input
                      type="checkbox"
                      checked={showHidden}
                      onChange={(e) => setShowHidden(e.target.checked)}
                    />
                    <span>Показать скрытые ({hiddenCount})</span>
                  </label>
                )}
              </div>

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
                    <div key={star.id} className={`star-card ${star.hidden ? 'is-hidden' : ''}`}>
                    {star.hidden && <span className="hidden-badge">Скрыта</span>}
                      <div className="star-header">
                        <div className="star-header-visual">
                          <StarAvatar
                            face={star.face}
                            decor={star.decor}
                            size={56}
                            color={star.color}
                            variant={star.variant}
                            image={star.image}
                          />
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
                        <button
                          onClick={() => openQr(star)}
                          className="view-star-button"
                        >
                          Показать QR-код подарка
                        </button>
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

                        {/* управление звездой */}
                        <div className="star-manage">
                          <button
                            className="manage-button"
                            onClick={() =>
                              setEditing({
                                id: star.id,
                                name: star.name,
                                giftedTo: star.giftedTo || '',
                                giftMessage: star.giftMessage || '',
                                renamable: canRename(star),
                              })
                            }
                          >
                            Настроить
                          </button>
                          <button className="manage-button" onClick={() => toggleHidden(star)}>
                            {star.hidden ? 'Показать' : 'Скрыть'}
                          </button>
                          <button
                            className="manage-button danger"
                            onClick={() => setConfirmDelete(star)}
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== Вкладка «Билеты» ===== */}
          {activeTab === 'tokens' && (
            <div className="profile-section">
              <h2 className="section-title">Билеты</h2>

              <div className="tokens-balance">
                <span className="tokens-balance-value">{tokens}</span>
                <span className="tokens-balance-label">
                  {ticketWord(tokens)} на балансе
                </span>
                <p className="tokens-hint">
                  За билеты крутят колесо звёзд — там выпадают звёзды, которые
                  нельзя купить: Солнце и Луна.
                </p>
                <button
                  className="browse-stars-button"
                  onClick={() => navigate('/wheel')}
                >
                  К колесу звёзд
                </button>
              </div>

              <div className="tokens-packs">
                {TOKEN_PACKS.map((pack) => (
                  <div key={pack.id} className="token-pack">
                    <img src={ticketImg} alt="" className="token-pack-img" draggable={false} />
                    <span className="token-pack-amount">
                      {pack.amount} {ticketWord(pack.amount)}
                    </span>
                    <span className="token-pack-price">
                      {pack.price.toLocaleString('ru-RU')} ₽
                    </span>
                    <span className="token-pack-each">
                      {Math.round(pack.price / pack.amount)} ₽ за билет
                    </span>
                    <button
                      className="browse-stars-button token-pack-button"
                      onClick={() => handleBuyTokens(pack)}
                    >
                      {boughtPack === pack.id ? 'Зачислено' : 'Купить'}
                    </button>
                  </div>
                ))}
              </div>
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

      {/* ===== Настройка звезды ===== */}
      {editing && (
        <div className="qr-backdrop" onClick={() => setEditing(null)}>
          <form
            className="qr-modal star-edit"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSaveStar}
          >
            <h3 className="qr-title">Настройка звезды</h3>

            <label className="settings-field">
              <span>Название</span>
              <input
                type="text"
                value={editing.name}
                disabled={!editing.renamable}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </label>
            {!editing.renamable && (
              <p className="edit-note">
                У этой звезды историческое имя — его не меняют. Переименовать
                можно выигранные в рулетке и безымянные звёзды.
              </p>
            )}

            <label className="settings-field">
              <span>Кому дарите</span>
              <input
                type="text"
                value={editing.giftedTo}
                placeholder="Имя получателя"
                onChange={(e) => setEditing({ ...editing, giftedTo: e.target.value })}
              />
            </label>

            <label className="settings-field">
              <span>Пожелание</span>
              <textarea
                rows="3"
                value={editing.giftMessage}
                placeholder="Пусть эта звезда светит только тебе…"
                onChange={(e) => setEditing({ ...editing, giftMessage: e.target.value })}
              />
            </label>

            <div className="qr-actions">
              <button type="submit" className="browse-stars-button">
                Сохранить
              </button>
              <button
                type="button"
                className="copy-link-button"
                onClick={() => setEditing(null)}
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===== Подтверждение удаления ===== */}
      {confirmDelete && (
        <div className="qr-backdrop" onClick={() => setConfirmDelete(null)}>
          <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="qr-title">Удалить «{confirmDelete.name}»?</h3>
            <p className="qr-hint">
              Звезда пропадёт из коллекции, а ссылка на подарок перестанет
              где-либо показываться. Отменить это будет нельзя.
            </p>
            <div className="qr-actions">
              <button
                className="manage-button danger wide"
                onClick={() => handleDelete(confirmDelete)}
              >
                Удалить
              </button>
              <button
                className="copy-link-button"
                onClick={() => setConfirmDelete(null)}
              >
                Оставить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== QR-код подарка ===== */}
      {qr && (
        <div className="qr-backdrop" onClick={() => setQr(null)}>
          <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="qr-title">{qr.star.name}</h3>
            <p className="qr-hint">
              Покажите или отправьте этот код получателю — он откроет
              страницу подарка.
            </p>

            <div className="qr-frame">
              <img src={qr.dataUrl} alt="QR-код подарка" className="qr-img" />
            </div>

            <p className="qr-warning">
              Код — это ключ к подарку. Не публикуйте его: кто отсканирует,
              тот и откроет звезду.
            </p>

            <div className="qr-actions">
              <a
                href={qr.dataUrl}
                download={`подарок-${qr.star.name}.png`}
                className="browse-stars-button"
              >
                Скачать код
              </a>
              <button
                className="copy-link-button"
                onClick={() => handleCopyLink(qr.star.id, qr.star.link)}
              >
                {copiedId === qr.star.id ? '✓ Скопировано' : 'Копировать ссылку'}
              </button>
              <button className="copy-link-button" onClick={() => setQr(null)}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default ProfilePage;
