import { Contract } from 'ethers';

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
          mainShip = newShipPositions.pinkShip;
          mainShipName = 'pinkShip';
          mainShotName = 'pinkShot';
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

  export { loadContractData };