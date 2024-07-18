// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import { IMailbox } from "@hyperlane-xyz/core/contracts/interfaces/IMailbox.sol";
import { IInterchainSecurityModule } from "@hyperlane-xyz/core/contracts/interfaces/IInterchainSecurityModule.sol";
import { Address } from "@openzeppelin/contracts/utils/Address.sol";

contract KBCSepolia {
    // GAME VARS
    mapping(address => bool) public hasVotedBase;
    bool public gameOver;
    uint32 public winningScore;
    address[] public winners;
    mapping(address => bool) public winChecked;
    mapping(address => uint256) public betValue;
    uint256 public winnersBets;
    address public owner;

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
        gameOver = false;
        winningScore = 0;
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
        require(msg.sender == ISM, "Only mailbox can call this function");
        _;
    }

    function setRecipient(address _recipient) public onlyOwner {
        recipient = _recipient; //contract address on Inco
    }

    receive() external payable {
        //set up to receive donations to the pot
    }

    function castVote(bytes calldata vote) external payable gameLive returns (bytes32) {
        // Send player vote as ciphertext to KBCInco
        // verify valid entry
        require(!hasVotedBase[msg.sender], "player already voted");
        require(msg.value >= 0.01 ether, "send at least 0.01 ETH to enter");
        betValue[msg.sender] = msg.value;
        hasVotedBase[msg.sender] = true;

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

    function _addressToBytes32(address _addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(_addr)));
    }

    function endGame() public onlyOwner gameLive {
        gameOver = true;
    }

    function handle(uint32 _origin, bytes32 _sender, bytes memory _message) external payable gameEnded onlyMailbox {
        // handle bridged winning players and scores from KBCInco contract
        (address player, uint32 score) = abi.decode(_message, (address, uint32));

        require(hasVotedBase[player], "player didn't vote");
        require(winChecked[player] == false, "win has already been checked");
        winChecked[player] = true;

        // check if a player has the winning score, if so add player address to the 'winners' array
        if (score > winningScore) {
            delete winners;
            winningScore = score;
            winners.push(player);
            winnersBets = betValue[player];
        } else if (score == winningScore) {
            winners.push(player);
            winnersBets += betValue[player];
        }
    }

    function payWinners() public onlyOwner gameEnded {
        // transfer payment to winner and pay Melee 3% house rake
        require(winners.length > 0, "No winners to pay");
        payable(owner).transfer((address(this).balance * 3) / 100);

        uint256 prize = address(this).balance;
        for (uint256 i = 0; i < winners.length; i++) {
            uint256 winAmount = (prize * betValue[winners[i]]) / winnersBets;
            payable(winners[i]).transfer(winAmount);
        }
    }
}
