import React from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";

export const LoginButton = ({ authenticated }) => {
	const { login, logout } = usePrivy();
	const { wallets } = useWallets();

	let buttonText = "Connect Wallet";
	if (authenticated === true) {
		try {
			if (wallets.length > 0) {
				buttonText = wallets[0].address.slice(0, 4) + "..." + wallets[0].address.slice(-4);
			}
		} catch (e) {
			console.log(e);
			buttonText = "Disconnect";
		}
	} else if (authenticated === false) {
		buttonText = "Connect Wallet";
	} else {
		buttonText = "Loading...";
	}

	return (
		<button
			className="connect-wallet-button connect-wallet-text"
			onClick={authenticated ? logout : login}
		>
			{buttonText}
		</button>
	);
};