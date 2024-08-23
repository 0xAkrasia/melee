import React, { useState, useEffect } from 'react';
import { formatEther, JsonRpcProvider } from 'ethers';
import '../css/fetchBalance.css';

const rpcUrls = [
    'https://ethereum-sepolia.rpc.subquery.network/public',
];

let currentRpcIndex = 0;

const getNextProvider = async () => {
    for (let i = 0; i < rpcUrls.length; i++) {
        const provider = new JsonRpcProvider(rpcUrls[currentRpcIndex]);
        currentRpcIndex = (currentRpcIndex + 1) % rpcUrls.length;
        
        try {
            // Test the connection by getting the network
            await provider.getNetwork();
            return provider;
        } catch (error) {
            console.warn(`Failed to connect to RPC ${rpcUrls[currentRpcIndex]}:`, error.message);
        }
    }
    throw new Error("All RPC endpoints failed to connect");
};

export const FetchBalance = ({ contractAddress, factor, refreshInterval = 50000 }) => {
    const [balance, setBalance] = useState('');
    const [isIncreased, setIsIncreased] = useState(false);

    useEffect(() => {
        const fetchBalance = async (address) => {
            try {
                const provider = await getNextProvider();
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
        const provider = await getNextProvider();
        const rawBalance = await provider.getBalance(address);
        const formattedBal = parseFloat(formatEther(rawBalance));
        return formattedBal;
    } catch (error) {
        console.error('Error fetching balance:', error);
        // Return null or throw an error to indicate the fetch failed
        return null;
    }
};