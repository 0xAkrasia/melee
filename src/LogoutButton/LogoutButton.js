import { usePrivy } from '@privy-io/react-auth';

// logout function is for testing purposes only and should not feature in the game

export const LogoutButton = () => {
    const { logout } = usePrivy();

    return (
        <div className="w-layout-vflex thin-wrapper">
            <div className="w-layout-vflex main-content">
                <button className="primary-button w-inline-block button-text" onClick={logout}>
                    Log out
                </button>
            </div>
        </div>
    );
};