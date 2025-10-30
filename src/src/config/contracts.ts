import type { Abi } from 'viem';

export const CONTRACT_ADDRESS = '0xB7da498FF10137815Cd7aC237c26A586f3460B1B';

export const CONTRACT_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "isEncrypted",
        "type": "bool"
      }
    ],
    "name": "PlayerPositionAssigned",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "getAllPlayers",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "players",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getMapBounds",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "totalCells",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "encryptedCells",
        "type": "uint8"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "player",
        "type": "address"
      }
    ],
    "name": "getPlayerInfo",
    "outputs": [
      {
        "internalType": "bool",
        "name": "exists",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "isEncrypted",
        "type": "bool"
      },
      {
        "internalType": "euint8",
        "name": "encryptedPosition",
        "type": "bytes32"
      },
      {
        "internalType": "uint8",
        "name": "publicPosition",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "player",
        "type": "address"
      }
    ],
    "name": "hasPlayer",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "playerCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "protocolId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "startGame",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const satisfies Abi;
