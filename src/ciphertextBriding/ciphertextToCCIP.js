import axios from 'axios';

// Function to send POST request with ciphertext
export const postCiphertext = async (ciphertext) => {
    try {
        const response = await axios.post('https://hyperlane-ccip.vercel.app/token', {
            ciphertext: ciphertext
        });
        return response.data;
        //returns hash that can be used to commit to Contract
    } catch (error) {
        console.error('Error posting ciphertext:', error);
        throw error;
    }
};

// Function to send GET request with hash
export const getCiphertextByHash = async (hash) => {
    try {
        const response = await axios.get('https://hyperlane-ccip.vercel.app/token', {
            params: {
                hash: hash
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error getting ciphertext by hash:', error);
        throw error;
    }
};

// Example usage
// const main = async () => {
//     //call API and commit hash to contract
//     const hash = await postCiphertext('CIPHERTEXT_HERE');
//     console.log('Hash:', hash);
// };