/* eslint-disable */
import React, { useEffect, useState, useRef } from 'react';
import { BrowserProvider } from 'ethers';
import { initFhevm } from 'fhevmjs';
import { LoginButton } from '../utils/ConnectWallet';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import Footer from './footer';
import KeynesianBeautyContest from '../keynesianBeautyContest/keynesianBeautyContest';
import GameHistory from '../gameHistory/gameHistory';
import '../css/normalize.css';
import '../css/webflow.css';
import '../css/starFighter.css';
import '../css/custom.css';

initFhevm();

function ParentComponent() {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();

  const [walletProvider, setWalletProvider] = useState(null);
  const [selection, setSelection] = useState('keynesian-beauty-contest');
  const landingRef = useRef();

  useEffect(() => {
    async function connectWallet() {
      try {
        if (wallets && wallets.length > 0) {
          console.log('Wallets:', wallets); // Debug statement
          const isConnected = await wallets[0]?.isConnected();
          if (isConnected) {
            const currentWallet = await wallets[0]?.getEthereumProvider();
            const provider = new BrowserProvider(currentWallet);
            setWalletProvider(provider);
            console.log('Wallet provider set:', provider); // Debug statement
          } else {
            console.error('Wallet is not connected');
          }
        } else {
          console.error('No wallets found');
        }
      } catch (error) {
        console.error('Error connecting wallet:', error);
      }
    }

    connectWallet();
  }, [wallets]);

  useEffect(() => {
    if (walletProvider && landingRef.current) {
      landingRef.current.loadContractData();
    }
  }, [walletProvider]);

  return (
    <div className="main-container">
      <div className="newsreel-banner">
        <div class="scroll">
        <div>
          NEW GAME EVERY 24HRS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; NEW GAME EVERY 24HRS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; NEW GAME EVERY 24HRS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; NEW GAME EVERY 24HRS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; NEW GAME EVERY 24HRS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; NEW GAME EVERY 24HRS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; NEW GAME EVERY 24HRS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; NEW GAME EVERY 24HRS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; NEW GAME EVERY 24HRS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; NEW GAME EVERY 24HRS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; NEW GAME EVERY 24HRS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; NEW GAME EVERY 24HRS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        </div>
        <div>
          NEW GAME EVERY 24HRS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; NEW GAME EVERY 24HRS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; NEW GAME EVERY 24HRS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; NEW GAME EVERY 24HRS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; NEW GAME EVERY 24HRS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; NEW GAME EVERY 24HRS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; NEW GAME EVERY 24HRS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; NEW GAME EVERY 24HRS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; NEW GAME EVERY 24HRS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; NEW GAME EVERY 24HRS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; NEW GAME EVERY 24HRS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; NEW GAME EVERY 24HRS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        </div>
        </div>
      </div>
      <div className="navbar header">
        <div className="div">
          <img alt="Melee Logo" src="images/meleeName.png" style={{ width: '200px', height: 'auto',  }} />
          <div className="div-2" style={{ display: 'flex', alignItems: 'center' }}>
            <div className="dropdown" >
              <div className="text-wrapper">Games</div>
              <div className="dropdown-content" >
                <div className="dropdown-item"  onClick={() => setSelection('keynesian-beauty-contest')}>Keynesian Beauty Contest</div>
                <div className="dropdown-item"  onClick={() => setSelection('star-fighter')}>Star Fighter</div>
              </div>
            </div>
            <div className="text-wrapper" onClick={() => setSelection('history')}>History</div>
            <div className="text-wrapper" onClick={() => window.open('https://melee.gitbook.io/melee/', '_blank')}>Docs</div>
          </div>
        </div>
        <div className="div-3">
          <a href="https://x.com/MeleeCrypto" target="_blank" rel="noopener noreferrer" >
            <img className="img" alt="X log" src="images/xLogoOrange.svg" />
          </a>
          <a href="https://discord.gg/5jhSRKbVTR" target="_blank" rel="noopener noreferrer" >
            <img className="img" alt="Discord logo" src="images/discordLogoOrange.svg" />
          </a>
          <div className="div-wrapper">
            <LoginButton authenticated={authenticated} />
          </div>
        </div>
      </div>


      {/* Render the selected game or history */}
      <div className="content">
        {selection === 'keynesian-beauty-contest' && (
          <KeynesianBeautyContest walletProvider={walletProvider} wallets={wallets} />
        )}
        {selection === 'star-fighter' && (
          <div className="coming-soon-message">
            Coming Soon ...
          </div>
        )}
        {selection === 'history' && (
          <GameHistory walletProvider={walletProvider} wallets={wallets} />
        )}
      </div>
      <Footer className="footer" /> {/* Add Footer here */}
    </div>
  );
}

export default ParentComponent;

/* eslint-enable */