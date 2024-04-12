import { usePrivy } from '@privy-io/react-auth';

// logout function is for testing purposes only and should not feature in the game

export const LogoutButton = () => {
    const { logout } = usePrivy();

    return (

        <button className="primary-button w-inline-block connect-wallet-button connect-wallet-text" onClick={logout}>
            Log out
        </button>
    );
};