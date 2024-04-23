/* eslint-disable */

import React from 'react'
import { useEffect, useState, useRef } from 'react'
import { transformProxies } from './helpers'
import { BrowserProvider, Contract, AbiCoder } from 'ethers';
import { initFhevm, createInstance } from "fhevmjs"
import starFighterAbi from '../abi/starFighter.json';
import contractAddresses from '../abi/contractAddresses.json'
import { LoginButton } from '../ConnectWallet';
import { LogoutButton } from '../LogoutButton';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import '../css/normalize.css'
import '../css/webflow.css'
import '../css/starFighter.css'

initFhevm()
let instance;

const contractAddress = contractAddresses[0].starFighterMain;

function ParentComponent() {
  const { authenticated } = usePrivy(); // Example usage of usePrivy
  const { wallets } = useWallets(); // Example usage of useWallets

  const [walletProvider, setWalletProvider] = useState(null);
  const indexViewRef = useRef(); // Create a ref to IndexView to call its methods

  useEffect(() => {
    async function connectWallet() {
      if (wallets && wallets.length > 0) {
        const isConnected = await wallets[0]?.isConnected();
        if (isConnected) {
          const currentWallet = await wallets[0]?.getEthereumProvider();
          const provider = new BrowserProvider(currentWallet);
          setWalletProvider(provider);
        }
      }
    }

    connectWallet();
  }, [wallets]);

  useEffect(() => {
    if (walletProvider && indexViewRef.current) {
      indexViewRef.current.loadContractData();
    }
  }, [walletProvider]);

  return (
    <IndexView ref={indexViewRef} authenticated={authenticated} walletProvider={walletProvider} wallets={wallets} />
  );
}

const scripts = [
  { loading: fetch("https://d3e54v103j8qbb.cloudfront.net/js/jquery-3.5.1.min.dc5e7f18c8.js?site=660f583e0bf21e7507c46de9").then(body => body.text()), isAsync: false },
  { loading: fetch("js/webflow.js").then(body => body.text()), isAsync: false },
]

let Controller

class IndexView extends React.Component {
  static get Controller() {
    if (Controller) return Controller

    try {
      Controller = require('../controllers/IndexController')
      Controller = Controller.default || Controller

      return Controller
    }
    catch (e) {
      if (e.code == 'MODULE_NOT_FOUND') {
        Controller = IndexView

        return Controller
      }

      throw e
    }
  }

  constructor(props) {
    super(props);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.isAsteroidOrStarOnPath = this.isAsteroidOrStarOnPath.bind(this);
    this.sharedHoverGridLogic = this.sharedHoverGridLogic.bind(this);
  }

  gridWidth = 12;
  // TODO: Load the asteroid positions from the contract
  astArray = [15,42,54,74,105,111,112,116];
  asteroidPositions = this.astArray.map((linearPos) => {
    const x = linearPos % this.gridWidth;
    const y = Math.floor(linearPos / this.gridWidth);
    return { x, y, rotation: 0 }; // rotation is set to 0 for simplicity
  });

  asteroidsInState = this.asteroidPositions.reduce((acc, pos, index) => {
    acc[`asteroid${index + 1}`] = pos; // +1 to start naming from 1 instead of 0
    return acc;
  }, {});

  // Initialize the React state with the ship positions and the asteroid positions
  state = {
    shipPositions: {
      blueShip: { x: 0, y: 11, rotation: 45 , starCount: 0 },
      pinkShip: { x: 11, y: 11, rotation: 315 , starCount: 0 },
      greenShip: { x: 11, y: 0, rotation: 225 , starCount: 0 },
      orangeShip: { x: 0, y: 0, rotation: 135 , starCount: 0 },
      star: { x: 6, y: 5, rotation: 0 }, // # TODO star is hard coded for now
      ...this.asteroidsInState,
    },
    hoverGrid: null,
    originalMainShip: null,
    mainShip: null,
    actionType: null,
    permanentHoverGrid: null,
    permanentAttackGrid: null,
    mainShipName: 'pinkShip',
    mainShotName: 'pinkShot',
  };

