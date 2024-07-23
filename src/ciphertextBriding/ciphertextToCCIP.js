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
        const response = await axios.post('/api/token', {
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
        const response = await axios.get('/api/token', {
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
// const main = async () => {
//     //call API and commit hash to contract
//     const hash = await postCiphertext('CIPHERTEXT_HERE');
//     console.log('Hash:', hash);
// };