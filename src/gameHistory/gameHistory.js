import React, { useState, useEffect } from 'react';
import { Contract } from 'ethers';
import '../css/gameHistory.css';
import "../css/keynesianBeautyContest.css";
import contractAbi from "../contracts/KBCBaseABI.json";

const GameHistory = ({walletProvider, wallets}) => {
  const [gameHistory, setGameHistory] = useState([
    {
      name: "Fruit",
      totalBet: "Ξ 0.012",
      winners: 1,
      images: ["strawberry", "watermelon", "cherry", "mango", "blueberry", "orange", "apple", "banana"],
      scores: [1,4,5,6,6,9,11,14],
      address: "0xb839192F40b8dD9da2c2C0856a9D660b623B8FAd"
    },
    // Add more entries as needed
  ]);
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    const fetchGameData = async (game) => {
      if (!walletProvider) return game;

      try {
        const signer = await walletProvider.getSigner();
        const userAddress = await wallets[0].address;
        const contract = new Contract(game.address, contractAbi, signer);

        // Fetch high score
        const fetchedHighScore = await contract.highScore();
        setHighScore(Number(fetchedHighScore));

        // Fetch user score for this game
        const score = await contract.scores(userAddress);
        return { ...game, userScore: Number(score) };
      } catch (error) {
        console.error("Error fetching game data:", error);
        return game;
      }
    };

    const updateGameHistory = async () => {
      const updatedGameHistory = await Promise.all(gameHistory.map(fetchGameData));
      setGameHistory(updatedGameHistory);
    };

    if (walletProvider && wallets.length > 0) {
      updateGameHistory();
    }
  }, [walletProvider, wallets, gameHistory]);

  return (
    <div className="game-history af-class-game-container">
      <div className="af-class-game-header">
        <div className="af-class-game-title">
          <h1 className="af-class-h1">Game History</h1>
        </div>
      </div>
      <div className="history-table">
        <div className="history-header">
          <span>Edition</span>
          <span>Pot</span>
          <span>Winners</span>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
            <span key={num}>{num}</span>
          ))}
          <span>Player Win</span>
        </div>
        {gameHistory.map((game, index) => (
          <div key={index} className={`history-item ${index === gameHistory.length - 1 ? 'last-item' : ''}`}>
            <span>{game.name}</span>
            <span>{game.totalBet}</span>
            <span>{game.winners}</span>
            {game.images.map((image, imgIndex) => (
              <span key={imgIndex} className="image-score-container">
                <img
                  src={`https://raw.githubusercontent.com/0xAkrasia/melee/main/public/images/${game.name.split(' ')[0]}/${image}.png`}
                  alt={`Rank ${imgIndex + 1}`}
                />
                <div className="score">{game.scores[imgIndex]}</div>
              </span>
            ))}
            <span className="result-column">
              {highScore !== 0 && game.userScore === highScore ? '✅' : '❌'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GameHistory;