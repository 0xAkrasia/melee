/* eslint-disable */

import React, { useState, useEffect, useCallback } from 'react';
import { initFhevm, createInstance } from 'fhevmjs';
import { BrowserProvider, Contract, AbiCoder } from 'ethers';
import contractAbi from '../abi/KeynsianBeautyContest.json';
import '../css/KeynesianGame.css';

initFhevm();

const FHE_LIB_ADDRESS = "0x000000000000000000000000000000000000005d";
const CONTRACT_ADDRESS = '0x04eDd932fDc43Bb14861462Fd9ab9fab4C3a6c2c';

const KeynesianGame = ({ walletProvider, wallets }) => {
  const [selectedImages, setSelectedImages] = useState(new Set());
  const [countdownTime, setCountdownTime] = useState(12 * 3600 + 23 * 60 + 41);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [userHasVoted, setUserHasVoted] = useState(false);
  const [instance, setInstance] = useState(null); // Global state for instance

  const handleImageClick = useCallback((imageId) => {
    setSelectedImages(prevSelectedImages => {
      const newSelectedImages = new Set(prevSelectedImages);
      if (newSelectedImages.has(imageId)) {
        newSelectedImages.delete(imageId);
      } else if (newSelectedImages.size < 4) {
        newSelectedImages.add(imageId);
      }
      return newSelectedImages;
    });
  }, []);

  const convertToUint8 = useCallback((selectedImageIdsArray) => {
    let result = 0;
    selectedImageIdsArray.forEach((id) => {
      const imageIds = ['img', 'img_1', 'img_2', 'img_3', 'img_4', 'img_5', 'img_6', 'img_7'];
      id = imageIds.indexOf(id) + 1;
      if (id >= 1 && id <= 8) {
        result |= 1 << (id - 1);
      } else {
        throw new Error('Image ID is out of range. It should be between 1 and 8, inclusive.');
      }
    });
    return result;
  }, []);

  const checkVotingStatus = useCallback(async (signer) => {
    const contract = new Contract(CONTRACT_ADDRESS, contractAbi, signer);
    const userAddress = await signer.getAddress();
    const hasVoted = await contract.hasVoted(userAddress);
    console.log('User has voted:', hasVoted);
    return hasVoted;
  }, []);

  const handleConnectWallet = useCallback(async () => {
    try {
      console.log('Connecting wallet...');
      const signer = await walletProvider.getSigner();
      if (signer) {
        console.log("checkVotingStatus");
        const userHasVoted = await checkVotingStatus(signer);
        setIsWalletConnected(true);
        setUserHasVoted(userHasVoted);
      } else {
        setIsWalletConnected(false);
        setUserHasVoted(false);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setIsWalletConnected(false);
      setUserHasVoted(false);
    }
  }, [checkVotingStatus]);

  const createFHEInstance = useCallback(async (web3Provider) => {
    if (instance) {
      return instance;
    }

    const network = await web3Provider.getNetwork();
    const chainId = +network.chainId.toString();
    const ret = await web3Provider.call({
      to: FHE_LIB_ADDRESS,
      data: "0xd9d47bb001",
    });
    const decoded = AbiCoder.defaultAbiCoder().decode(["bytes"], ret);
    const publicKey = decoded[0];
    const newInstance = await createInstance({ chainId, publicKey });
    console.log("FHE instance created", newInstance);
    setInstance(newInstance);
    return newInstance;
  }, [instance]);


  const handleBet = useCallback(async (event) => {
    event.preventDefault();
    try {
      const instance = await createFHEInstance(walletProvider);
      const signer = await walletProvider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, contractAbi, signer);
      const selectedImageIdsArray = Array.from(selectedImages);
      const voteUint8 = convertToUint8(selectedImageIdsArray);
      const encryptedVote = instance.encrypt8(voteUint8);
      const tx = await contract.castVote(encryptedVote);
      await tx.wait();
      alert('Vote cast successfully');
    } catch (error) {
      console.error('Error casting vote:', error);
      alert('Failed to cast vote');
    }
  }, [selectedImages, convertToUint8, createFHEInstance]);

  const uint8ToSelectedImageIds = useCallback((voteUint8) => {
    console.log('voteUint8:', voteUint8);
    const voteBigInt = BigInt(voteUint8);
    const imageIds = ['img', 'img_1', 'img_2', 'img_3', 'img_4', 'img_5', 'img_6', 'img_7'];
    return imageIds.filter((id, i) => (voteBigInt & (BigInt(1) << BigInt(i))) !== BigInt(0));
  }, []);

  const handleViewOwnVote = useCallback(async (event) => {
    event.preventDefault();
    const signer = await walletProvider.getSigner();
    const userAddress = await signer.getAddress();
    let reencrypt = null;
    let cInstance = null;

    try {
      cInstance = await createFHEInstance(walletProvider);
      if (!cInstance.hasKeypair(CONTRACT_ADDRESS)) {
        const eip712Domain = {
          name: 'Authorization token',
          version: '1',
          chainId: 9090,
          verifyingContract: CONTRACT_ADDRESS,
        };

        const reencryption = cInstance.generatePublicKey(eip712Domain);
        const params = [userAddress, JSON.stringify(reencryption.eip712)];
        const sig = await window.ethereum.request({
          method: "eth_signTypedData_v4",
          params,
        });

        cInstance.setSignature(CONTRACT_ADDRESS, sig);
        reencrypt = cInstance.getPublicKey(CONTRACT_ADDRESS);
      }
    } catch (error) {
      console.error('Error getting re-encryption public key:', error);
      alert('Failed to get re-encryption public key');
    }

    const reencryptPublicKeyHexString = "0x" + Array.from(reencrypt.publicKey)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const contract = new Contract(CONTRACT_ADDRESS, contractAbi, signer);
    const encryptedVote = await contract.viewOwnVote(reencryptPublicKeyHexString, reencrypt.signature);
    const voteUint8 = await cInstance.decrypt(CONTRACT_ADDRESS, encryptedVote);
    setSelectedImages(new Set(uint8ToSelectedImageIds(voteUint8)));
  }, [uint8ToSelectedImageIds]);

  const handleAction = useCallback(async (contractMethod, successMessage, failureMessage, event) => {
    event.preventDefault();
    try {
      const walletProvider = await modal.getWalletProvider();
      const web3Provider = new BrowserProvider(walletProvider);
      const signer = await web3Provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, contractAbi, signer);
      const tx = await contract[contractMethod](...((contractMethod === 'payWinners') ? [0, 10] : []));
      await tx.wait();
      alert(successMessage);
    } catch (error) {
      console.error(`Error during ${contractMethod}:`, error);
      alert(failureMessage);
    }
  }, []);

  const handleWinCheck = useCallback((event) => handleAction('winCheck', 'Win check transaction sent', 'Failed to check wins', event), [handleAction]);
  const handleRevealResult = useCallback((event) => handleAction('revealResult', 'Result reveal transaction sent', 'Failed to reveal result', event), [handleAction]);
  const handlePayWinners = useCallback((event) => handleAction('payWinners', 'Pay winners transaction sent', 'Failed to pay winners', event), [handleAction]);

  useEffect(() => {
    // const countdownInterval = setInterval(() => setCountdownTime(prevTime => Math.max(prevTime - 1, 0)), 1000);
    handleConnectWallet();
    // return () => clearInterval(countdownInterval);
  }, [walletProvider, wallets]);

  const renderCountdown = useCallback(() => {
    const hours = Math.floor(countdownTime / 3600);
    const minutes = Math.floor((countdownTime % 3600) / 60);
    const seconds = countdownTime % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [countdownTime]);

  const renderImageItems = useCallback(() => {
    const imageIds = ['img', 'img_1', 'img_2', 'img_3', 'img_4', 'img_5', 'img_6', 'img_7'];
    return imageIds.map(id => {
      const isSelected = selectedImages.has(id);
      const imageClassName = `af-class-item${isSelected ? ' af-class-selected' : ''}`;
      const imagePath = `images/${id}.png`;

      return (
        <div key={id} className={imageClassName} onClick={() => handleImageClick(id)}>
          <img src={imagePath} loading="lazy" width={211} height={211} alt="" className="af-class-img" />
        </div>
      );
    });
  }, [selectedImages, handleImageClick]);

  return (
    <span>
      <span className="af-view">
        <div className="af-class-game-container">
          <div className="af-class-game-header">
            <div className="af-class-game-title">
              <div className="af-class-h1">Keynesian contest</div>
              <div className="af-class-p_body">Select the four most popular faces from the crowd to win the pot.</div>
            </div>
            <div className="af-class-game-stats">
              <div className="af-class-typehead">
                <div className="af-class-p_body">Total Pot</div>
                <div className="af-class-h2">$40,000,000</div>
              </div>
              <div className="af-class-typehead">
                <div className="af-class-p_body">Time to reveal</div>
                <div className="af-class-h2">{renderCountdown()}</div>
              </div>
            </div>
          </div>
          <div className="af-class-bet-input">
            <div className="af-class-form-block w-form">
              <form id="wf-form-amount" name="wf-form-amount" data-name="amount" method="get" className="af-class-form">
                {!userHasVoted ? (
                  <button type="submit" data-wait="Please wait..." className="af-class-submit-button w-button" onClick={handleBet}>
                    Cast Vote
                  </button>
                ) : (
                  <div>
                    <div className="af-class-entry-received-message">Your entry has been received!</div>
                    <button type="button" className="af-class-submit-button w-button" onClick={handleViewOwnVote}>
                      View Your Vote
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
          <div className="w-layout-vflex af-class-flex-block">
            <div className="af-class-selection-grid">{renderImageItems()}</div>
          </div>
        </div>
      </span>
    </span>
  );
}

export default KeynesianGame;

/* eslint-enable */