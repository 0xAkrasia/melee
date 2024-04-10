/* eslint-disable */

import React from 'react'
import { createScope, map, transformProxies } from './helpers'
import { BrowserProvider, Contract } from 'ethers';
import starFighterAbi from '../abi/starFighter.json';

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
  }

  gridWidth = 12;
  // TODO: Load the asteroid positions from the contract
  astArray = [27, 28, 32, 45, 62, 90, 102, 123];
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
      blueShip: { x: 0, y: 11, rotation: 0 },
      pinkShip: { x: 11, y: 0, rotation: 90 },
      greenShip: { x: 0, y: 0, rotation: 180 },
      orangeShip: { x: 11, y: 11, rotation: 270 },
      star: { x: 6, y: 5, rotation: 0 }, // # TODO star is hard coded for now
      ...this.asteroidsInState,
    },
    hoverGrid: null,
    mainShip: null,
  };


  async loadContractData() {
    // Initialize Ethereum provider, for example using MetaMask
    const provider = new BrowserProvider(window.ethereum);

    // TODO use privy wallet
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner(); // Get the signer to perform transactions

    // TODO hard coded contract address
    const contractAddress = '0xBfec76C39961b6E39599C68e87ec575be9F4CA83';

    // Create a contract instance
    const gameContract = new Contract(contractAddress, starFighterAbi, provider);

    // Retrieve positions for each ship
    const ships = ['blueShip', 'pinkShip', 'greenShip', 'orangeShip'];
    // Retrieve addresses for each player from the `players` public array
    const playerAddressesPromises = ships.map((_, index) =>
      gameContract.players(index)
    );

    try {
      const addressesArray = await Promise.all(playerAddressesPromises);

      const positionPromises = addressesArray.map((address) => {
        const xPositionPromise = gameContract.positions(address, 0); // Index for x-axis
        const yPositionPromise = gameContract.positions(address, 1); // Index for y-axis
        return Promise.all([xPositionPromise, yPositionPromise]).then(([xPosition, yPosition]) => ({
          x: Number(xPosition), // Replace with conversion code if necessary
          y: Number(yPosition), // Replace with conversion code if necessary
          rotation: 0,
        }));
      });

      const positionsArray = await Promise.all(positionPromises);

      const newShipPositions = ships.reduce((acc, ship, index) => {
        acc[ship] = positionsArray[index];
        return acc;
      }, { ...this.state.shipPositions });

      this.setState({ shipPositions: newShipPositions });
      //const currentAddress = await signer.get_address();
      const currentAddress = '0xfF2A73A2eB87cbb6934b7a408719D0889bcF57B7'; // TODO: replace with the current address from the signer
      // Find mainShip based on currentAddress
      let mainShip = this.state.shipPositions.orangeShip;
      if (addressesArray[0] && currentAddress.toLowerCase() === addressesArray[0].toLowerCase()) mainShip = newShipPositions.blueShip;
      else if (addressesArray[1] && currentAddress.toLowerCase() === addressesArray[1].toLowerCase()) mainShip = newShipPositions.pinkShip;
      else if (addressesArray[2] && currentAddress.toLowerCase() === addressesArray[2].toLowerCase()) mainShip = newShipPositions.greenShip;
      else if (addressesArray[3] && currentAddress.toLowerCase() === addressesArray[3].toLowerCase()) mainShip = newShipPositions.orangeShip;
      this.setState({ mainShip });
    } catch (error) {
      console.error("Error fetching player addresses or positions from the contract: ", error);
    }
  }

  renderObject(name, position) {
    const style = {
      top: `${position.y * 60}px`,
      left: `${position.x * 60}px`,
      transform: `rotate(${position.rotation}deg)`
    };

    const suffix = name.includes('greenShip') ? 'png' : 'svg';
    const imagePath = name.includes('asteroid') ? 'images/asteroid.svg' : `images/${name}.${suffix}`;

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

  calculateDistance(pos1, pos2) {
    // Calculate the distance between two points (pos1 and pos2)
    const distanceX = Math.abs(pos1.x - pos2.x);
    const distanceY = Math.abs(pos1.y - pos2.y);
    return Math.sqrt(Math.pow(distanceX, 2) + Math.pow(distanceY, 2));
  }

  renderShadowEffect(hoverGrid, mainShip) {
    // Generate the shadow effect based on hoverGrid and mainShip positions
    const distance = this.calculateDistance(hoverGrid, mainShip);
    console.log('Distance:', distance);
    if (distance < 3) { // FIXEME distance should be less than 2 grid units instead of 2
      // If the distance is within 2 units, apply shadow effect to hoverGrid
      return (
        <div
          className="af-class-shadow-effect"
          style={{
            top: `${hoverGrid.y * 60}px`,
            left: `${hoverGrid.x * 60}px`,
            position: 'absolute',
            width: '60px',
            height: '60px',
            backgroundColor: 'rgba(255,165,0, 0.3)' // Shadow with some transparency
          }}
        />
      );
    } else {
      // If the distance is more than 2 units, return null as no shadow effect is needed
      return null;
    }
  }

  renderGridOverlay() {
    // Your existing TODO code goes here to determine the shadow effect
    let { hoverGrid, mainShip } = this.state;
    if (!mainShip) {
      mainShip = this.state.shipPositions.orangeShip;
    }
    if (hoverGrid) {
      // Check if hoverGrid is close enough to the orangeShip
      return this.renderShadowEffect(hoverGrid, mainShip);
    }
    return null;
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

    return (
      <span>
        <style dangerouslySetInnerHTML={{
          __html: `
          @import url(/css/normalize.css);
          @import url(/css/webflow.css);
          @import url(/css/shooting-game-96dbb1.webflow.css);
        ` }} />
        <span className="af-view">
          <div className="af-class-body">
            <div className="af-class-shooting-game">
              <button onClick={() => this.loadContractData()}>Load Game Data</button> {/* Add this button */}
              <div className="af-class-game-header">Make a move!</div>
              <div className="af-class-game">
                <div className="af-class-player-col">
                  <div className="af-class-player af-class-pink">0xEED</div>
                  <div className="af-class-player af-class-green">0xABD</div>
                </div>
                <div className="af-class-main">
                  <div className="af-class-gamebg" onMouseMove={this.handleMouseMove}>
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
                    {Object.keys(shipPositions).map((name) => this.renderObject(name, shipPositions[name]))}
                  </div>
                </div>
                <div className="af-class-player-col-2">
                  <div className="af-class-player af-class-blue">mary.eth</div>
                  <div className="af-class-player af-class-orange">0xABD (you)</div>
                </div>
              </div>
            </div>
          </div>
        </span>
      </span>
    )
  }
}

export default IndexView

/* eslint-enable */