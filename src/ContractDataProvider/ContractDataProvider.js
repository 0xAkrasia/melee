import { Contract, AbiCoder } from 'ethers';
import { createInstance } from "fhevmjs"

let instance;

// Refactored loadContractData as a standalone function.
async function loadContractData(walletProvider, currentAddress, shipPositions, contractAddress, contractAbi, setStateCallback, setMainShipCallback, setErrorCallback) {
    if (!walletProvider) {
      console.error('Wallet provider is not available.');
      return;
    }
  

    const signer = await walletProvider.getSigner();
    const gameContract = new Contract(contractAddress, contractAbi, signer);

    // Retrieve positions for each ship
    const ships = ['orangeShip', 'greenShip', 'pinkShip', 'blueShip'];
    // Retrieve addresses for each player from the `players` public array
    const playerAddressesPromises = ships.map((_, index) =>
      gameContract.players(index)
    );
  
    try {
        const addressesArray = await Promise.all(playerAddressesPromises);

        const positionPromises = addressesArray.map((address) => {
          const xPositionPromise = gameContract.positions(address, 0);
          const yPositionPromise = gameContract.positions(address, 1);
          const starCountPromise = gameContract.starCount(address);
          return Promise.all([xPositionPromise, yPositionPromise, starCountPromise]).then(([xPosition, yPosition, starCountPromise]) => ({
            x: Number(xPosition),
            y: Number(yPosition),
            starCount: Number(starCountPromise)
          }));
        });
  
        const positionsArray = await Promise.all(positionPromises);
  
        const newShipPositions = ships.reduce((acc, ship, index) => {
          acc[ship] = positionsArray[index];
          return acc;
        }, { ...shipPositions });
        
        //const currentAddress = this.props.wallets[0].address;
        // Find mainShip based on currentAddress
        // index 0: orangeShip, index 1: greenShip, index 2: pinkShip, index 3: blueShip
        let mainShip;
        let mainShipName;
        let mainShotName;
        if (addressesArray[0] && currentAddress.toLowerCase() === addressesArray[0].toLowerCase()) {
          mainShip = newShipPositions.orangeShip;
          mainShipName = 'orangeShip';
          mainShotName = 'orangeShot';
        }
        else if (addressesArray[1] && currentAddress.toLowerCase() === addressesArray[1].toLowerCase()) {
          mainShip = newShipPositions.greenShip;
          mainShipName = 'greenShip';
          mainShotName = 'greenShot';
        }
        else if (addressesArray[2] && currentAddress.toLowerCase() === addressesArray[2].toLowerCase()) {
          mainShip = newShipPositions.pinkShip;
          mainShipName = 'pinkShip';
          mainShotName = 'pinkShot';
        }
        else if (addressesArray[3] && currentAddress.toLowerCase() === addressesArray[3].toLowerCase()) {
          mainShip = newShipPositions.blueShip;
          mainShipName = 'blueShip';
          mainShotName = 'blueShot';
        } else {
          alert('You are not a player in this game');
        }
  
      // Call setStateCallback to update state of IndexView component
      setStateCallback(newShipPositions);
  
      // Rest of the logic to set main ship based on player's address
      // ...
  
      // Call setMainShipCallback to set the state for the main ship in IndexView     
      setMainShipCallback({ mainShip, mainShipName, mainShotName });
  
    } catch (error) {
      console.error("Error fetching player addresses or positions from the contract: ", error);
      setErrorCallback(error);
    }
  }

  function calculateMoveDistance(mainShip, hoverGrid) {
    return Math.max(Math.abs(mainShip.x - hoverGrid.x), Math.abs(mainShip.y - hoverGrid.y));
  }

  function calculateDirection(mainShip, hoverGrid) {
    let directionX = Math.sign(hoverGrid.x - mainShip.x);
    let directionY = Math.sign(hoverGrid.y - mainShip.y);
    let index;

    // Diagonals and straight lines
    if (directionX === 0 && directionY === -1) index = 0; // Up
    else if (directionX === 1 && directionY === -1) index = 1; // Up-Right
    else if (directionX === 1 && directionY === 0) index = 2; // Right
    else if (directionX === 1 && directionY === 1) index = 3; // Down-Right
    else if (directionX === 0 && directionY === 1) index = 4; // Down
    else if (directionX === -1 && directionY === 1) index = 5; // Down-Left
    else if (directionX === -1 && directionY === 0) index = 6; // Left
    else if (directionX === -1 && directionY === -1) index = 7; // Up-Left
    else throw new Error('Invalid move vector');

    return index; // This will return a number between 0 and 7 indicating the direction as per the orientations array.
  }

   async function createFHEInstance(web3Provider) {
    // Initiate FHE
    const FHE_LIB_ADDRESS = "0x000000000000000000000000000000000000005d";
    const network = await web3Provider.getNetwork();
    const chainId = +network.chainId.toString();
    const ret = await web3Provider.call({
      to: FHE_LIB_ADDRESS,
      data: "0xd9d47bb001",
    });
    const decoded = AbiCoder.defaultAbiCoder().decode(["bytes"], ret);
    const publicKey = decoded[0];
    instance = await createInstance({ chainId, publicKey });
    console.log("FHE instance created", instance);
    return instance;
  }

  async function handleMove (
    walletProvider,
    permanentHoverGrid, permanentAttackGrid, mainShip, originalMainShip,
    contractAddress,
    contractAbi,
  ) {
    if (!permanentHoverGrid || !permanentAttackGrid) {
      console.log('Set your move and attack!');
      return;
    }

    if (walletProvider) {
      console.error('Connect your wallet');
      return;
    }

    // Create an encoded input for the move
    const moveDist = calculateMoveDistance(originalMainShip, permanentHoverGrid);
    const moveDir = calculateDirection(originalMainShip, permanentHoverGrid);
    const shotDir = calculateDirection(mainShip, permanentAttackGrid);

    console.log('Move distance: ', moveDist);
    console.log('Move direction: ', moveDir);
    console.log('Shot direction: ', shotDir);

    // Encode each direction in 3 bits and distance in 4 bits.
    const encodedMove = (moveDist & 0xF) | ((moveDir & 0x7) << 4) | ((shotDir & 0x7) << 7);
    console.log(encodedMove)

    const signer = await walletProvider.getSigner();
    const gameContract = new Contract(contractAddress, contractAbi, signer);

    try {
      instance = await createFHEInstance(walletProvider);
      const encryptedMove = await instance.encrypt16(encodedMove);
      const moveTransaction = await gameContract.move(encryptedMove);
      console.log('Move transaction sent: ', moveTransaction.hash);

      // Wait for the transaction to be mined
      const receipt = await moveTransaction.wait();
      console.log('Transaction confirmed in block: ', receipt.blockNumber);

      // Reload the ship positions after the move
      await this.loadContractData();

    } catch (error) {
      console.error('Error sending move transaction: ', error);
    }
  }

  export { loadContractData, handleMove };