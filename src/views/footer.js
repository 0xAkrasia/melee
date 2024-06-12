import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTelegram,
  faYoutube,
  faTwitter,
  faGithub,
  faDiscord
} from "@fortawesome/free-brands-svg-icons";
import "../css/footer.css"; // Import the CSS file

export default function Footer() {
  return (
    <>
      <div className="footer-bottom">
        <span className="footer-copyright">
          © 2024 <a href="#">Melee</a>. All Rights Reserved.
        </span>
        <div className="footer-icons">
          <a href="#" className="footer-icon-link" target="_blank" rel="noopener noreferrer">
            <FontAwesomeIcon
              icon={faTelegram}
              className="footer-bottom-icon"
            />
            <span className="sr-only">Telegram group</span>
          </a>
          <a href="#" className="footer-icon-link" target="_blank" rel="noopener noreferrer">
            <FontAwesomeIcon
              icon={faYoutube}
              className="footer-bottom-icon"
            />
            <span className="sr-only">YouTube channel</span>
          </a>
          <a href="#" className="footer-icon-link" target="_blank" rel="noopener noreferrer">
            <FontAwesomeIcon
              icon={faTwitter}
              className="footer-bottom-icon"
            />
            <span className="sr-only">Twitter page</span>
          </a>
          <a href="#" className="footer-icon-link" target="_blank" rel="noopener noreferrer">
            <FontAwesomeIcon
              icon={faGithub}
              className="footer-bottom-icon"
            />
            <span className="sr-only">Github page</span>
          </a>
          <a href="https://discord.gg/5jhSRKbVTR" className="footer-icon-link" target="_blank" rel="noopener noreferrer">
            <FontAwesomeIcon
              icon={faDiscord}
              className="footer-bottom-icon"
            />
            <span className="sr-only">Discord server</span>
          </a>
        </div>
      </div>
    </>
  );
}