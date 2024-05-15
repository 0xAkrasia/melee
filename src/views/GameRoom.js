import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import '../css/GameRoom.css'; // Import the CSS file

const GameRoom = ({ walletProvider, wallets }) => {
  const [ws, setWs] = useState(null);
  const [playerAddress, setPlayerAddress] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const getPlayerAddress = async () => {
      if (walletProvider) {
        const address = wallets[0].address;
        console.log("Player address:", address);
        setPlayerAddress(address);
      }
    };

    getPlayerAddress();
    setLoading(false);
  }, [walletProvider]);

  useEffect(() => {
    const socket = io('http://localhost:4000');

    socket.on('connect', () => {
      console.log('SocketIO connection established');
      setWs(socket);
    });

    socket.on('response', (data) => {
      console.log('Received response:', data);
      if (data.contractAddress) {
        navigate(`/${data.contractAddress}`);
      }
    });

    socket.on('disconnect', () => {
      console.log('SocketIO connection disconnected')
      setLoading(false); // Stop loading on disconnect
    });

    socket.on('connect_error', (error) => {
      console.error('SocketIO connection error:', error);
      setLoading(false); // Stop loading on error
    });

    return () => {
      socket.close();
    };
  }, [navigate]);

  const handleJoinGame = () => {
    if (ws && playerAddress) {
      setLoading(true); // Start loading when the button is clicked
      ws.emit('join_game', { playerAddress });
    }
  };

  return (
    <div className="game-room-container">
      <div className="game-room">
        <button 
          className="connect-wallet-button connect-wallet-text" 
          onClick={handleJoinGame}
          disabled={loading} // Disable the button when loading
        >
          {loading ? <div className="spinner">***</div> : 'Join a Game'}
        </button>
      </div>
    </div>
  );
};

export default GameRoom;