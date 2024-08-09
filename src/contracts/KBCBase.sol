// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import { IMailbox } from "@hyperlane-xyz/core/contracts/interfaces/IMailbox.sol";
import { IInterchainSecurityModule } from "@hyperlane-xyz/core/contracts/interfaces/IInterchainSecurityModule.sol";

contract KBCBase {
    // GAME VARS
    bool public gameOver;
    uint32 public highScore;
    mapping(address => uint32) public scores;
    mapping(address => bool) public winChecked;
    mapping(address => bool) public hasClaimed;
    mapping(address => uint256) public betValue;
    uint256 public winnersBets;
    uint256 public winnersPrize;
    address public owner;
    uint256 public endTime;

    // BRIDGE VARS
    IInterchainSecurityModule public interchainSecurityModule;
    address public mailbox;
    address public ISM;
    address public recipient;
    uint32 public DomainID = 9090;

    event hashedCiphertext(bytes32 _hash);
    event handled(address incoSender);

    constructor() {
        mailbox = 0xfFAEF09B3cd11D9b20d1a19bECca54EEC2884766;
        ISM = 0xcE87DC19a0497120c8db474FCE082b02239A6Da3;
        interchainSecurityModule = IInterchainSecurityModule(ISM);
        owner = msg.sender;
        endTime = block.timestamp + 20 minutes;
        gameOver = false;
        highScore = 0;
        winnersBets = 0;
    }

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
        require(msg.sender == ISM, "Only ISM can call this function");
        _;
    }

    function setRecipient(address _recipient) public onlyOwner {
        recipient = _recipient; //contract address on Inco
    }

    receive() external payable {
        //set up to receive donations to the pot
    }

    function _addressToBytes32(address _addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(_addr)));
    }

    function _bytes32ToAddress(bytes32 _byteAddr) internal pure returns (address) {
        return address(uint160(uint256(_byteAddr)));
    }
    
    function castVote(bytes calldata vote) external payable gameLive returns (bytes32) {
        // Send player vote as ciphertext to KBCInco
        // verify valid entry
        betValue[msg.sender] += msg.value;
        require(betValue[msg.sender] >= 0.001 ether, "send at least 0.001 ETH to enter");

        //check if game is over
        if (block.timestamp >= endTime) {
            gameOver = true;
        }

        //send vote with player address to KBCInco
        bytes32 _hash = keccak256(vote);
        uint256 quote = IMailbox(mailbox).quoteDispatch(
            DomainID,
            _addressToBytes32(recipient),
            abi.encode(_hash, msg.sender)
        );
        IMailbox(mailbox).dispatch{ value: quote }(
            DomainID,
            _addressToBytes32(recipient),
            abi.encode(_hash, msg.sender)
        );
        emit hashedCiphertext(_hash);
        return _hash;
    }

    function endGame() public gameLive {
        // fallback if player submission does not end game
        require(block.timestamp >= endTime, "Cannot end the game before endTime");
        gameOver = true;
    }

    function handle(uint32 _origin, bytes32 _sender, bytes calldata _message) external onlyMailbox {
        require(_origin == DomainID, "Invalid origin");
        require(_bytes32ToAddress(_sender) == recipient, "Invalid sender");
        
        // handle bridged winning players and scores from KBCInco contract
        (uint8 handler, bytes memory playerInfo) = abi.decode(_message, (uint8, bytes));
        (address player, uint32 score) = abi.decode(playerInfo, (address, uint32));

        require(winChecked[player] == false, "win has already been checked");
        winChecked[player] = true;

        // check if a player has the winning score, if so add player address to the 'winners' array
        scores[player] = score;
        if (score > highScore) {
            highScore = score;
            winnersBets = betValue[player];
        } else if (score == highScore) {
            winnersBets += betValue[player];
        }
    }

    function calculateWinnings() public gameEnded {
        require(winnersPrize == 0, "House cut already taken");
        
        uint256 totalPrize = address(this).balance;
        uint256 houseFee = (totalPrize * 4) / 100;
        winnersPrize = totalPrize - houseFee;

        payable(owner).transfer(houseFee);
    }

    function claimWinnings(address[] memory winners) public gameEnded {
        require(block.timestamp >= endTime + 20 minutes, "Winnings are not pushable yet");
        require(highScore > 0, "No winners determined yet");
        require(winnersPrize > 0, "Winnings have not been calculated");

        for (uint i = 0; i < winners.length; i++) {
            address winner = winners[i];
            require(scores[winner] == highScore, "Address is not a winner");
            require(!hasClaimed[winner], "Winner has already claimed");

            uint256 winAmount = (winnersPrize * betValue[winner]) / winnersBets;
            require(winAmount > 0, "No winnings to push for this winner");

            hasClaimed[winner] = true;
            payable(winner).transfer(winAmount);
        }
    }

    function failSafe() public onlyOwner gameEnded {
        // failsafe function to claim the remaining balance after the game is over and claim window is closed
        // this ensures funds can be returned to users in the event of bridge or other issues
        require(block.timestamp >= endTime + 20 minutes, "Failsafe is not allowed yet");
        payable(owner).transfer(address(this).balance);
    }
}