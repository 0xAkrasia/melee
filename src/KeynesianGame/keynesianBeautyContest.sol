// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.19;

import "fhevm/lib/TFHE.sol";
import "fhevm/abstracts/EIP712WithModifier.sol";

contract KeynsianBeautyContest is EIP712WithModifier {
    address public owner;
    mapping(address => bool) public hasVoted;
    mapping(address => euint32) private encryptedVotes;
    mapping(address => uint32) public decryptedVotes;
    bool public gameOver;
    euint32[8] private candidates;
    uint32 public nCandidates;
    uint32 public targetTotal;
    uint32[8] public finalScores;
    uint32[8] public winningOrder;
    uint32 public winningScore;
    address[] public winners;
    mapping(address => bool) public winChecked;
    mapping(address => uint256) public betValue;

    constructor() EIP712WithModifier("Authorization token", "1") {
        // contract is EIP712 to allow reencrypts
        owner = msg.sender;
        gameOver = false;
        winningScore = 0;
        nCandidates = 8;
        targetTotal = (nCandidates * (nCandidates - 1)) / 2;
    }

    modifier onlyOwner {
        require(msg.sender == owner, "Only Owner");
        _;
    }

    modifier gameEnded {
        require(gameOver, "The game is not over");
        _;
    }

    modifier gameLive {
        require(!gameOver, "the game is over");
        _;
    }

    receive() external payable {
    }

    function castVote(bytes calldata vote) gameLive public payable {
        require(!hasVoted[msg.sender], "player already voted");
        require(msg.value >= 0.01 ether, "send at least 0.01 ETH to enter");
        betValue[msg.sender] = msg.value;
        euint32 encryptedVote = TFHE.asEuint32(vote);

        euint32 runningTotal = TFHE.asEuint32(0);
        for (uint32 i = 0; i < nCandidates; i++) {
            euint32 pts = TFHE.rem(TFHE.div(encryptedVote, nCandidates**i), nCandidates);
            candidates[i] = TFHE.add(candidates[i], pts);
            runningTotal = TFHE.add(runningTotal, pts);
        }

        TFHE.optReq(TFHE.eq(runningTotal, targetTotal));
        encryptedVotes[msg.sender] = encryptedVote;
        hasVoted[msg.sender] = true;
    }

    // function revealResult() public onlyOwner gameLive {
    //     gameOver = true;

    //     for (uint i = 0; i < nCandidates; i++) {
    //         finalScores[i] = TFHE.decrypt(candidates[i]);
    //     }

    //     winningOrder = _bubbleSortWithIndices(finalScores);
    // }

    // function _bubbleSortWithIndices(uint32[8] memory arr) internal pure returns (uint32[8] memory) {
    //     uint length = arr.length;

    //     uint32[8] memory indices;
    //     for (uint32 i = 0; i < length; i++) {
    //         indices[i] = i;
    //     }

    //     for (uint32 i = 0; i < length - 1; i++) {
    //         bool swapped = false;
    //         for (uint32 j = 0; j < length - i - 1; j++) {
    //             if (arr[j] < arr[j + 1]) {
    //                 // Swap the values
    //                 (arr[j], arr[j + 1]) = (arr[j + 1], arr[j]);
    //                 // Swap the indices
    //                 (indices[j], indices[j + 1]) = (indices[j + 1], indices[j]);
    //                 swapped = true;
    //             }
    //         }
    //         // If no two elements were swapped by inner loop, then break
    //         if (!swapped) {
    //             break;
    //         }
    //     }
    //     return indices;
    // }

    function revealResult() public onlyOwner gameLive {
        gameOver = true;

        for (uint i = 0; i < nCandidates; i++) {
            finalScores[i] = TFHE.decrypt(candidates[i]);
        }
    }

    function bubbleSortWithIndices() public onlyOwner gameEnded {

        uint32[8] memory arr;
        uint32[8] memory indices;
        
        for (uint32 i = 0; i < nCandidates; i++) {
            arr[i] = finalScores[i];
            indices[i] = i;
        }

        for (uint32 i = 0; i < nCandidates - 1; i++) {
            bool swapped = false;
            for (uint32 j = 0; j < nCandidates - i - 1; j++) {
                if (arr[j] < arr[j + 1]) {
                    // Swap the values
                    (arr[j], arr[j + 1]) = (arr[j + 1], arr[j]);
                    // Swap the indices
                    (indices[j], indices[j + 1]) = (indices[j + 1], indices[j]);
                    swapped = true;
                }
            }
            // If no two elements were swapped by inner loop, then break
            if (!swapped) {
                break;
            }
        }
        winningOrder = indices;
    }

    function winCheck(address player) public gameEnded {
        require(hasVoted[player], "player didn't voted");
        require(winChecked[player] == false, "win has already been checked");
        winChecked[player] = true;

        uint32 playerVote = TFHE.decrypt(encryptedVotes[player]);

        uint32 score = 0;
        for (uint32 i = 0; i < nCandidates; i++) {
            // scoring formula: ((nCan-acc)^2)*(nCan-ABS(acc-enty))
            uint32 entry = (playerVote / (nCandidates**i)) % nCandidates;
            uint32 actual = winningOrder[i];
            uint32 diff = entry > actual ? entry - actual : actual - entry;
            score += (nCandidates - actual)**2 * (nCandidates - diff);
        }

        if (score > winningScore) {
            delete winners;
            winningScore = score;
            winners.push(msg.sender);
        } else if (score == winningScore) {
            winners.push(msg.sender);
        }
    }

    function payWinners() public onlyOwner gameEnded {
        // transfer payment to winner and pay Melee 3% house rake
        require(winners.length > 0, "No winners to pay");
        payable(owner).transfer(address(this).balance * 3 / 100);

        uint256 winnersBets = 0;
        for (uint256 i = 0; i < winners.length; i++) {
            winnersBets += betValue[winners[i]];
        }

        uint256 prize = address(this).balance;
        for (uint256 i = 0; i < winners.length; i++) {
            uint256 winAmount = prize * betValue[winners[i]] / winnersBets;
            payable(winners[i]).transfer(winAmount);
        }
    }

    function viewOwnVote(bytes32 publicKey, bytes calldata signature) public view onlySignedPublicKey(publicKey, signature) returns (bytes memory) {
        // allow players to view their own vote while the game is ongoing
        return TFHE.reencrypt(encryptedVotes[msg.sender], publicKey);
    }

    function viewAnyVote(bytes32 publicKey, bytes calldata signature, address player) public view gameEnded onlySignedPublicKey(publicKey, signature) returns (bytes memory) {
        // allow players to view any vote after the game has ended
        return TFHE.reencrypt(encryptedVotes[player], publicKey);
    }

    function decryptAnyVote(address player) public gameEnded {
        // decrypt any vote after the game has ended
        decryptedVotes[player] = TFHE.decrypt(encryptedVotes[player]);
    }
}