  async loadContractData() {
    if (!this.props.walletProvider) {
      console.error('Wallet provider is not available.');
      return;
    }

    const provider = this.props.walletProvider;

    const signer = provider.getSigner(); // Get the signer to perform transactions
    // Create a contract instance
    const gameContract = new Contract(contractAddress, starFighterAbi, provider);

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
      }, { ...this.state.shipPositions });
      this.setState({ shipPositions: newShipPositions });
      
      const currentAddress = this.props.wallets[0].address;
      // Find mainShip based on currentAddress
      // index 0: orangeShip, index 1: greenShip, index 2: pinkShip, index 3: blueShip
      let mainShip = this.state.shipPositions.orangeShip;
      let mainShipName = this.state.mainShipName;
      let mainShotName = this.state.mainShotName;
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
      this.setState({ mainShip, mainShipName });
      this.handleSetMove();
    } catch (error) {
      console.error("Error fetching player addresses or positions from the contract: ", error);
    }
  }

  renderObject(name, position) {
    const style = {
      top: `${(position.y) * 60}px`,
      left: `${position.x * 60}px`,
      transform: `rotate(${position.rotation}deg)`
    };

    const imagePath = name.includes('asteroid') ? 'images/asteroid.svg' : `images/${name}.svg`;

    return (
      <img
        key={name}
        src={imagePath}
        alt={name}
        className={`af-class-objects`}
        style={style}
      />
    );
  }

  handleMouseMove = (event) => {
    // Assuming the game grid element has a class of 'af-class-gamebg'.
    const gameGridElement = document.querySelector('.af-class-gamebg');

    if (!gameGridElement) {
      // Exit early if the game grid element is not found.
      return;
    }

    // Get the bounding rectangle for the game grid element.
    const gridRect = gameGridElement.getBoundingClientRect();

    // Calculate the mouse position relative to the game grid.
    const relativeX = event.clientX - gridRect.left;
    const relativeY = event.clientY - gridRect.top;

    // Calculate the grid coordinates.
    // Use Math.floor to get the lower bound (so 0.1 and 0.9 both align to grid space 0).
    // Use Math.max to prevent negative grid locations if the cursor is slightly out of bounds.
    const gridX = Math.max(0, Math.floor(relativeX / 60)); // Assuming grid cell width is 60px.
    const gridY = Math.max(0, Math.floor(relativeY / 60)); // Assuming grid cell height is 60px.

    // Update hover state if mouse is within grid boundaries.
    if (gridX >= 0 && gridX < this.gridWidth && gridY >= 0 && gridY < this.gridWidth) {
      const hoverGrid = { x: gridX, y: gridY };
      this.setState({ hoverGrid });
    } else {
      // Optional: clear hover state if mouse leaves the game grid boundaries.
      this.setState({ hoverGrid: null });
    }
  }

  handleGridClick = () => {
    const { shouldRender, distanceX, distanceY } = this.sharedHoverGridLogic(this.state.hoverGrid, this.state.mainShip, this.asteroidPositions, this.state.shipPositions.star);
    const range = this.state.actionType === 'move' ? 3 : 4;
    const isHorizontalOrVertical = (distanceX <= range && distanceY === 0) || (distanceX === 0 && distanceY <= range);
    const isStraightDiagonal = distanceX === distanceY && distanceX <= range;
    if (!shouldRender) return null;
    if ((isHorizontalOrVertical || isStraightDiagonal)) {
      if (this.state.actionType === 'move') {
        this.setState({
          permanentHoverGrid: { ...this.state.hoverGrid },
          originalMainShip: { ...this.state.mainShip },
          mainShip: { ...this.state.hoverGrid, rotation: this.state.mainShip.rotation },
        }, () => {
          this.setState({ actionType: 'attack' });
        });
      } else if (this.state.actionType === 'attack') {
        this.setState({
          permanentAttackGrid: { ...this.state.hoverGrid }
        }, () => {
          this.setState({
            actionType: 'move',
          });
        });
      }
    }
  }

  handleSetMove = () => {
    this.setState({
      actionType: 'move',

    });
  }

  calculateMoveDistance(mainShip, hoverGrid) {
    return Math.max(Math.abs(mainShip.x - hoverGrid.x), Math.abs(mainShip.y - hoverGrid.y));
  }

  calculateDirection(mainShip, hoverGrid) {
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

  async createInstance(web3Provider) {
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

  handleMove = async () => {
    const { permanentHoverGrid, permanentAttackGrid, mainShip, originalMainShip } = this.state;
    if (!permanentHoverGrid || !permanentAttackGrid) {
      console.log('Set your move and attack!');
      return;
    }

    if (!this.props.walletProvider) {
      console.error('Connect your wallet');
      return;
    }

    // Create an encoded input for the move
    const moveDist = this.calculateMoveDistance(originalMainShip, permanentHoverGrid);
    const moveDir = this.calculateDirection(originalMainShip, permanentHoverGrid);
    const shotDir = this.calculateDirection(mainShip, permanentAttackGrid);

    console.log('Move distance: ', moveDist);
    console.log('Move direction: ', moveDir);
    console.log('Shot direction: ', shotDir);

    // Encode each direction in 3 bits and distance in 4 bits.
    const encodedMove = (moveDist & 0xF) | ((moveDir & 0x7) << 4) | ((shotDir & 0x7) << 7);
    console.log(encodedMove)

    const provider = this.props.walletProvider;
    const signer = await provider.getSigner();
    const gameContract = new Contract(contractAddress, starFighterAbi, signer);

    try {
      instance = await this.createInstance(provider);
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

  getButtonClass = (action) => {
    const { actionType } = this.state;
    return ` ${actionType === action ? 'waiting-button waiting-button-text' : 'move-button move-button-text'}`;
  }

  isAsteroidOrStarOnPath(pos) {
    const mainShip = this.state.mainShip;
    const hoverGrid = this.state.hoverGrid;

    // Only check if hoverGrid is defined
    if (!hoverGrid || !mainShip) {
      return false;
    }

    // Check if pos is on the same row or column as the mainShip and hoverGrid.
    const isSameRow = (pos.y === mainShip.y) && (pos.y === hoverGrid.y);
    const isSameColumn = (pos.x === mainShip.x) && (pos.x === hoverGrid.x);

    if (isSameRow) {
      // Check if pos.x is between mainShip.x and hoverGrid.x
      return (pos.x - mainShip.x) * (pos.x - hoverGrid.x) <= 0;
    } else if (isSameColumn) {
      // Check if pos.y is between mainShip.y and hoverGrid.y
      return (pos.y - mainShip.y) * (pos.y - hoverGrid.y) <= 0;
    }

    // Check if pos is on a diagonal path
    const deltaX = mainShip.x - hoverGrid.x;
    const deltaY = mainShip.y - hoverGrid.y;

    // To be on the same diagonal, the differences in x and y from the mainShip to hoverGrid 
    // should be equal to those to pos (in terms of absolute value)
    if (deltaX !== 0 && deltaY !== 0 && Math.abs(deltaX) === Math.abs(deltaY)) {
      // Calculate gradient and check if position follows the line based on the formula y - y1 = m(x - x1)
      const gradient = deltaY / deltaX;
      return (pos.y - mainShip.y) === gradient * (pos.x - mainShip.x) &&
        (pos.x - mainShip.x) * (pos.x - hoverGrid.x) <= 0 &&
        (pos.y - mainShip.y) * (pos.y - hoverGrid.y) <= 0;
    }

    return false;
  }

  sharedHoverGridLogic(hoverGrid, mainShip, asteroidPositions, starPosition) {
    const isOnAsteroidOrStar = asteroidPositions.some(
      pos => pos.x === hoverGrid.x && pos.y === hoverGrid.y
    ); //|| (starPosition.x === hoverGrid.x && starPosition.y === hoverGrid.y);

    if (isOnAsteroidOrStar) {
      return { shouldRender: false };
    }

    const distanceX = Math.abs(hoverGrid.x - mainShip.x);
    const distanceY = Math.abs(hoverGrid.y - mainShip.y);

    const isPathBlocked = asteroidPositions.some(this.isAsteroidOrStarOnPath); // || this.isAsteroidOrStarOnPath(starPosition);

    return { shouldRender: !isPathBlocked, distanceX, distanceY };
  }

  renderAttackShadowEffect(hoverGrid, mainShip, asteroidPositions, starPosition, isPermanent = false, shotName = null) {
    const { shouldRender, distanceX, distanceY } = this.sharedHoverGridLogic(hoverGrid, mainShip, asteroidPositions, starPosition);
    if (!shouldRender && !isPermanent) return null;
    const isHorizontalOrVertical = (distanceX <= 4 && distanceY === 0) || (distanceX === 0 && distanceY <= 4);
    const isStraightDiagonal = distanceX === distanceY && distanceX <= 4;

    if ((isHorizontalOrVertical || isStraightDiagonal) || isPermanent) {
      // Calculate the steps needed to draw the path
      const steps = Math.max(Math.abs(hoverGrid.x - mainShip.x), Math.abs(hoverGrid.y - mainShip.y));
      const deltaX = (hoverGrid.x - mainShip.x) / steps;
      const deltaY = (hoverGrid.y - mainShip.y) / steps;
      let pathElements = [];

      // Generate divs for each step in the path
      for (let i = 1; i <= steps; i++) {
        const stepX = mainShip.x + deltaX * i;
        const stepY = mainShip.y + deltaY * i;
        const key = `path-${stepX}-${stepY}`;

        // JSX for the faded ship image
        const shotImage = shotName ? (
          <img
            src={`images/${shotName}.png`}
            alt={shotName}
            className="af-class-objects af-class-faded-ship"
            style={{
              top: `${hoverGrid.y * 60}px`, // Positioning based on the hover grid
              left: `${hoverGrid.x * 60}px`,
              position: 'absolute',
              opacity: 0.5, // Adjust as needed for desired fading
              zIndex: 2, // Ensure the ship image is on top of the shadow effects
            }}
          />
        ) : null;

        pathElements.push(
          <>
            <div
              key={key}
              className="af-class-shadow-effect"
              style={{
                top: `${stepY * 60}px`,
                left: `${stepX * 60}px`,
                position: 'absolute',
                width: '60px',
                height: '60px',
                backgroundColor: 'rgba(255,0,0, 0.3)', // Distinct color for attack path
                zIndex: 1 // To ensure it is rendered below the ships and asteroids
              }}
            />
            {shotImage}
          </>
        );
      }
      return pathElements;
    }
  }

  renderMoveShadowEffect(hoverGrid, mainShip, asteroidPositions, starPosition, isPermanent = false, shipName = null) {
    const { shouldRender, distanceX, distanceY } = this.sharedHoverGridLogic(hoverGrid, mainShip, asteroidPositions, starPosition);
    if (!shouldRender && !isPermanent) return null;
    // Check if hoverGrid is on a horizontal, vertical, or straight diagonal path within 2 units
    const isHorizontalOrVertical = (distanceX <= 3 && distanceY === 0) || (distanceX === 0 && distanceY <= 3);
    const isStraightDiagonal = distanceX === distanceY && distanceX <= 3;

    if ((isHorizontalOrVertical || isStraightDiagonal) || isPermanent) {
      // Add an additional className for fading the image
      const shipStyle = {
        opacity: 0.5, // Adjust as needed for desired fading
        position: 'absolute',
        zIndex: 2, // Ensure the ship image is on top of the shadow effect
      };

      // JSX for the faded ship image
      const fadedShipImage = shipName ? (
        <img
          src={`images/${shipName}.svg`}
          alt={shipName}
          className="af-class-objects af-class-faded-ship"
          style={{
            ...shipStyle,
            top: `${hoverGrid.y * 60}px`, // Positioning based on the hover grid
            left: `${hoverGrid.x * 60}px`,
          }}
        />
      ) : null;

      return (
        <>
          <div
            className="af-class-shadow-effect"
            style={{
              top: `${hoverGrid.y * 60}px`,
              left: `${hoverGrid.x * 60}px`,
              position: 'absolute',
              width: '60px',
              height: '60px',
              backgroundColor: 'rgba(255,165,0, 0.3)'  // Shadow with some transparency
            }}
          />
          {fadedShipImage}
        </>
      );
    } else {
      return null;
    }
  }

  renderGridOverlay() {
    let { hoverGrid, mainShip, shipPositions } = this.state;
    const gridToShow = hoverGrid;

    if (!mainShip) {
      mainShip = shipPositions.orangeShip;
    }

    // Assuming star position is stored in state
    const starPosition = this.state.shipPositions.star;

    // Assuming asteroid positions are stored in state in a similar format as shipPositions
    const asteroidPositions = this.asteroidPositions;

    if (gridToShow) {
      if (this.state.actionType === 'move') {
        return this.renderMoveShadowEffect(gridToShow, mainShip, asteroidPositions, starPosition, false, this.state.mainShipName);
      } else if (this.state.actionType === 'attack') {
        return this.renderAttackShadowEffect(gridToShow, mainShip, asteroidPositions, starPosition, false, this.state.mainShotName);
      }
    } else {
      return null;
    }
  }

  renderPermanentHoverGrid() {
    let { mainShip, shipPositions, permanentHoverGrid } = this.state;
    const gridToShow = permanentHoverGrid;

    if (!mainShip) {
      mainShip = shipPositions.orangeShip;
    }

    // Assuming star position is stored in state
    const starPosition = this.state.shipPositions.star;

    // Assuming asteroid positions are stored in state in a similar format as shipPositions
    const asteroidPositions = this.asteroidPositions;

    if (gridToShow) {
      return this.renderMoveShadowEffect(gridToShow, mainShip, asteroidPositions, starPosition, true, this.state.mainShipName);
    } else {
      return null;
    }
  }

  renderPermanentAttackGrid() {
    let { mainShip, shipPositions, permanentAttackGrid } = this.state;
    const gridToShow = permanentAttackGrid;

    if (!mainShip) {
      mainShip = shipPositions.orangeShip;
    }

    // Assuming star position is stored in state
    const starPosition = this.state.shipPositions.star;

    // Assuming asteroid positions are stored in state in a similar format as shipPositions
    const asteroidPositions = this.asteroidPositions;

    if (gridToShow) {
      return this.renderAttackShadowEffect(gridToShow, mainShip, asteroidPositions, starPosition, true, this.state.mainShotName);
    } else {
      return null;
    }
  }

  getMoveButtonClass() {
    const { permanentHoverGrid, permanentAttackGrid } = this.state;
    return (!permanentHoverGrid || !permanentAttackGrid) ? 'waiting-button waiting-button-text' : 'move-button move-button-text';
  }

  async componentDidMount() {
    const htmlEl = document.querySelector('html')
    htmlEl.dataset['wfPage'] = '660f583e0bf21e7507c46dfe'
    htmlEl.dataset['wfSite'] = '660f583e0bf21e7507c46de9'

    scripts.concat(null).reduce((active, next) => Promise.resolve(active).then((active) => {
      const loading = active.loading.then((script) => {
        new Function(`
          with (this) {
            eval(arguments[0])
          }
        `).call(window, script)

        return next
      })

      return active.isAsync ? next : loading
    }))
    //await this.loadContractData();
  }

  render() {
    const proxies = IndexView.Controller !== IndexView ? transformProxies(this.props.children) : {

    }

    const { shipPositions } = this.state;
    const { authenticated } = this.props;

    return (
      <span>
        <div>
        <img src="images/meleeName.png" style={{ width: '200px', height: 'auto' }} />
        </div>
        <div className="login-button-container">
          {authenticated ? <LogoutButton /> : <LoginButton />}
        </div>
        <span className="af-view">
          <div className="af-class-body">
            <div className="af-class-shooting-game">
              <div className="af-class-game-header">Star Fighter</div>
              <div className="af-class-game">
                <div className="af-class-player-col">
                  <div className="frame">
                    <div className="frame-div">
                      <div className="frame-text-wrapper">
                        {`${this.state.shipPositions.orangeShip.starCount}x`}
                      </div>
                      <img className="frame-group" alt="star" src="images/star.svg" />
                    </div>
                    <div className="frame-element-orange">
                      Player 1
                    </div>
                  </div>
                  <div className="frame">
                    <div className="frame-div">
                      <div className="frame-text-wrapper">{`${this.state.shipPositions.blueShip.starCount}x`}</div>
                      <img className="frame-group" alt="star" src="images/star.svg" />
                    </div>
                    <div className="frame-element-blue">
                      Player 4
                    </div>
                  </div>
                </div>
                <div className="af-class-main">
                  <div className="af-class-gamebg" onMouseMove={this.handleMouseMove} onClick={this.handleGridClick}>
                    <img src="images/Vectors-Wrapper.svg" loading="lazy" width={720} height={720} alt className="af-class-grid" />
                    {/*Looks like there will be a video being played in this division, but seems this piece of code does not take any effect, need double check*/}
                    <div data-poster-url="https://uploads-ssl.webflow.com/660f583e0bf21e7507c46de9/660f5a18864a6da9fc9c7b9a_Untitled design (6)-poster-00001.jpg"
                      data-video-urls="https://uploads-ssl.webflow.com/660f583e0bf21e7507c46de9/660f5a18864a6da9fc9c7b9a_Untitled design (6)-transcode.mp4,https://uploads-ssl.webflow.com/660f583e0bf21e7507c46de9/660f5a18864a6da9fc9c7b9a_Untitled design (6)-transcode.webm"
                      data-autoplay="true"
                      data-loop="true"
                      data-wf-ignore="true"
                      className="af-class-background-video w-background-video w-background-video-atom">
                      <video id="7030711c-69a7-544c-8ec1-2cdfd7a165b4-video" autoPlay loop style={{ backgroundImage: 'url("https://uploads-ssl.webflow.com/660f583e0bf21e7507c46de9/660f5a18864a6da9fc9c7b9a_Untitled design (6)-poster-00001.jpg")' }} muted playsInline data-wf-ignore="true" data-object-fit="cover">
                        <source src="https://uploads-ssl.webflow.com/660f583e0bf21e7507c46de9/660f5a18864a6da9fc9c7b9a_Untitled design (6)-transcode.mp4" data-wf-ignore="true" />
                        <source src="https://uploads-ssl.webflow.com/660f583e0bf21e7507c46de9/660f5a18864a6da9fc9c7b9a_Untitled design (6)-transcode.webm" data-wf-ignore="true" />
                      </video>
                    </div>
                    {this.renderGridOverlay()}
                    {this.renderPermanentHoverGrid()}
                    {this.renderPermanentAttackGrid()}
                    {Object.keys(shipPositions).map((name) => this.renderObject(name, shipPositions[name]))}
                  </div>
                  <div className="af-class-button-row">
                    <button className={this.getMoveButtonClass()} onClick={this.handleMove}>Move</button>
                  </div>
                </div>
                <div className="af-class-player-col-2">
                  <div className="frame">
                    <div className="frame-div">
                      <img className="frame-group" alt="star" src="images/star.svg" />
                      <div className="frame-text-wrapper">{`x${this.state.shipPositions.greenShip.starCount}`}</div>
                    </div>
                    <div className="frame-element-green">
                      Player 2
                    </div>
                  </div>
                  <div className="frame">
                    <div className="frame-div">
                      <img className="frame-group" alt="star" src="images/star.svg" />
                      <div className="frame-text-wrapper">{`x${this.state.shipPositions.pinkShip.starCount}`}</div>
                    </div>
                    <div className="frame-element-pink">
                      Player 3
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </span>
      </span>
    )
  }
}

export default ParentComponent;

/* eslint-enable */
