import React, { useState, useEffect } from 'react';
import { formatEther, JsonRpcProvider } from 'ethers';
//import contractAddresses from '../Contracts/contractAddresses.json';

const provider = new JsonRpcProvider('https://testnet.inco.org');
const CONTRACT_ADDRESS = '0x04eDd932fDc43Bb14861462Fd9ab9fab4C3a6c2c';
//const contractAddress = contractAddresses[0].twoThirdsGame_vInco;

export const FetchBalance = (props) => {
    const [balance, setBalance] = useState('');

    useEffect(() => {
        const fetchBalance = async (address) => {
            try {
                const rawBalance = await provider.getBalance(address);
                const formattedBal = formatEther(rawBalance);
                setBalance(formattedBal);
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
            <div className="af-class-h2">{balance} INCO</div>
        </div>
    );
};
