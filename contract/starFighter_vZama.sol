// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.20;

import "fhevm/lib/TFHE.sol";
import "fhevm/oracle/OracleCaller.sol";

contract starFighter is OracleCaller {
    // player data state
    address[] public players;
    mapping(address => uint8) public lives;

    // postion, move direction, move distance, and shot directions state
    uint8 public boardDim;
    euint8 private zero;
    uint8 public shipRange;
    int8[2][8] private orientations;
    uint8 public shotRange;
    mapping(uint8 => bool) public asteroids;
    uint8[8] public asteroidsArray;
    mapping(address => uint8[2]) public positions;
    mapping(address => euint16) private enInput;
    mapping(address => uint8) public moveDist;
    mapping(address => uint8) public moveDir;
    mapping(address => uint8) public shots;

    // star state
    uint8 public starLocation;
    mapping(address => uint8) public starCount;
    uint8 public starsToWin;

    // move data to permission functions
    uint8 private moveCount;
    mapping(address => bool) public moved;
    bool public movesRevealed;
    uint256 public constant moveTimeout = 120;
    uint256 public lastAttackTimestamp;

    // end game data
    address[] public winner;
    bool public gameOver;

    // events
    event gameOverEmit(address[] winner);
    event playerDeadEmit(address player);

    // modifiers
    modifier onlyPlayers() {
        require(lives[msg.sender] > 0, "Only players can call this function");
        _;
    }

    modifier gameLive() {
        require(!gameOver, "The game is over");
        _;
    }

    // Constructor
    constructor(address[] memory _players) {
        // initialize game
        require(_players.length <= 4 && _players.length >= 2); // 2-4 players
        gameOver = false;
        boardDim = 12;
        moveCount = 0;
        zero = TFHE.asEuint8(0); // initialized to save gas on repeated encryption calls
        shipRange = 3;
        shotRange = 4;
        lastAttackTimestamp = block.timestamp;
        
        // initialize players, lives, and positions
        players = _players;
        for (uint8 i = 0; i < players.length; i++) {
            lives[players[i]] = 1;
        }

        uint8[2][4] memory starting_positions = [[3,3], [8,3], [8,8], [3,8]];

        for (uint8 i = 0; i < players.length; i++) {
            positions[players[i]] = starting_positions[i];
        }

        // indices of orientation array match directions of travel like a compass
        orientations = [[int8(0),int8(-1)], [int8(1),int8(-1)], [int8(1),int8(0)], [int8(1),int8(1)], [int8(0),int8(1)], [int8(-1),int8(1)], [int8(-1),int8(0)], [int8(-1),int8(-1)]];
        
        // initial asteroid locations
        asteroidsArray = [15,42,54,74,105,111,112,116];
        for (uint8 i = 0; i < asteroidsArray.length; i++) {
            asteroids[asteroidsArray[i]] = true;
        }

        // star state
        starLocation = 66;
        starsToWin = 2;
    }

    function _removePlayer(address _player) private {
        // handle dead players
        for (uint8 i = 0; i < players.length; i++) {
            if (players[i] == _player) {
                players[i] = players[players.length - 1];
                players.pop();
                emit playerDeadEmit(_player);
                return;
            }
        }
    }

    function move(bytes calldata input) public onlyPlayers gameLive{
        // check if move is within move window
        require(block.timestamp - lastAttackTimestamp < moveTimeout, "Timeout: Move too late");

        // receive bitwise encrypted move and shot from player, check validity, and store data
        address player = msg.sender;
        require(moved[player] == false);
        require(moveCount < uint8(players.length));

        // data is encrypted in 16 bits from right to left, the first four represent move distance, the next three represent move direction (0-7 on orientations array),
        // the next three represent shot direction (0-7 on orientations array)
        enInput[msg.sender] = TFHE.asEuint16(input);

        // update move state
        moved[player] = true;
        moveCount ++;
    }

    function decryptMoves() public gameLive {
        // once all players have moved or time has run out, decrypt the results
        require(moveCount == players.length || block.timestamp - lastAttackTimestamp > moveTimeout, "Awaiting other players");
        
        euint16[] memory cts = new euint16[](players.length);

        for (uint8 i = 0; i < players.length; i++) {
            address player = players[i];
            if (moved[player] == true) {
                cts[i] = (enInput[player]);
            } else {
                cts[i] = (TFHE.asEuint16(0));
            }
        }

        uint256 requestID = Oracle.requestDecryption(cts, this.moveCallback.selector, 0, block.timestamp + 100);

        for (uint8 i = 0; i < players.length; i++) {
            addParamsAddress(requestID, players[i]);
        }
    }

    function moveCallback(uint256 _requestID, uint16 _decryptedInputP1, uint16 _decryptedInputP2, uint16 _decryptedInputP3, uint16 _decryptedInputP4) public onlyOracle {
        moveCount = 0;
        lastAttackTimestamp = block.timestamp;

        address[] memory livePlayers = getParamsAddress(_requestID);
        uint16[4] memory decryptedInputs = [_decryptedInputP1, _decryptedInputP2, _decryptedInputP3, _decryptedInputP4];

        for (uint8 i = 0; i < livePlayers.length; i++) {
            uint16 playerMove = decryptedInputs[i];
            address player = livePlayers[i];
            moveDist[player] = uint8(playerMove & 0xF);
            moveDir[player] = uint8((playerMove >> 4) & 0x7);
            shots[player] = uint8((playerMove >> 7) & 0x7);
        }

        // check if player hit an asteroid or is off map. Kill if true.
        address[] memory deadPlayers = new address[](players.length);
        uint8 deadPlayerCount = 0;

        for (uint8 i = 0; i < players.length; i++) {
            address player = players[i];
            moved[player] = false;
            uint8[2] memory position = positions[player];
            int8[2] memory playerMoveDir = orientations[moveDir[player]];
            for (uint8 j = 1; j <= moveDist[player]; j++) {
                uint8 newX = uint8(int8(position[0]) + int8(j)*playerMoveDir[0]); 
                uint8 newY = uint8(int8(position[1]) + int8(j)*playerMoveDir[1]);
                if (newX < boardDim && newY < boardDim) {
                    positions[player] = [newX, newY];
                    if (asteroids[(newY * boardDim + newX)] == true) {
                        lives[player] = 0;
                        deadPlayers[deadPlayerCount] = player;
                        deadPlayerCount++;
                        break;
                    }
                } else {
                    lives[player] = 0;
                    deadPlayers[deadPlayerCount] = player;
                    deadPlayerCount++;
                    break;
                }
            }
        }

        // remove suicided players
        if (deadPlayerCount > 0) {
            for (uint8 i = 0; i < deadPlayerCount; i++) {
                _removePlayer(deadPlayers[i]);
            }
        }

        // check the shot path of remaining players to look for kills
        deadPlayers = new address[](players.length);
        deadPlayerCount = 0;

        for (uint8 i = 0; i < players.length; i++) {
            address player = players[i];
            uint8[2] memory position = positions[player];
            int8[2] memory shot = orientations[shots[player]];
            for (uint8 j = 1; j <= shotRange; j++) {
                uint8 shotX = uint8(int8(position[0]) + int8(j)*shot[0]); 
                uint8 shotY = uint8(int8(position[1]) + int8(j)*shot[1]);
                if (shotX < boardDim && shotY < boardDim) {
                    if (asteroids[(shotY * boardDim + shotX)] == true){
                        break;
                    }
                    for (uint8 k = 0; k < players.length; k++) {
                        if (shotX == positions[players[k]][0] && shotY == positions[players[k]][1]) {
                            lives[players[k]]--;
                            if (lives[players[k]] == 0) {
                                deadPlayers[deadPlayerCount] = players[k];
                                deadPlayerCount++;
                            }
                        }
                    }
                }
            }
        }

        // remove shot players
        if (deadPlayerCount > 0) {
            for (uint8 i = 0; i < deadPlayerCount; i++) {
                _removePlayer(deadPlayers[i]);
            }
        }

        // check for winner
        if (players.length <= 1) {
            if (players.length == 1) {
                winner.push(players[0]);
            } else {
                winner.push(address(0));
            }
            gameOver = true;
            emit gameOverEmit(winner);
            return;
        }

        // check for star capture, check for star based win, if star is captured but there is no winner then randomly generate a new star
        address[] memory winnersArray = new address[](players.length);
        uint8 winnerCount = 0;

        bool starFound = false;
        for (uint8 i = 0; i < players.length; i++) {
            address player = players[i];
            if (positions[player][1] * boardDim + positions[player][0] == starLocation) {
                starCount[player]++;
                starFound = true;
                if (starCount[player] == starsToWin) {
                    winnersArray[winnerCount] = player;
                    winnerCount++;
                }
            }
        }

        if (winnerCount > 0) {
            gameOver = true;
            emit gameOverEmit(winnersArray);
            return;
        }

        if (starFound) {
            uint256 requestID = Oracle.requestDecryption(TFHE.randEuint32(), this.starCallBack.selector, 0, block.timestamp + 100);
        }
    }

    function starCallBack(uint256 /*_requestID*/, uint32 _decryptedRNG) public onlyOracle {
        bool onAsteroid = true;
        uint8 newStar = uint8(_decryptedRNG % 144);
        while (onAsteroid) {
            if (asteroids[newStar] == true) {
                newStar += 1;
            } else {
                onAsteroid = false;
            }
        }
        starLocation = newStar;
    }
}