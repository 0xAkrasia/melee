import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTelegram,
  faTwitter,
  faDiscord
} from "@fortawesome/free-brands-svg-icons";
import "../css/footer.css"; // Import the CSS file

export default function Footer() {
  return (
    <div className="footer-bottom">
      <div className="footer-bottom-content">
        <span className="footer-copyright">
          © 2024 Melee. All Rights Reserved.
        </span>
        <div className="footer-icons">
          <a href="#" className="footer-icon-link" target="_blank" rel="noopener noreferrer">
            <FontAwesomeIcon icon={faTelegram} className="footer-bottom-icon" />
            <span className="sr-only">Telegram group</span>
          </a>
          <a href="https://x.com/MeleeCrypto" className="footer-icon-link" target="_blank" rel="noopener noreferrer">
            <FontAwesomeIcon icon={faTwitter} className="footer-bottom-icon" />
            <span className="sr-only">Twitter page</span>
            {/* TODO update to X logo tracking https://github.com/FortAwesome/Font-Awesome/issues/20249. */}
          </a>
          <a href="https://discord.gg/5jhSRKbVTR" className="footer-icon-link" target="_blank" rel="noopener noreferrer">
            <FontAwesomeIcon icon={faDiscord} className="footer-bottom-icon" />
            <span className="sr-only">Discord server</span>
          </a>
        </div>
      </div>
    </div>
  );
}
