/* eslint-disable */

import React from 'react'
import { createScope, map, transformProxies } from './helpers'

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

  state = {
    shipPositions: {
      blueShip: { x: 0, y: 11, rotation: 0 },
      pinkShip: { x: 11, y: 0, rotation: 90 },
      greenShip: { x: 0, y: 0, rotation: 180 },
      star: { x: 3, y: 2, rotation: 0 },
      asteroid: { x: 5, y: 6, rotation: 0 },
      orangeShip: { x: 11, y: 11, rotation: 270 },
    },
  };

  async loadContractData() {
    /*
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(
      contractAddress,
      contractABI,
      provider
    );

    try {
      // Fetch the positions from the contract
      const blueShipPosition = await contract.getBlueShipPosition();
      const pinkShipPosition = await contract.getPinkShipPosition();
      // ... get other positions

      this.setState({
        shipPositions: {
          blueShip: blueShipPosition,
          pinkShip: pinkShipPosition,
          // ... set other positions
        },
      });
    } catch (error) {
      console.error('Error fetching positions from smart contract', error);
    }
    */
  }

  renderShip(shipName, position) {
    const style = {
      top: `${position.x * 60}px`,
      left: `${position.y * 60}px`,
      transform: `rotate(${position.rotation}deg)`
    };

    const suffix = shipName === 'greenShip' ? 'png' : 'svg';

    return (
      <img
        src={`images/${shipName}.${suffix}`}
        alt={`${shipName}`}
        className={`af-class-objects`}
        style={style}
      />
    );
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
    await this.loadContractData();
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
              <div className="af-class-game-header">Make a move!</div>
              <div className="af-class-game">
                <div className="af-class-player-col">
                  <div className="af-class-player af-class-pink">0xEED</div>
                  <div className="af-class-player af-class-green">0xABD</div>
                </div>
                <div className="af-class-main">
                  <div className="af-class-gamebg"><img src="images/Vectors-Wrapper.svg" loading="lazy" width={720} height={720} alt className="af-class-grid" />
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
                    {/* TODO based on my understanding the position of these images should not be controlled by CSS, and should be controlled by a location coordinate*/}
                    {this.renderShip('blueShip', this.state.shipPositions.blueShip)}
                    {this.renderShip('pinkShip', this.state.shipPositions.pinkShip)}
                    {this.renderShip('greenShip', this.state.shipPositions.greenShip)}
                    {this.renderShip('star', this.state.shipPositions.star)}
                    {this.renderShip('asteroid', this.state.shipPositions.asteroid)}
                    {this.renderShip('orangeShip', this.state.shipPositions.orangeShip)}

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