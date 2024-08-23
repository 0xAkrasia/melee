import { JsonRpcProvider, Contract } from "ethers";
import contractAbi from "../contracts/KBCBaseABI.json";
import contractAddresses from "../contracts/contractAddresses.json";

const kbcAddress = contractAddresses[0].KBCBase;

export const fetchEndTime = async () => {
  try {
    const provider = new JsonRpcProvider('https://ethereum-sepolia.rpc.subquery.network/public');
    const contract = new Contract(kbcAddress, contractAbi, provider);
    const endTimeFromContract = await contract.endTime();
    return Number(endTimeFromContract) * 1000; // Convert to milliseconds
  } catch (error) {
    console.error("Error fetching endTime:", error);
    throw error;
  }
};