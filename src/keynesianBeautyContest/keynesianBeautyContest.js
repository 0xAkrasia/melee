/* eslint-disable */
import React, { useState, useEffect, useCallback, useRef } from "react";
import { initFhevm, createInstance } from "fhevmjs";
import { BrowserProvider, Contract, JsonRpcProvider } from "ethers";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import contractAbi from "../contracts/KBCSepoliaABI.json";
import { FetchBalance, fetchBalance } from "./fetchBalance";
import BetInput from "./betInput";
import { parseEther, formatEther } from "ethers";
import contractAddresses from "../contracts/contractAddresses.json";
import "../css/KeynesianGame.css";
import { postCiphertext } from "../ciphertextBriding/ciphertextToCCIP";
import toast from "react-hot-toast";
import Loader from "../components/loader";
import imageCategories from "../contracts/imageCategories.json";

initFhevm();

const imageCategory = "Memecoin"
const kbcAddress = contractAddresses[0].KBCSepolia;
const imageNames = imageCategories[0][imageCategory];

const ImageItem = ({ id, index, imagePath, moveImage }) => {
  const ref = React.useRef(null);

  const [, drop] = useDrop({
    accept: "image",
    hover: (item) => {
      if (item.index !== index) {
        moveImage(item.index, index);
        item.index = index;
      }
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: "image",
    item: { id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  return (
    <div className={`af-class-item${isDragging ? " af-class-dragging" : ""}`}>
      <div className="image-item-number">
        <div>{index + 1}</div> {/* Display the index number */}
      </div>
      <div className="af-class-placeholder"></div>
      <img
        ref={ref} // Apply drag and drop to img element
        src={imagePath}
        loading="lazy"
        alt={`Image ${id}`}
        className="af-class-img"
        onError={(e) => {
          console.error("Image failed to load:", imagePath);
          e.target.style.display = 'none';
        }}
      />
    </div>
  );
};
// background-color: rgba(25, 13, 0, 0.5);
const KeynesianGame = ({ walletProvider, wallets }) => {
  const [selectedImages, setSelectedImages] = useState(imageNames || []);
  const [countdownTime, setCountdownTime] = useState(0);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [userHasVoted, setUserHasVoted] = useState(false);
  const [isBetLoading, setIsBetLoading] = useState(false); // State for loading effect during vote cast
  const [isLoading, setIsLoading] = useState(false); // State for loading effect during view own vote
  const [instance, setInstance] = useState(null); // Global state for instance
  const [betAmount, setBetAmount] = useState("0.1"); // Set default value to 0.1
  const intervalRef = useRef(null); // Reference to store the interval ID
  const [endTime, setEndTime] = useState(null);

  const fetchEndTime = useCallback(async () => {
    try {
      const provider = new JsonRpcProvider('https://1rpc.io/sepolia');
      const contract = new Contract(kbcAddress, contractAbi, provider);
      const endTimeFromContract = await contract.endTime();
      const endTimeMs = Number(endTimeFromContract) * 1000; // Convert to milliseconds
      setEndTime(endTimeMs);
    } catch (error) {
      console.error("Error fetching endTime:", error);
    }
  }, []);

  useEffect(() => {
    fetchEndTime();
  }, [fetchEndTime]);

  useEffect(() => {
    if (endTime) {
      const updateCountdown = () => {
        const now = Date.now();
        const timeLeft = Math.max(0, endTime - now);
        setCountdownTime(Math.floor(timeLeft / 1000));
        
        if (timeLeft <= 0) {
          clearInterval(intervalRef.current);
        }
      };

      // Update immediately and then set interval
      updateCountdown();
      intervalRef.current = setInterval(updateCountdown, 1000);

      return () => {
        clearInterval(intervalRef.current);
      };
    }
  }, [endTime]);

  const moveImage = (fromIndex, toIndex) => {
    const updatedImages = [...selectedImages];
    const [movedItem] = updatedImages.splice(fromIndex, 1);
    updatedImages.splice(toIndex, 0, movedItem);
    setSelectedImages(updatedImages);
  };

  const convertToUint32 = useCallback((selectedImageIdsArray) => {
    let result = 0;
    const imageIds = imageNames;

    selectedImageIdsArray.forEach((id, index) => {
      // Find the index of the current image id
      const imageIndex = imageIds.indexOf(id);

      if (imageIndex >= 0 && imageIndex <= 7) {
        // Shift the image index to the appropriate position (3 bits for each image index)
        result |= imageIndex << (index * 3);
      } else {
        throw new Error(
          "Image ID is out of range. It should be between 0 and 7, inclusive."
        );
      }
    });

    return result;
  }, []);

  const uint8ToSelectedImageIds = (voteUint8) => {
    const imageIds = imageNames;
    const selectedImageIdsArray = [];

    const voteUint8Num = Number(voteUint8);

    for (let i = 0; i < imageIds.length; i++) {
      // Extract 3 bits for each image ID
      const imageIndex = (voteUint8Num >> (i * 3)) & 0x07; // 0x07 (binary 00000111) masks out all but the 3 lowest-order bits

      // Check if the image index is within the valid range (0 to 7)
      if (imageIndex < imageIds.length) {
        selectedImageIdsArray.push(imageIds[imageIndex]);
      }
    }

    return selectedImageIdsArray;
  };

  const checkVotingStatus = useCallback(async (signer) => {
    const contract = new Contract(kbcAddress, contractAbi, signer);
    const userAddress = await signer.getAddress();
    const betValueBigNumber = await contract.betValue(userAddress);
    const betValueEther = parseFloat(formatEther(betValueBigNumber));
    const hasVoted = betValueEther >= 0.01;
    console.log("User has voted:", hasVoted);
    return hasVoted;
  }, []);

  const handleConnectWallet = useCallback(
    async (walletProvider, wallets) => {
      try {
        if (!walletProvider) {
          console.error("Wallet provider not found");
          setIsWalletConnected(false);
          setUserHasVoted(false);
          return;
        }

        // Check if the provider has a getSigner method
        if (typeof walletProvider.getSigner !== 'function') {
          console.error("Invalid wallet provider: getSigner method not found");
          setIsWalletConnected(false);
          setUserHasVoted(false);
          toast.error("Invalid wallet provider. Please reconnect your wallet.");
          return;
        }

        const signer = await walletProvider.getSigner();
        if (signer) {
          const userHasVoted = await checkVotingStatus(signer);
          setIsWalletConnected(true);
          console.log("wallet connected", true);
          setUserHasVoted(userHasVoted);
        } else {
          setIsWalletConnected(false);
          console.log("wallet connected", false);
          setUserHasVoted(false);
        }
      } catch (error) {
        console.error("Error connecting wallet:", error);
        setIsWalletConnected(false);
        setUserHasVoted(false);
      }
    },
    [checkVotingStatus]
  );

  const createFHEInstance = useCallback(async () => {
    if (instance) {
      return instance;
    }

    const chainId = 9090;
    const publicKey = contractAddresses[0].IncoPubKey;
    const newInstance = await createInstance({ chainId, publicKey });
    console.log("FHE instance created", newInstance);
    setInstance(newInstance);
    return newInstance;
  }, [instance]);

  const handleBet = useCallback(
    async (event) => {
      event.preventDefault();
      setIsBetLoading(true); // Start the loading indicator
      try {
        const instance = await createFHEInstance();
        const signer = await walletProvider.getSigner();
        const contract = new Contract(kbcAddress, contractAbi, signer);

        // Ensure to reorder images to specific order if needed
        const orderedImages = selectedImages.slice();

        const voteUint8 = convertToUint32(orderedImages);
        const encryptedVote = instance.encrypt32(voteUint8);
        const hash = await postCiphertext(encryptedVote);
        console.log('Hash:', hash);

        const tx = await contract.castVote(encryptedVote, {
          value: parseEther(betAmount),
        });
        await tx.wait();

        // Set selected images as required post-casting
        setSelectedImages(orderedImages); // You can reset or keep as handled earlier

        // Refresh the state by calling handleConnectWallet again
        handleConnectWallet(walletProvider, wallets);
      } catch (error) {
        if (error.message.includes("send at least 0.01 ETH to enter")) {
          toast.error("send at least 0.01 ETH to enter");
        } else if (error.message.includes("player already voted")) {
          toast.error("You have already voted");
        } else if (error.message.includes("insufficient funds for gas * price + value")) {
          toast.error("insufficient funds");
        }
      } finally {
        setIsBetLoading(false); // Stop the loading indicator
      }
    },
    [
      betAmount,
      selectedImages,
      convertToUint32,
      createFHEInstance,
      walletProvider,
      handleConnectWallet,
      wallets,
    ]
  );

  const handleViewOwnVote = useCallback(
    async (event) => {
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
        if (!cInstance.hasKeypair(kbcAddress)) {
          const eip712Domain = {
            name: "Authorization token",
            version: "1",
            chainId: 9090,
            verifyingContract: kbcAddress,
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

          cInstance.setSignature(kbcAddress, sig);
          reencrypt = cInstance.getPublicKey(kbcAddress);
          if (!reencrypt) {
            throw new Error("getPublicKey returned null");
          }
          console.log("Re-encryption public key:", reencrypt);
        } else {
          reencrypt = cInstance.getPublicKey(kbcAddress);
          if (!reencrypt) {
            throw new Error("getPublicKey from existing keypair returned null");
          }
          console.log(
            "Re-encryption public key (retrieved from existing keypair):",
            reencrypt
          );
        }
      } catch (error) {
        console.error("Error getting re-encryption public key:", error);
        // alert("Failed to get re-encryption public key");
        toast.error("Failed to get re-encryption public key");
        setIsLoading(false); // Stop loading on error
        return;
      }

      try {
        const reencryptPublicKeyHexString =
          "0x" +
          Array.from(reencrypt.publicKey)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
        const contract = new Contract(kbcAddress, contractAbi, signer);
        const encryptedVote = await contract.viewOwnVote(
          reencryptPublicKeyHexString,
          reencrypt.signature
        );

        if (!encryptedVote) {
          throw new Error("viewOwnVote returned null");
        }

        const voteUint8 = await cInstance.decrypt(kbcAddress, encryptedVote);
        const selectedImageIdsArray = uint8ToSelectedImageIds(voteUint8);
        console.log("Selected image IDs:", selectedImageIdsArray);
        setSelectedImages(selectedImageIdsArray); // Reset or maintain as needed
        setIsLoading(false); // Stop loading after success
      } catch (error) {
        console.error("Error viewing own vote:", error);
        // alert("Failed to view own vote");
        toast.error("Failed to view own vote");
        setIsLoading(false); // Stop loading on error
      }
    },
    [uint8ToSelectedImageIds, createFHEInstance, walletProvider]
  );

  const handleAction = useCallback(
    async (contractMethod, successMessage, failureMessage, event) => {
      event.preventDefault();
      try {
        const walletProvider = await modal.getWalletProvider();
        const web3Provider = new BrowserProvider(walletProvider);
        const signer = await web3Provider.getSigner();
        const contract = new Contract(kbcAddress, contractAbi, signer);
        const tx = await contract[contractMethod](
          ...(contractMethod === "payWinners" ? [0, 10] : [])
        );
        await tx.wait();
        // alert(successMessage);
        toast.success(successMessage);
      } catch (error) {
        console.error(`Error during ${contractMethod}:`, error);
        // alert(failureMessage);
        toast.error(failureMessage);
      }
    },
    []
  );

  const handleWinCheck = useCallback(
    (event) =>
      handleAction(
        "winCheck",
        "Win check transaction sent",
        "Failed to check wins",
        event
      ),
    [handleAction]
  );
  const handleRevealResult = useCallback(
    (event) =>
      handleAction(
        "revealResult",
        "Result reveal transaction sent",
        "Failed to reveal result",
        event
      ),
    [handleAction]
  );
  const handlePayWinners = useCallback(
    (event) =>
      handleAction(
        "payWinners",
        "Pay winners transaction sent",
        "Failed to pay winners",
        event
      ),
    [handleAction]
  );

  const handleBetAmountChange = useCallback((event) => {
    setBetAmount(event.target.value);
  }, []);

  const handleMaxClick = useCallback(async (event) => {
    event.preventDefault(); // Prevent form submission
    const signer = await walletProvider.getSigner();
    const userAddress = await signer.getAddress();
    const userBalance = await fetchBalance(userAddress, 1);
    const maxBetAmount = userBalance; // Replace with actual logic to get the max balance from the user's wallet
    setBetAmount(maxBetAmount);
  }, []);

  useEffect(() => {
    handleConnectWallet(walletProvider, wallets);
  }, [walletProvider, wallets]);

  const renderCountdown = useCallback(() => {
    if (!endTime) {
      console.log("endTime not set, returning 'Loading...'");
      return "Loading...";
    }

    const hours = Math.floor(countdownTime / 3600);
    const minutes = Math.floor((countdownTime % 3600) / 60);
    const seconds = countdownTime % 60;
    const countdownString = `${hours.toString().padStart(2, "0")}h ${minutes
      .toString()
      .padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
    return countdownString;
  }, [countdownTime, endTime]);

  const renderImageItems = useCallback(() => {
    return (selectedImages || []).map((id, index) => (
      <ImageItem
        key={id}
        id={id}
        index={index}
        imagePath={`images/${imageCategory}/${id}.png`}
        moveImage={moveImage}
      />
    ));
  }, [selectedImages, moveImage, imageCategory]);

  useEffect(() => {
    setSelectedImages(imageNames || []);
  }, [imageCategory]);

  return (
    <DndProvider backend={HTML5Backend}>
      <span>
        <span className="af-view">
          <div className="af-class-game-container">
            <div className="af-class-game-header">
              <div className="af-class-game-title">
                <div className="af-class-h1">Keynesian Beauty Contest</div>
                <div></div>
                <h2 className="af-class-p_body_big">{imageCategory} Edition</h2>
                <div></div>
                <div className="af-class-p_body">
                  Drag and drop to rank the images below from best to worst. If
                  your vote matches the average of all votes then you win the
                  pot!
                </div>
              </div>
              <div className="af-class-game-stats">
                <div className="af-class-typehead">
                  <div className="af-class-p_body">Total Pot</div>
                  <FetchBalance contractAddress={kbcAddress} factor="1" />
                </div>
                <div className="af-class-typehead">
                  <div className="af-class-p_body">Time to reveal</div>
                  <div className="af-class-h2">{renderCountdown()}</div>
                </div>
              </div>
            </div>
            <div className="af-class-bet-input">
              <div className="af-class-form-block w-form">
                <form
                  id="wf-form-amount"
                  name="wf-form-amount"
                  data-name="amount"
                  method="get"
                  className="af-class-form"
                >
                  {!userHasVoted ? (
                    <div className="af-class-p_body">
                      <BetInput
                        value={betAmount}
                        onValueChange={handleBetAmountChange}
                        onMaxClick={handleMaxClick}
                      />
                      <div className="af-class-button">
                        <button
                          type="submit"
                          data-wait="Please wait..."
                          className={`af-class-submit-button w-button`}
                          // className={`af-class-submit-button w-button${
                          //   isBetLoading
                          //     ? "af-class-submit-button--loading"
                          //     : ""
                          // }`}
                          //

                          onClick={handleBet}
                        >
                          {!isBetLoading ? (
                            <span className="af-class-button__text">
                              Cast Vote
                            </span>
                          ) : (
                            <Loader />
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="af-class-entry-received-message">
                      Vote received!
                    </div>
                    // <button
                    //   type="button"
                    //   className={`af-class-submit-button w-button${isLoading ? ' af-class-submit-button--loading' : ''}`}
                    //   onClick={handleViewOwnVote}
                    // >
                    //   {!isLoading ? (
                    //     <span className="af-class-button__text">View Your Vote</span>
                    //   ) : (
                    //     <span className="af-class-button__placeholder">View Your Vote</span>
                    //   )}
                    // </button>
                  )}
                </form>
              </div>
            </div>
            <div className="w-layout-vflex af-class-flex-block">
              <div className="af-class-selection-grid">
                {renderImageItems()}
              </div>
            </div>
          </div>
        </span>
      </span>
    </DndProvider>
  );
};

export default KeynesianGame;

/* eslint-enable */
