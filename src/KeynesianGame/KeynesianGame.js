/* eslint-disable */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initFhevm, createInstance } from 'fhevmjs';
import { BrowserProvider, Contract, AbiCoder } from 'ethers';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import contractAbi from '../abi/KeynsianBeautyContest.json';
import '../css/KeynesianGame.css';
import { FetchBalance } from './FetchBalance';
import { parseEther } from 'ethers';

initFhevm();

const FHE_LIB_ADDRESS = "0x000000000000000000000000000000000000005d";
const CONTRACT_ADDRESS = '0xcf9eB5790e8402933b6ee640b2E1a6c91F8b07AC';
const TARGETDATE = new Date('2024-10-25T00:00:00Z'); // Replace with your target date-time

const ImageItem = ({ id, index, imagePath, moveImage }) => {
  const ref = React.useRef(null);

  const [, drop] = useDrop({
    accept: 'image',
    hover: (item) => {
      if (item.index !== index) {
        moveImage(item.index, index);
        item.index = index;
      }
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: 'image',
    item: { id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={`af-class-item image-item${isDragging ? ' af-class-dragging' : ''}`}
      style={{ opacity: isDragging ? 0 : 1 }} // Make sure the parent div itself doesn't change opacity
    >
      <div className="image-item-number">
        <div>{index + 1}</div> {/* Display the index number */}
      </div>
      <div className="af-class-placeholder"></div>
      <img
        src={imagePath}
        loading="lazy"
        alt=""
        className="af-class-img"
        style={{ opacity: isDragging ? 0 : 1 }}
      />
    </div>
  );
};

const KeynesianGame = ({ walletProvider, wallets }) => {
  const [selectedImages, setSelectedImages] = useState([
    'img', 'img_1', 'img_2', 'img_3', 'img_4', 'img_5', 'img_6', 'img_7'
  ]);
  const [countdownTime, setCountdownTime] = useState(Math.floor((TARGETDATE - new Date()) / 1000)); // Calculate initial countdown time
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [userHasVoted, setUserHasVoted] = useState(false);
  const [isBetLoading, setIsBetLoading] = useState(false); // State for loading effect during vote cast
  const [isLoading, setIsLoading] = useState(false); // State for loading effect during view own vote
  const [instance, setInstance] = useState(null); // Global state for instance
  const intervalRef = useRef(null);  // Reference to store the interval ID

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCountdownTime(prevCount => {
        if (prevCount <= 0) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prevCount - 1;
      });
    }, 1000);

    // Cleanup function to clear the interval
    return () => clearInterval(intervalRef.current);

  }, []);

  const moveImage = (fromIndex, toIndex) => {
    const updatedImages = [...selectedImages];
    const [movedItem] = updatedImages.splice(fromIndex, 1);
    updatedImages.splice(toIndex, 0, movedItem);
    setSelectedImages(updatedImages);
  };

  const convertToUint32 = useCallback((selectedImageIdsArray) => {
    let result = 0;
    const imageIds = ['img', 'img_1', 'img_2', 'img_3', 'img_4', 'img_5', 'img_6', 'img_7'];

    selectedImageIdsArray.forEach((id, index) => {
      // Find the index of the current image id
      const imageIndex = imageIds.indexOf(id);

      if (imageIndex >= 0 && imageIndex <= 7) {
        // Shift the image index to the appropriate position (3 bits for each image index)
        result |= imageIndex << (index * 3);
      } else {
        throw new Error('Image ID is out of range. It should be between 0 and 7, inclusive.');
      }
    });

    return result;
  }, []);

  const uint8ToSelectedImageIds = (voteUint8) => {
    const imageIds = ['img', 'img_1', 'img_2', 'img_3', 'img_4', 'img_5', 'img_6', 'img_7'];
    const selectedImageIdsArray = [];

    const voteUint8Num = Number(voteUint8);

    for (let i = 0; i < imageIds.length; i++) {
      // Extract 3 bits for each image ID
      const imageIndex = (voteUint8Num >> (i * 3)) & 0x07;  // 0x07 (binary 00000111) masks out all but the 3 lowest-order bits

      // Check if the image index is within the valid range (0 to 7)
      if (imageIndex < imageIds.length) {
        selectedImageIdsArray.push(imageIds[imageIndex]);
      }
    }

    return selectedImageIdsArray;
  };

  const checkVotingStatus = useCallback(async (signer) => {
    const contract = new Contract(CONTRACT_ADDRESS, contractAbi, signer);
    const userAddress = await signer.getAddress();
    const hasVoted = await contract.hasVoted(userAddress);
    console.log('User has voted:', hasVoted);
    return hasVoted;
  }, []);

  const handleConnectWallet = useCallback(async (walletProvider, wallets) => {
    try {
      if (!walletProvider) {
        console.error('Wallet provider not found');
        setIsWalletConnected(false);
        setUserHasVoted(false);
        return;
      }
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
    setIsBetLoading(true); // Start the loading indicator
    try {
      const instance = await createFHEInstance(walletProvider);
      const signer = await walletProvider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, contractAbi, signer);

      // Ensure to reorder images to specific order if needed
      const orderedImages = selectedImages.slice();

      const voteUint8 = convertToUint32(orderedImages);
      const encryptedVote = instance.encrypt32(voteUint8);

      const tx = await contract.castVote(encryptedVote, {
        value: parseEther('0.01'),
      });
      await tx.wait();
      alert('Vote cast successfully');

      // Set selected images as required post-casting
      setSelectedImages(orderedImages);  // You can reset or keep as handled earlier

      // Refresh the state by calling handleConnectWallet again
      handleConnectWallet(walletProvider, wallets);
    } catch (error) {
      console.error('Error casting vote:', error);
      alert('Failed to cast vote');
    } finally {
      setIsBetLoading(false); // Stop the loading indicator
    }
  }, [selectedImages, convertToUint32, createFHEInstance, walletProvider, handleConnectWallet, wallets]);


  const handleViewOwnVote = useCallback(async (event) => {
    event.preventDefault();
    setIsLoading(true); // Start the loading indicator
    const signer = await walletProvider.getSigner();
    const userAddress = await signer.getAddress();
    let reencrypt = null;
    let cInstance = null;
    console.log("handleViewOwnVote initiated");

    try {
      cInstance = await createFHEInstance(walletProvider);
      if (!cInstance) {
        throw new Error("createFHEInstance returned null");
      }

      // Re-initializing or generating needed keys only if not already done
      if (!cInstance.hasKeypair(CONTRACT_ADDRESS)) {
        const eip712Domain = {
          name: 'Authorization token',
          version: '1',
          chainId: 9090,
          verifyingContract: CONTRACT_ADDRESS,
        };

        const reencryption = cInstance.generatePublicKey(eip712Domain);
        if (!reencryption) {
          throw new Error("generatePublicKey returned null");
        }

        const params = [userAddress, JSON.stringify(reencryption.eip712)];
        const sig = await window.ethereum.request({
          method: "eth_signTypedData_v4",
          params,
        });

        if (!sig) {
          throw new Error("Signature request failed");
        }

        cInstance.setSignature(CONTRACT_ADDRESS, sig);
        reencrypt = cInstance.getPublicKey(CONTRACT_ADDRESS);
        if (!reencrypt) {
          throw new Error("getPublicKey returned null");
        }
        console.log('Re-encryption public key:', reencrypt);
      } else {
        reencrypt = cInstance.getPublicKey(CONTRACT_ADDRESS);
        if (!reencrypt) {
          throw new Error("getPublicKey from existing keypair returned null");
        }
        console.log('Re-encryption public key (retrieved from existing keypair):', reencrypt);
      }
    } catch (error) {
      console.error('Error getting re-encryption public key:', error);
      alert('Failed to get re-encryption public key');
      setIsLoading(false); // Stop loading on error
      return;
    }

    try {
      const reencryptPublicKeyHexString = "0x" + Array.from(reencrypt.publicKey)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const contract = new Contract(CONTRACT_ADDRESS, contractAbi, signer);
      const encryptedVote = await contract.viewOwnVote(
        reencryptPublicKeyHexString,
        reencrypt.signature
      );

      if (!encryptedVote) {
        throw new Error("viewOwnVote returned null");
      }

      const voteUint8 = await cInstance.decrypt(CONTRACT_ADDRESS, encryptedVote);
      const selectedImageIdsArray = uint8ToSelectedImageIds(voteUint8);
      console.log('Selected image IDs:', selectedImageIdsArray);
      setSelectedImages(selectedImageIdsArray); // Reset or maintain as needed
      setIsLoading(false); // Stop loading after success
    } catch (error) {
      console.error('Error viewing own vote:', error);
      alert('Failed to view own vote');
      setIsLoading(false); // Stop loading on error
    }
  }, [uint8ToSelectedImageIds, createFHEInstance, walletProvider]);

  const handleAction = useCallback(async (contractMethod, successMessage, failureMessage, event) => {
    event.preventDefault();
    try {
      const walletProvider = await modal.getWalletProvider();
      const web3Provider = new BrowserProvider(walletProvider);
      const signer = await web3Provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, contractAbi, signer);
      const tx = await contract[contractMethod](...(contractMethod === 'payWinners' ? [0, 10] : []));
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
    handleConnectWallet(walletProvider, wallets);
  }, [walletProvider, wallets]);

  const renderCountdown = useCallback(() => {
    const days = Math.floor(countdownTime / (3600 * 24));
    const hours = Math.floor((countdownTime % (3600 * 24)) / 3600);
    const minutes = Math.floor((countdownTime % 3600) / 60);
    const seconds = countdownTime % 60;
    return `${days.toString().padStart(2, '0')}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [countdownTime]);

  const renderImageItems = useCallback(() => {
    return selectedImages.map((id, index) => (
      <ImageItem
        key={id}
        id={id}
        index={index}
        imagePath={`images/${id}.png`}
        moveImage={moveImage}
      />
    ));
  }, [selectedImages, moveImage]);

  return (
    <DndProvider backend={HTML5Backend}>
      <span>
        <span className="af-view">
          <div className="af-class-game-container">
            <div className="af-class-game-header">
              <div className="af-class-game-title">
                <div className="af-class-h1">Keynesian Beauty Contest</div>
                <div className="af-class-p_body">Rank the candidates from most popular to least popular. If your vote matches the average of all votes then you win the pot.</div>
              </div>
              <div className="af-class-game-stats">
                <FetchBalance className="af-class-typehead" />
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
                    <button
                      type="submit"
                      data-wait="Please wait..."
                      className={`af-class-submit-button w-button${isBetLoading ? ' af-class-submit-button--loading' : ''}`}
                      onClick={handleBet}
                    >
                      {!isBetLoading ? (
                        <span className="af-class-button__text">Cast Vote</span>
                      ) : (
                        <span className="af-class-button__placeholder">Cast Vote</span>
                      )}
                    </button>
                  ) : (
                    <div>
                      <div className="af-class-entry-received-message">Your entry has been received!</div>
                      <button
                        type="button"
                        className={`af-class-submit-button w-button${isLoading ? ' af-class-submit-button--loading' : ''}`}
                        onClick={handleViewOwnVote}
                      >
                        {!isLoading ? (
                          <span className="af-class-button__text">View Your Vote</span>
                        ) : (
                          <span className="af-class-button__placeholder">View Your Vote</span>
                        )}
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
    </DndProvider>
  );
}

export default KeynesianGame;

/* eslint-enable */