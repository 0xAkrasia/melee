/* eslint-disable */

import React from 'react'
import { useEffect, useState, useRef } from 'react'
import { transformProxies } from './helpers'
import { BrowserProvider } from 'ethers';
import { initFhevm } from "fhevmjs"
import starFighterAbi from '../abi/starFighter.json';
import contractAddresses from '../abi/contractAddresses.json'
import { LoginButton } from '../ConnectWallet';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { loadContractData, handleMove } from '../ContractDataProvider';
import { handleMouseMove, renderGridOverlay, renderPermanentHoverGrid, renderPermanentAttackGrid, renderObject, handleGridClick } from '../GridViews';
import '../css/normalize.css'
import '../css/webflow.css'
import '../css/starFighter.css'

initFhevm()

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
      blueShip: { x: 0, y: 11, rotation: 45 , starCount: 0, lives: 1},
      pinkShip: { x: 11, y: 11, rotation: 315 , starCount: 0, lives: 1},
      greenShip: { x: 11, y: 0, rotation: 225 , starCount: 0, lives: 1},
      orangeShip: { x: 0, y: 0, rotation: 135 , starCount: 0, lives: 1},
      star: { x: 6, y: 5, rotation: 0 }, // # TODO star is hard coded for now
      ...this.asteroidsInState,
    },
    hoverGrid: null,
    originalMainShip: null,
    mainShip: null,
    actionType: null,
    permanentHoverGrid: null,
    permanentAttackGrid: null,
    mainShipName: 'orangeShip',
    mainShotName: 'orangeShot',
  };

  async loadContractData() {
    loadContractData(
      this.props.walletProvider,
      this.props.wallets[0].address,
      this.state.shipPositions,
      contractAddress,
      starFighterAbi,
      (newShipPositions) => this.setState({ shipPositions: newShipPositions }),
      ({mainShip, mainShipName, mainShotName}) => this.setState({ mainShip, mainShipName, mainShotName }),
      (error) => console.error(error) // You could handle this more gracefully
    );
    this.setState({
      actionType: 'move',

    });
  }

  handleMove = async () => {
    handleMove({
      walletProvider: this.props.walletProvider,
      permanentHoverGrid: this.state.permanentHoverGrid, 
      permanentAttackGrid: this.state.permanentAttackGrid, 
      mainShip: this.state.mainShip, 
      originalMainShip: this.state.originalMainShip,
      contractAddress: contractAddress,
      contractAbi: starFighterAbi,
    });
  }

  handleGridClickProxy = () => {
    const {actionType} = this.state;
    if (actionType === 'reset') {
      this.loadContractData();
      this.setState({ 
        actionType: 'move',
        permanentHoverGrid: null,
        permanentAttackGrid: null,
      });
    } else {
      handleGridClick(
        this.state.hoverGrid,
        this.state.mainShip,
        this.asteroidPositions,
        this.state.shipPositions.star,
        this.state.actionType,
        (permanentHoverGrid) => this.setState(permanentHoverGrid),
        (permanentHoverGrid) => this.setState(permanentHoverGrid)
      );
    }
  }

  getButtonClass = (action) => {
    const { actionType } = this.state;
    return ` ${actionType === action ? 'waiting-button waiting-button-text' : 'move-button move-button-text'}`;
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
        <div className="navbar">
            <div className="div">
                <img alt="Melee Logo" src="images/meleeName.png" style={{ width: '200px', height: 'auto' }} />
                <div className="div-2">
                    <div className="text-wrapper">Games</div>
                    {/* className="text-wrapper-2" */}
                    <div className="text-wrapper">Leaderboard</div>
                    <div className="text-wrapper">History</div>
                </div>
            </div>
            <div className="div-3">
                <img className="img" alt="X log" src="images/xLogoOrange.svg" />
                <img className="img" alt="Discord logo" src="images/discordLogoOrange.svg" />
                <div className="div-wrapper">
                    <LoginButton authenticated = { authenticated }/>
                </div>
            </div>
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
                      { this.state.mainShipName === 'orangeShip' ? <div> <br /> (you)</div> : null }
                    </div>
                  </div>
                  <div className="frame">
                    <div className="frame-div">
                      <div className="frame-text-wrapper">{`${this.state.shipPositions.blueShip.starCount}x`}</div>
                      <img className="frame-group" alt="star" src="images/star.svg" />
                    </div>
                    <div className="frame-element-blue">
                      Player 4
                      { this.state.mainShipName === 'blueShip' ? <div> <br /> (you)</div> : null }
                    </div>
                  </div>
                </div>
                <div className="af-class-main">
                  <div className="af-class-gamebg" onMouseMove={(event) => handleMouseMove(event, (hoverGrid) => this.setState({ hoverGrid }), this.gridWidth)} onClick={this.handleGridClickProxy}>
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
                    {renderGridOverlay(
                      this.state.hoverGrid, 
                      this.state.mainShip, 
                      this.state.shipPositions,
                      this.asteroidPositions,
                      this.state.mainShipName, 
                      this.state.mainShotName, 
                      this.state.actionType,
                      (mainShipRotation) => this.setState(mainShipRotation),
                    )}
                    {renderPermanentHoverGrid(
                      this.state.mainShip, 
                      this.state.shipPositions, 
                      this.asteroidPositions,
                      this.state.permanentHoverGrid, 
                      this.state.mainShipName,
                      (mainShipRotation) => this.setState(mainShipRotation),
                    )}
                    {renderPermanentAttackGrid(
                      this.state.mainShip, 
                      this.state.shipPositions, 
                      this.asteroidPositions,
                      this.state.permanentAttackGrid, 
                      this.state.mainShotName,
                      (mainShipRotation) => this.setState(mainShipRotation),
                    )}
                    {Object.keys(shipPositions).map((name) => renderObject(name, shipPositions[name]))}
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
                      { this.state.mainShipName === 'greenShip' ? <div> <br /> (you)</div> : null }
                    </div>
                  </div>
                  <div className="frame">
                    <div className="frame-div">
                      <img className="frame-group" alt="star" src="images/star.svg" />
                      <div className="frame-text-wrapper">{`x${this.state.shipPositions.pinkShip.starCount}`}</div>
                    </div>
                    <div className="frame-element-pink">
                      Player 3
                      { this.state.mainShipName === 'pinkShip' ? <div> <br /> (you)</div> : null }
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
