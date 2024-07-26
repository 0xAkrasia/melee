// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import { IMailbox } from "@hyperlane-xyz/core/contracts/interfaces/IMailbox.sol";
import { IInterchainSecurityModule } from "@hyperlane-xyz/core/contracts/interfaces/IInterchainSecurityModule.sol";
import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import "fhevm/lib/TFHE.sol";
import "fhevm/abstracts/EIP712WithModifier.sol";

contract KBCInco is EIP712WithModifier {
    // BRIDGE VARS
    IInterchainSecurityModule public interchainSecurityModule;
    address public mailbox;
    address public ISM;
    address public recipient;
    uint32 public DomainID = 11155111;

    // GAME VARS
    address public owner;
    mapping(address => euint32) private encryptedVotes;
    mapping(address => uint32) public decryptedVotes;
    bool public gameOver;
    euint32[8] private candidates;
    uint32 public nCandidates;
    uint32 public targetTotal;
    uint32[8] public finalScores;
    mapping(uint32 => uint32) public winningMap;
    uint32 public winningScore;
    uint256 public endTime;

    event handled(bytes32 hash);

    constructor() EIP712WithModifier("Authorization token", "1") {
        // contract is EIP712 to allow reencrypts

        // GAME VARS
        owner = msg.sender;
        gameOver = false;
        endTime = block.timestamp + 48 hours;
        winningScore = 0; // set to zero to initiate winning score search algo
        nCandidates = 8;
        targetTotal = (nCandidates * (nCandidates - 1)) / 2; // target sum of total entry points (8+7+6...)

        // BRIDGE VARS
        mailbox = 0x51510C9df44256FE61f391286F81E52A708919db;
        ISM = 0xcAe8bD09aE9Ac21da7d1e189b5F7376aeCc82497;
        interchainSecurityModule = IInterchainSecurityModule(ISM);
    }

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only Owner");
        _;
    }

    modifier gameEnded() {
        require(gameOver, "The game is not over");
        _;
    }

    modifier gameLive() {
        require(!gameOver, "the game is over");
        _;
    }

    modifier onlyMailbox() {
        require(msg.sender == mailbox, "Only mailbox can call this function");
        _;
    }

    modifier onlyISM() {
        require(msg.sender == ISM, "Only mailbox can call this function");
        _;
    }

    function setRecipient(address _recipient) public onlyOwner {
        recipient = _recipient; //contract address on Sepolia
    }

    //no-op function but called by mailbox pos verification so keep
    function handle(uint32 _origin, bytes32 _sender, bytes memory _body) external onlyMailbox {
        bytes32 committedHash = abi.decode(_body, (bytes32));
        emit handled(committedHash);
    }

    function handleWithCiphertext(uint32 _origin, bytes32 _sender, bytes memory _message) external onlyISM {
        // receive data
        (bytes memory message, bytes memory cipherVote) = abi.decode(_message, (bytes, bytes));
        (bytes32 committedHash, address sepSender) = abi.decode(message, (bytes32, address));

        // add player votes to candidate totals to update scores
        euint32 encryptedVote = TFHE.asEuint32(cipherVote);

        euint32 runningTotal = TFHE.asEuint32(0);
        for (uint32 i = 0; i < nCandidates; i++) {
            euint32 pts = TFHE.rem(TFHE.div(encryptedVote, nCandidates ** i), nCandidates);
            candidates[i] = TFHE.add(candidates[i], pts);
            runningTotal = TFHE.add(runningTotal, pts);
        }

        TFHE.optReq(TFHE.eq(runningTotal, targetTotal));
        encryptedVotes[sepSender] = encryptedVote;

        if (block.timestamp >= endTime) {
            gameOver = true;
        }
    }

    function revealResult() public gameLive {
        // end the game and reveal results
        require(block.timestamp >= endTime, "The game has not ended");
        gameOver = true;

        for (uint32 i = 0; i < nCandidates; i++) {
            finalScores[i] = TFHE.decrypt(candidates[i]);
        }
    }

    function revealWinningMapping() public gameEnded {
        // call after revealResult (separated to split gas fees)
        // sort in ascending order and make mapping to account for ties
        uint32[8] memory winningOrder = _bubbleSortWithIndices(finalScores);

        for (uint32 i = 0; i < nCandidates; i++) {
            uint32 index = winningOrder[i];
            if (i == 0) {
                winningMap[index] = 0;
            } else {
                if (finalScores[index] == finalScores[winningOrder[i - 1]]) {
                    winningMap[index] = winningMap[winningOrder[i - 1]];
                } else {
                    winningMap[index] = i;
                }
            }
        }
    }

    function _bubbleSortWithIndices(uint32[8] memory arr) internal pure returns (uint32[8] memory) {
        uint length = arr.length;

        uint32[8] memory indices;
        for (uint32 i = 0; i < length; i++) {
            indices[i] = i;
        }

        for (uint32 i = 0; i < length - 1; i++) {
            bool swapped = false;
            for (uint32 j = 0; j < length - i - 1; j++) {
                // sort in ascending order
                if (arr[j] > arr[j + 1]) {
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
        return indices;
    }

    function winCheck(address player) public gameEnded {
        // check if a player has the highest score
        require(decryptedVotes[player] != 0, "decrypt vote first");

        uint32 playerVote = decryptedVotes[player];

        bool[8] memory entryFound;
        bool validEntry = true;
        uint32 score = 0;

        for (uint32 i = 0; i < nCandidates; i++) {
            // scoring formula: (nCan-actual)*(nCan-ABS(actual-enty))
            uint32 entry = (playerVote / (nCandidates ** i)) % nCandidates;
            uint32 actual = winningMap[i];
            uint32 diff = entry > actual ? entry - actual : actual - entry;
            score += (nCandidates - actual) * (nCandidates - diff);

            // check that each player votes for each candidate once
            validEntry = validEntry && !entryFound[entry];
            entryFound[entry] = true;
        }

        require(validEntry, "invalid player entry");

        // If a player has the winning score then bridge info
        if (score >= winningScore) {
            winningScore = score;
            IMailbox(mailbox).dispatch(
                DomainID,
                bytes32(uint256(uint160(recipient))),
                abi.encode(player, winningScore)
            );
        }
    }

    function viewOwnVote(
        bytes32 publicKey,
        bytes calldata signature
    ) public view onlySignedPublicKey(publicKey, signature) returns (bytes memory) {
        // allow players to view their own vote while the game is ongoing
        return TFHE.reencrypt(encryptedVotes[msg.sender], publicKey);
    }

    function viewAnyVote(
        bytes32 publicKey,
        bytes calldata signature,
        address player
    ) public view gameEnded onlySignedPublicKey(publicKey, signature) returns (bytes memory) {
        // allow players to view any vote after the game has ended
        return TFHE.reencrypt(encryptedVotes[player], publicKey);
    }

    function decryptVote(address player) public gameEnded {
        // decrypt any vote after the game has ended
        decryptedVotes[player] = TFHE.decrypt(encryptedVotes[player]);
    }
}