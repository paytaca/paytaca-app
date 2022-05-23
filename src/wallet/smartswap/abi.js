/**
 * Only contains abi that's used by the app
 * Full abi found here:
 * https://gist.github.com/khirvy019/8d19a98f60cf1ec8bf20558585fdecb8
*/
export default [
  {
    "constant": true,
    "inputs": [
      { "internalType": "contract IERC20", "name": "fromToken", "type": "address" },
      { "internalType": "contract IERC20", "name": "destToken", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "uint256", "name": "parts", "type": "uint256" },
      { "internalType": "uint256", "name": "flags", "type": "uint256" },
      { "internalType": "uint256", "name": "destTokenEthPriceTimesGasPrice", "type": "uint256" }
    ],
    "name": "getExpectedReturnWithGas",
    "outputs": [
      { "internalType": "uint256", "name": "returnAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "estimateGasAmount", "type": "uint256" },
      { "internalType": "uint256[]", "name": "distribution", "type": "uint256[]" }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      { "internalType": "contract IERC20", "name": "fromToken", "type": "address" },
      { "internalType": "contract IERC20", "name": "destToken", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "uint256", "name": "minReturn", "type": "uint256" },
      { "internalType": "uint256[]", "name": "distribution", "type": "uint256[]" },
      { "internalType": "uint256", "name": "flags", "type": "uint256" },
      { "internalType": "uint256", "name": "deadline", "type": "uint256" },
      { "internalType": "uint256", "name": "feePercent", "type": "uint256" }
    ],
    "name": "swap",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "payable": true,
    "stateMutability": "payable",
    "type": "function"
  },
]