import React from 'react'
import ReactDOM from 'react-dom/client'
import {PrivyProvider} from '@privy-io/react-auth';
import { defineChain } from 'viem'
import App from './App';
import { Buffer } from 'buffer';
window.Buffer = Buffer;

export const inco = defineChain({
  id: 9090,
  name: 'Inco Gentry Testnet',
  network: 'Inco Gentry Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'INCO',
    symbol: 'INCO',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet.inco.org']
    },
    public: {
      http: ['https://testnet.inco.org']
    },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.testnet.inco.org/'},
  },
});

export const baseMainnet = defineChain({
  id: 8453,
  name: 'Base Mainnet',
  network: 'Base Mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'ETH',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://mainnet.base.org']
    },
    public: {
      http: ['https://mainnet.base.org']
    },
  },
  blockExplorers: {
    default: { name: 'BaseScan', url: 'https://basescan.org'},
  },
});

export const sepolia = defineChain({
  id: 11155111,
  name: 'Sepolia Mainnet',
  network: 'Sepolia Mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'ETH',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://1rpc.io/sepolia']
    },
    public: {
      http: ['https://1rpc.io/sepolia']
    },
  },
  blockExplorers: {
    default: { name: 'SepoliaScan', url: 'https://sepolia.etherscan.io/'},
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <PrivyProvider
    appId={"clsay39yw04tv13s57t7fig9f"}
    config={{
      loginMethods: ['email', 'google', 'discord', 'wallet'],
      defaultChain: sepolia,
      supportedChains: [inco, baseMainnet, sepolia],
      appearance: {
        theme: 'dark',
        accentColor: '#3673f5',
        logo: 'https://raw.githubusercontent.com/0xAkrasia/Melee/main/public/images/meleeIcon.png',
        showWalletLoginFirst: false,
        walletList: ['coinbase_wallet', 'wallet_connect', 'metamask'],
      },
    }}
  >
    <App />
  </PrivyProvider>
);