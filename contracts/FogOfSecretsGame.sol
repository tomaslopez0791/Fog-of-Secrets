// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint8} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {SepoliaZamaOracleAddress} from "@zama-fhe/oracle-solidity/address/ZamaOracleAddress.sol";

/// @title FogOfSecretsGame
/// @notice Map-based game where players receive either private or public positions using FHE.
contract FogOfSecretsGame is SepoliaConfig {
    struct PlayerInfo {
        bool exists;
        bool isEncrypted;
        euint8 encryptedPosition;
        uint8 publicPosition;
    }

    uint8 private constant MAP_CELLS = 100;
    uint8 private constant ENCRYPTED_LIMIT = 50;

    mapping(address => PlayerInfo) private _players;
    address[] private _playerAddresses;
    uint256 private _assignmentNonce;

    event PlayerPositionAssigned(address indexed player, bool isEncrypted);

    /// @notice Returns every player that has joined the game.
    /// @return players List of player addresses
    function getAllPlayers() external view returns (address[] memory players) {
        players = _playerAddresses;
    }

    /// @notice Returns total number of players.
    function playerCount() external view returns (uint256) {
        return _playerAddresses.length;
    }

    /// @notice Returns detailed information about a player's location.
    /// @param player The address of the player
    /// @return exists Whether the player has joined
    /// @return isEncrypted Whether the player's position is private
    /// @return encryptedPosition The encrypted position (bytes32(0) if not assigned)
    /// @return publicPosition The clear text position when public, zero otherwise
    function getPlayerInfo(
        address player
    )
        external
        view
        returns (bool exists, bool isEncrypted, euint8 encryptedPosition, uint8 publicPosition)
    {
        PlayerInfo storage info = _players[player];
        return (info.exists, info.isEncrypted, info.encryptedPosition, info.publicPosition);
    }

    /// @notice Returns game configuration constants.
    function getMapBounds() external pure returns (uint8 totalCells, uint8 encryptedCells) {
        return (MAP_CELLS, ENCRYPTED_LIMIT);
    }

    /// @notice Starts the game for the sender and assigns a random position.
    /// @dev Repeated calls will update the player's current position.
    function startGame() external {
        (PlayerInfo storage info, bool isNewPlayer) = _getOrCreatePlayer(msg.sender);

        uint8 position = _drawCell(msg.sender);
        euint8 encryptedPosition = FHE.asEuint8(position);

        FHE.allowThis(encryptedPosition);

        if (position <= ENCRYPTED_LIMIT) {
            info.isEncrypted = true;
            info.publicPosition = 0;
            info.encryptedPosition = encryptedPosition;

            FHE.allow(encryptedPosition, msg.sender);
        } else {
            info.isEncrypted = false;
            info.publicPosition = position;
            info.encryptedPosition = encryptedPosition;

            FHE.allow(encryptedPosition, SepoliaZamaOracleAddress);
            FHE.allow(encryptedPosition, msg.sender);
        }

        if (isNewPlayer) {
            _playerAddresses.push(msg.sender);
        }

        emit PlayerPositionAssigned(msg.sender, info.isEncrypted);
    }

    /// @notice Checks whether a player has already joined the game.
    function hasPlayer(address player) external view returns (bool) {
        return _players[player].exists;
    }

    function _getOrCreatePlayer(address player) private returns (PlayerInfo storage, bool) {
        PlayerInfo storage info = _players[player];
        bool isNewPlayer = !info.exists;

        if (isNewPlayer) {
            info.exists = true;
        }

        return (info, isNewPlayer);
    }

    function _drawCell(address player) private returns (uint8) {
        _assignmentNonce++;
        bytes32 prevHash = blockhash(block.number - 1);
        uint256 entropy = uint256(block.prevrandao);
        if (entropy == 0) {
            entropy = uint256(prevHash);
        }
        uint256 randomValue = uint256(keccak256(abi.encode(block.timestamp, entropy, player, _assignmentNonce)));
        uint8 cell = uint8((randomValue % MAP_CELLS) + 1);
        return cell;
    }
}
