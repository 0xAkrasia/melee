import { usePrivy, useWallets } from '@privy-io/react-auth';

export const LoginButton = ({ authenticated }) => {
    const { login, logout } = usePrivy();
    const { wallets } = useWallets();

    let address = '';
    try {
        if (wallets.length > 0) {
            address = wallets[0].address.slice(0, 4) + '...' + wallets[0].address.slice(-4);
        }
    } catch (e) {
        console.log(e)
    };

    if (authenticated) {
        return (
            <button 
                className="connect-wallet-button connect-wallet-text"
                onClick={logout}
            >
                { address }
            </button>
        );
    } else {
        return (
            <button 
                className="connect-wallet-button connect-wallet-text"
                onClick={login}
            >
                Connect Wallet
            </button>
        );
    }
};