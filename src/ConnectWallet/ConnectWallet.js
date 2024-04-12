import { usePrivy } from '@privy-io/react-auth';

export const LoginButton = () => {
    const { login } = usePrivy();
    const handleLogin = async () => {
        login();
    };

    return (
        <button className="primary-button w-inline-block connect-wallet-button connect-wallet-text">
            <div onClick={handleLogin}>
                Connect Wallet
            </div>
        </button>
    );
};