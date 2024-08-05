import axios from 'axios';

const uint8ArrayToHex = (uint8Array) => {
    return Array.from(uint8Array)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  };

// Function to send POST request with ciphertext
export const postCiphertext = async (ciphertext) => {
    try {
        const hexCiphertext = '0x' + uint8ArrayToHex(ciphertext);
        const response = await axios.post('https://hyperlane-ccip.vercel.app/token', {
            ciphertext: hexCiphertext
        });
        return response.data;
        //returns hash that can be used to commit to Contract
    } catch (error) {
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
        throw error;
    }
};

// Example usage
const main = async () => {
    //call API and commit hash to contract
    // const hash = await postCiphertext('CIPHERTEXT_HERE');
    const ciphertext = await getCiphertextByHash('0x6dadd2d37f8b983def131b83612eb865a7fb131c0f604e29e5364c706d4c62ca');
    console.log('Ciphertext:', ciphertext);
};

main();