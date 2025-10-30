import { ConnectButton } from '@rainbow-me/rainbowkit';
import '../styles/Header.css';

export function Header() {
  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div className="app-header__text">
          <p className="app-header__subtitle">Fog of Secrets</p>
          <h1 className="app-header__title">Encrypted Map Explorer</h1>
          <p className="app-header__description">
            Track public explorers and hidden agents across the 10×10 battlefield.
          </p>
        </div>
        <ConnectButton />
      </div>
    </header>
  );
}
