import { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { BrowserProvider, Contract} from 'ethers';
import starFighterABI from '../Contracts/starFighter_ABI.json';
import contractAddresses from '../Contracts/contractAddresses.json';
import { LoginButton } from '../LoginButton';
import { Move } from '../Move';
import { GameEnded } from '../GameEnded';

const contractAddress = contractAddresses[0].starFighter;
const contractABI = starFighterABI;

export const ConnectWallet = () => {
    const { authenticated } = usePrivy();
    const { wallets } = useWallets();

    const [move, setMove] = useState(null);
    const [gameOver, setGameOver] = useState(false);
    const [alreadyMoved, setAlreadyMoved] = useState(false);

    const gameOverCheck = async () => {

        try {
            if(wallets.length > 0 && await wallets[0]?.isConnected()) {
                const currentWallet = await wallets[0]?.getEthereumProvider();
                const bp = new BrowserProvider(currentWallet);
                const signer = await bp.getSigner();
                const starFighterContract = new Contract(contractAddress, contractABI, signer);
                const gameOver = await starFighterContract.gameOver();

                console.log("Submission check - Wallet provider:", currentWallet, "Contract:", starFighterContract);
                console.log("Game over check:", gameOver.toString());

                setGameOver(gameOver.toString() !== "0");
            }
        } catch (error) {
            console.error("Error checking game status:", error);
        }
    };

    gameOverCheck()

    useEffect(() => {

        const initialSetupAndCheck = async () => {
            if(wallets.length > 0 && await wallets[0]?.isConnected()) {
                const currentWallet = await wallets[0]?.getEthereumProvider();
                console.log("Initial wallet provider:", currentWallet);
            }
        };

        initialSetupAndCheck();

        const moveCheck = async () => {

            try {
                if(wallets.length > 0 && await wallets[0]?.isConnected()) {
                    const currentWallet = await wallets[0]?.getEthereumProvider();
                    const bp = new BrowserProvider(currentWallet);
                    const signer = await bp.getSigner();
                    const starFighterContract = new Contract(contractAddress, contractABI, signer);
                    const hasMoved = await starFighterContract.moved(signer.address);

                    console.log("Move check - Wallet provider:", currentWallet, "Contract:", starFighterContract);
                    console.log("Move check:", hasMoved.toString());

                    setAlreadyMoved(hasMoved.toString() !== "true");
                }
            } catch (error) {
                console.error("Error checking move:", error);
            }
        };

        const intervalId = setInterval(moveCheck, 2000);
        return () => clearInterval(intervalId);
    }, [wallets, alreadyMoved]); // re-run the effect when wallets or alreadyMoved change

    if (!authenticated) {
        return <LoginButton/>;
    } else if (authenticated && !alreadyMoved) {
        return <Move onMoveSubmit={setMove}/>;
    } else if (authenticated && alreadyMoved) {
        return <MoveComplete move={move}/>;
    } else if (authenticated && gameOver) {
        return <GameEnded/>;
    } else {
        return <div> 'Please refresh page' </div>;
    }
};