import React, { useState, useEffect } from 'react';
import { formatEther, JsonRpcProvider } from 'ethers';
import '../css/fetchBalance.css';

const provider = new JsonRpcProvider('https://1rpc.io/base');

export const FetchBalance = ({ contractAddress, factor, refreshInterval = 5000 }) => {
    const [balance, setBalance] = useState('');
    const [isIncreased, setIsIncreased] = useState(false);

    useEffect(() => {
        const fetchBalance = async (address) => {
            try {
                const rawBalance = await provider.getBalance(address);
                const formattedBal = parseFloat(formatEther(rawBalance));
                const totalPot = (formattedBal * Number(factor)).toFixed(3);
                
                setBalance(prevBalance => {
                    if (parseFloat(totalPot) > parseFloat(prevBalance)) {
                        setIsIncreased(true);
                        setTimeout(() => setIsIncreased(false), 1000);
                    }
                    return totalPot;
                });
            } catch (error) {
                console.error('Error fetching balance:', error);
                setBalance('Error');
            }
        };

        if (contractAddress) {
            fetchBalance(contractAddress);
            const intervalId = setInterval(() => fetchBalance(contractAddress), refreshInterval);
            return () => clearInterval(intervalId);
        }
    }, [contractAddress, factor, refreshInterval]);

    return (
        <div className={`af-class-h2 balance ${isIncreased ? 'increased' : ''}`}>
            {balance} ETH
        </div>
    );
};

export const fetchBalance = async (address) => {
    try {
        const rawBalance = await provider.getBalance(address);
        const formattedBal = parseFloat(formatEther(rawBalance));
        return formattedBal;
    } catch (error) {
        console.error('Error fetching balance:', error);
    }
};