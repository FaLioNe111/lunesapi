import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Верхняя часть футера */}
        <div className="footer-top">
          <div className="footer-main">
            {/* Логотип */}
            <div className="footer-brand">
              <h3 className="footer-title">Звездочёт</h3>
            </div>
            
            {/* Навигация */}
            <nav className="footer-nav">
              <Link to="/stars" className="footer-link">Каталог</Link>
              <Link to="/info/delivery" className="footer-link">Доставка и оплата</Link>
              <Link to="/info/returns" className="footer-link">Возврат</Link>
              <Link to="/info/contacts" className="footer-link">Контакты</Link>
            </nav>
            
            {/* Контакты */}
            <div className="footer-contacts">
              <a href="tel:88001234567" className="footer-phone">8 (800) 123-45-67</a>
              <a href="mailto:info@logo.ru" className="footer-email">info@logo.ru</a>
            </div>
            
            {/* Соцсети */}
            <div className="footer-social">
              <a href="#vk" className="footer-social-link" aria-label="VK">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.724 22.296c5.522 0 9.138-3.695 9.138-9.315V5.704h-2.383c-.856 0-1.121.632-1.121 1.012 0 1.902-1.012 2.026-1.012 2.026h-2.932c-1.37 0-1.838.684-1.838 1.098 0 .537.297 1.044 1.596 1.173 1.675.168 1.754 1.406 1.754 1.812 0 1.304-.716 1.396-2.342 1.396h-3.425c-4.886 0-6.922-4.142-6.922-5.693 0-.795.297-2.155 1.754-2.155h2.584c.769 0 1.121.408 1.406 1.193.933 2.565 2.494 2.72 2.784 2.72.396 0 .576-.18.576-.594V6.194c0-1.06-.305-1.263-.885-1.263H9.823c-.801 0-1.165.402-1.352.752-.722 1.347-2.038 1.406-2.79 1.406H2.138C.676 7.089 0 7.83 0 9.03v6.878c0 3.438 2.764 6.388 12.724 6.388z"/>
                </svg>
              </a>
              <a href="#tg" className="footer-social-link" aria-label="Telegram">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
        
        {/* Нижняя часть футера */}
        <div className="footer-bottom">
          <div className="footer-bottom-row">
            {/* Юридическая информация */}
            <div className="footer-legal">
              <Link to="/info/privacy" className="footer-legal-link">Политика конфиденциальности</Link>
              <Link to="/info/pd" className="footer-legal-link">Согласие на обработку ПДн</Link>
              <Link to="/info/offer" className="footer-legal-link">Оферта</Link>
            </div>
            
            {/* Платёжные системы */}
            <div className="footer-payment">
              <div className="payment-icon">МИР</div>
              <div className="payment-icon">СБП</div>
              <div className="payment-icon">VISA</div>
              <div className="payment-icon">MC</div>
            </div>
          </div>
          
          {/* Информация о компании */}
          <div className="footer-company-info">
            ООО «Название» · ОГРН 1234567890123 · ИНН 1234567890 · КПП 123456789 · 656000, г. Барнаул, ул. Примерная, д. 1
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;