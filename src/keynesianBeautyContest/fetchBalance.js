import React, { useState, useEffect } from 'react';
import { formatEther, JsonRpcProvider } from 'ethers';

const provider = new JsonRpcProvider('https://testnet.inco.org');

export const FetchBalance = ({ contractAddress, factor }) => {
    const [balance, setBalance] = useState('');

    useEffect(() => {
        const fetchBalance = async (address) => {
            try {
                const rawBalance = await provider.getBalance(address);
                const formattedBal = parseFloat(formatEther(rawBalance));
                const totalPot = (formattedBal * Number(factor)).toFixed(3);
                setBalance(totalPot);
            } catch (error) {
                console.error('Error fetching balance:', error);
                setBalance('Error fetching balance');
            }
        };

        if (contractAddress) {
            fetchBalance(contractAddress);
        }
    }, [contractAddress]); // Add contractAddress as a dependency

    return (
        <div className="af-class-h2">{balance} ETH</div>
    );
};
