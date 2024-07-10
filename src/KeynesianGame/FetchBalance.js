import React, { useState, useEffect } from 'react';
import { formatEther, JsonRpcProvider } from 'ethers';
const provider = new JsonRpcProvider('https://testnet.inco.org');
const CONTRACT_ADDRESS = '0xcf9eB5790e8402933b6ee640b2E1a6c91F8b07AC';

export const FetchBalance = (props) => {
    const [balance, setBalance] = useState('');

    useEffect(() => {
        const fetchBalance = async (address) => {
            try {
                const rawBalance = await provider.getBalance(address);
                const formattedBal = parseFloat(formatEther(rawBalance));
                const totalPot = (formattedBal * 0.97).toFixed(3);
                setBalance(totalPot);
            } catch (error) {
                console.error('Error fetching balance:', error);
                setBalance('Error fetching balance');
            }
        };

        fetchBalance(CONTRACT_ADDRESS);
    }, []);

    const { className, ...rest } = props;

    return (
        <div className={className} {...rest}>
            <div className="af-class-p_body">Total Pot</div>
            <div className="af-class-h2">{balance} ETH</div>
        </div>
    );
};
