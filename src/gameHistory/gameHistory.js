import React from 'react';
import '../css/gameHistory.css';
import "../css/keynesianBeautyContest.css";

const GameHistory = () => {
  // Updated gameHistory without date
  const gameHistory = [
    // {
    //   name: "Fruit",
    //   totalBet: "Ξ 10.50",
    //   winners: 3,
    //   images: ["apple", "banana", "cherry", "mango", "orange", "strawberry", "watermelon", "blueberry"],
    //   scores: [85, 72, 68, 54, 47, 39, 25, 10]
    // },
    // {
    //   name: "Memecoin",
    //   totalBet: "Ξ 20.75",
    //   winners: 5,
    //   images: ["doge", "pepe", "shiba", "bonk", "wif", "mog", "popcat", "retardio"],
    //   scores: [92, 88, 76, 65, 59, 43, 31, 18]
    // },
    // Add more entries as needed
  ];

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
        </div>
        {gameHistory.map((game, index) => (
          <div key={index} className={`history-item ${index === gameHistory.length - 1 ? 'last-item' : ''}`}>
            <span>{game.name}</span>
            <span>{game.totalBet}</span>
            <span>{game.winners}</span>
            {game.images.map((image, imgIndex) => (
              <span key={imgIndex} className="image-score-container">
                <img
                  src={`images/${game.name.split(' ')[0].toLowerCase()}/${image}.png`}
                  alt={`Rank ${imgIndex + 1}`}
                />
                <div className="score">{game.scores[imgIndex]}</div>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GameHistory;