// Controls component that receives functions as props
function Controls({ onReveal, onAttack }) {
    return (
        <>
            <button onClick={onReveal}>Reveal</button>
            <button onClick={onAttack}>Attack</button>
        </>
    );
}

// The parent component where state is managed and which renders the Controls.
class GameComponent extends React.Component {
    state = {
        // ... your state properties
    };

    handleReveal = async () => {
        if (!this.props.walletProvider) {
            console.error('Wallet provider is not available.');
            return;
        }

        const provider = this.props.walletProvider;
        const signer = await provider.getSigner();

        // Replace with your contract address
        const gameContract = new Contract(contractAddress, starFighterAbi, signer);

        try {
            // Call the revealMoves() method on the contract
            const revealTransaction = await gameContract.revealMoves();

            console.log('Reveal transaction sent: ', revealTransaction.hash);

            // Wait for the transaction to be mined
            const receipt = await revealTransaction.wait();
            console.log('Transaction confirmed in block: ', receipt.blockNumber);

            // Reload the game data after the reveal to update the UI
            await this.loadContractData();

        } catch (error) {
            console.error('Error sending reveal transaction: ', error);
        }
    }

    handleAttack = async () => {
        if (!this.props.walletProvider) {
            console.error('Wallet provider is not available.');
            return;
        }

        const provider = this.props.walletProvider;
        const signer = await provider.getSigner();

        const gameContract = new Contract(contractAddress, starFighterAbi, signer);

        try {
            // Call the attack() method on the contract
            const attackTransaction = await gameContract.attack();

            console.log('attack transaction sent: ', attackTransaction.hash);

            // Wait for the transaction to be mined
            const receipt = await attackTransaction.wait();
            console.log('Transaction confirmed in block: ', receipt.blockNumber);

            // Reload the game data after the attack to update the UI
            await this.loadContractData();

        } catch (error) {
            console.error('Error sending attach transaction: ', error);
        }
    }

    render() {
        return (
            <div>
                {/* Other components and markup */}
                <Controls onReveal={this.handleReveal} onAttack={this.handleAttack} />
            </div>
        );
    }
}

export default GameComponent;