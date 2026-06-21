import { Link } from "react-router-dom";
import "./Footer.css";
import logo from "../assets/limos_logo.png";

const Footer = () => {
  return (
    <footer className="footer">
      {/* ── top ornament rule ── */}
      <div className="footer-rule">
        <span className="footer-rule-line" />
        <span className="footer-rule-seal">✦</span>
        <span className="footer-rule-line" />
      </div>

      <div className="footer-inner">
        {/* ── Brand block ── */}
        <div className="footer-brand">
          <img src={logo} alt="Limo's Bakery" className="footer-logo-img" />
          <p className="footer-tagline">
            Freshly baked cinnamon rolls,
            <br />
            delivered to your door.
          </p>
          <div className="footer-socials">
            <a
              href="https://www.instagram.com/limosbon/"
              target="_blank"
              rel="noreferrer"
              className="footer-social-link"
              aria-label="Instagram"
            >
              <i className="ti ti-brand-instagram" />
            </a>
            <a
              href="https://www.facebook.com/profile.php?id=61576812005610&mibextid=wwXIfr&rdid=ShwshjnuwEon9EeQ&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F19LSedWfk3%2F%3Fmibextid%3DwwXIfr#"
              target="_blank"
              rel="noreferrer"
              className="footer-social-link"
              aria-label="Facebook"
            >
              <i className="ti ti-brand-facebook" />
            </a>
            <a
              href="https://www.tiktok.com/@limosbon?is_from_webapp=1&sender_device=pc"
              target="_blank"
              rel="noreferrer"
              className="footer-social-link"
              aria-label="TikTok"
            >
              <i className="ti ti-brand-tiktok" />
            </a>
          </div>
        </div>

        {/* ── Nav links ── */}
        <div className="footer-links">
          <div className="footer-links-col">
            <div className="footer-links-label">Menu</div>
            <Link to="/menu" className="footer-link">
              All Products
            </Link>
            <Link to="/menu?category=cinnabon" className="footer-link">
              Cinnabons
            </Link>
          </div>
          <div className="footer-links-col">
            <div className="footer-links-label">Contact</div>
            <a
              href="https://mail.google.com/mail/?view=cm&fs=1&to=limosbon@gmail.com"
              className="footer-link"
              onClick={(e) => {
                e.preventDefault();
                window.open(
                  "https://mail.google.com/mail/?view=cm&fs=1&to=limosbon@gmail.com",
                  "_blank",
                  "noopener,noreferrer",
                );
              }}
            >
              limosbon@gmail.com
            </a>
            <a href="tel:+20XXXXXXXXXX" className="footer-link">
              +20 XXX XXX XXXX
            </a>
          </div>{" "}
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="footer-bottom-rule" />
      <div className="footer-bottom">
        <span className="footer-copy">
          © {new Date().getFullYear()} Limo's Bakery · Made with love in Egypt
        </span>

        <div className="footer-dev-card">
          <span className="footer-dev-info">
            <span className="footer-dev-name">Salah Elabd</span>
            <span className="footer-dev-role">Web Developer</span>
          </span>
          <span className="footer-dev-links">
            <a
              href="https://www.linkedin.com/in/salah-elabd-871389339/"
              target="_blank"
              rel="noreferrer"
              className="footer-dev-link"
              aria-label="LinkedIn"
            >
              <i className="ti ti-brand-linkedin" />
            </a>
            <a
              href="https://wa.me/201012540983"
              target="_blank"
              rel="noreferrer"
              className="footer-dev-link"
              aria-label="WhatsApp"
            >
              <i className="ti ti-brand-whatsapp" />
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
