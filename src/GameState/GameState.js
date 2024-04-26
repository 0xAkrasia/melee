import { BrowserProvider, Contract, AbiCoder } from 'ethers';
import starFighterAbi from '../abi/starFighter.json';
import contractAddresses from '../abi/contractAddresses.json'

const contractAddress = contractAddresses[0].starFighterMain;
const rotationDegreeArray = [0, 45, 90, 135, 180, 225, 270, 315];

export const InitializeGameState = () => {
    const gameContract = new Contract(contractAddress, starFighterAbi, provider);

    const playersArray = gameContract.players;
    const asteroids = gameContract.asteroidsArray;
    const BoardDim = gameContract.BoardDim;
    const shipRange = gameContract.shipRange;
    const shotRange = gameContract.shotRange;
    const starLocation = gameContract.starLocation;
    const starsToWin = gameContract.starsToWin;

    const shipColors = ['orange', 'green', 'pink', 'blue'];

    for (var i=0; i < playersArray; i++) {
        state.ship = {
            index: i,
            address: gameContract.players(i),
            x_coord: gameContract.positions(address, 0),
            y_coord: gameContract.positions(address, 1),
            main: (privy.walletAddress == address ? true : false),
            isAlive: gameContract.isAlive(address),                                                             
            starCount: gameContract.starCount(address),
            moved: gameContract.moved(address),
            moveDir: gameContract.moveDir(address),                                          
            moveDist: gameContract.moveDist(address),
            shotDir: gameContract.shots(address),
            lives: gameContract.lives(address),
            shipColor: shipColors[i],                                                                                                                    
            shipSVG: `${shipColor}Ship.svg`,
            shipEmoji: `${shipColor}Shot.png`,
        }
    }
}

export const UpdateGameState = () => {

}