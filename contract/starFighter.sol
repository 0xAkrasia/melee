// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20 <0.9.0;

import "fhevm/lib/TFHE.sol";

contract starFighter {
    // player data state
    address[] public players;
    mapping(address => uint8) public lives;

    // postion, move direction, move distance, and shot directions state
    uint8 public boardDim;
    euint8 private zero;
    uint8 public shipRange;
    int8[2][8] private orientations;
    int8 public shotRange;
    mapping(uint8 => bool) public asteroids;
    mapping(address => uint8[2]) public positions;
    mapping(address => uint8) public moveDist;
    mapping(address => euint8) private enMoveDist;
    mapping(address => uint8) public moveDir;
    mapping(address => euint8) private enMoveDir;
    mapping(address => uint8) public shots;
    mapping(address => euint8) private enShots;

    // star state
    uint8 public starLocation;
    mapping(address => uint8) public starCount;
    uint8 public starsToWin;
    
    // move data to permission functions
    uint8 private moveCount;
    mapping(address => bool) public moved;
    bool public movesRevealed;

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
        uint8[8] memory astArray = [15,42,54,74,105,111,112,116];
        for (uint8 i = 0; i < astArray.length; i++) {
            asteroids[astArray[i]] = true;
        }

        // star state
        starLocation = 66;
        starsToWin = 2;
    }

    function move(bytes calldata input) public onlyPlayers gameLive{
        // receive bitwise encrypted move and shot from player, check validity, and store data
        address player = msg.sender;
        require(moved[player] == false);
        require(moveCount < uint8(players.length));

        // data is encrypted in 16 bits from right to left, the first four represent move distance, the next three represent move direction (0-7 on orientations array),
        // the next three represent shot direction (0-7 on orientations array)
        euint16 enInput = TFHE.asEuint16(input);
        enMoveDist[player] = TFHE.asEuint8(TFHE.and(enInput, TFHE.asEuint16(0xF)));
        enMoveDir[player] = TFHE.asEuint8(TFHE.and(TFHE.shr(enInput, 4), TFHE.asEuint16(0x7)));
        enShots[player] = TFHE.asEuint8(TFHE.and(TFHE.shr(enInput, 7), TFHE.asEuint16(0x7)));

        // check if move distance is within ship range
        TFHE.optReq(TFHE.le(enMoveDist[player], TFHE.asEuint8(shipRange)));

        // update move state
        moved[player] = true;
        moveCount ++;
    }

    function revealMoves() public onlyPlayers gameLive {
        // once all players have moved, decrypt the results
        require(moveCount == players.length);
        for (uint8 i = 0; i < players.length; i++) {
            moveDist[players[i]] = TFHE.decrypt(enMoveDist[players[i]]);
            moveDir[players[i]] = TFHE.decrypt(enMoveDir[players[i]]);
            shots[players[i]] = TFHE.decrypt(enShots[players[i]]);
        }
        movesRevealed = true;
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

    function attack() public onlyPlayers gameLive {
        // this function handles attacks for all players

        // confirm and reset move state
        require(movesRevealed == true);
        moveCount = 0;
        movesRevealed = false;

        // check if player hit an asteroid or is off map. Kill if true.
        address[] memory deadPlayers = new address[](players.length);
        uint8 deadPlayerCount = 0;

        for (uint8 i = 0; i < players.length; i++) {
            address player = players[i];
            moved[player] = false;
            uint8[2] memory position = positions[player];
            int8[2] memory playerMoveDir = orientations[moveDir[player]];
            bool asteroidHit = false;
            for (int8 j = 1; j <= int8(moveDist[player]); j++) {
                int8 newX = int8(position[0]) + j*playerMoveDir[0]; 
                int8 newY = int8(position[1]) + j*playerMoveDir[1];
                if (newX >= 0 && newY >= 0 && uint8(newX) < boardDim && uint8(newY) < boardDim) {
                    if (asteroids[(uint8(newY) * boardDim + uint8(newX))] == true) {
                        asteroidHit = true;
                    }
                    if (asteroidHit) {
                        lives[player] = 0;
                        deadPlayers[deadPlayerCount] = player;
                        deadPlayerCount++;
                        break;
                    }
                    if (j == int8(moveDist[player])) {
                        positions[player] = [uint8(newX), uint8(newY)];
                    }
                } else {
                    lives[player] = 0;
                    deadPlayers[deadPlayerCount] = player;
                    deadPlayerCount++;
                    break;
                }
            }
        }

        // remove dead players from the game
        if (deadPlayerCount > 0) {
            for (uint8 i = 0; i < deadPlayerCount; i++) {
                _removePlayer(deadPlayers[i]);
            }
        }

        // check the shot path of remaining players to look for kills
        deadPlayers = new address[](players.length);
        deadPlayerCount = 0;

        // if (players.length =! 0) {
        for (uint8 i = 0; i < players.length; i++) {
            address player = players[i];
            uint8[2] memory position = positions[player];
            int8[2] memory shot = orientations[shots[player]];
            bool asteroidHit = false;
            for (int8 j = 1; j <= shotRange; j++) {
                int8 shotX = int8(position[0]) + j*shot[0]; 
                int8 shotY = int8(position[1]) + j*shot[1];
                if (shotX >= 0 && shotY >= 0 && uint8(shotX) < boardDim && uint8(shotY) < boardDim) {
                    if (asteroids[(uint8(shotY) * boardDim + uint8(shotX))] == true){
                        asteroidHit = true;
                    }
                    if (asteroidHit) {
                        break;
                    }
                    for (uint8 k = 0; k < players.length; k++) {
                        if (uint8(shotX) == positions[players[k]][0] && uint8(shotY) == positions[players[k]][1]) {
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

        // remove dead players
        if (deadPlayerCount > 0) {
            for (uint8 i = 0; i < deadPlayerCount; i++) {
                _removePlayer(deadPlayers[i]);
            }
        }

        // check for winner
        if (players.length == 1) {
            winner[0] = players[0];
            gameOver = true;
            emit gameOverEmit(winner);
            return;
        }

        // edge case for mutual kill on final turn
        if (players.length == 0) {
            gameOver = true;
            winner[0] = 0x0000000000000000000000000000000000000000;
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
            bool onAsteroid = true;
            uint8 newStar = uint8(TFHE.decrypt(TFHE.randEuint32()) % 144);
            while (onAsteroid) {
                if (asteroids[newStar] == true) {
                    newStar = uint8(TFHE.decrypt(TFHE.randEuint32()) % 144);
                } else {
                    onAsteroid = false;
                }
            }
            starLocation = newStar;
        }
    }
}