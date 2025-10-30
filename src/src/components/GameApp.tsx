import { useCallback, useEffect, useMemo, useState } from 'react';
import { Contract } from 'ethers';
import { useAccount } from 'wagmi';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';

import { Header } from './Header';
import { MapGrid, type MapCell } from './MapGrid';
import { PlayerList, type DisplayPlayer } from './PlayerList';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../config/contracts';

import '../styles/GameApp.css';

const PUBLIC_RPC_URL = 'https://1rpc.io/sepolia';

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(PUBLIC_RPC_URL),
});

type PlayerEntry = {
  address: string;
  isEncrypted: boolean;
  encryptedPosition: `0x${string}`;
  publicPosition: number;
  isCurrentUser: boolean;
};

type MapBounds = {
  totalCells: number;
  encryptedCells: number;
};

function formatAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function GameApp() {
  const { address, isConnected } = useAccount();
  const signer = useEthersSigner();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();

  const [players, setPlayers] = useState<PlayerEntry[]>([]);
  const [mapBounds, setMapBounds] = useState<MapBounds>({ totalCells: 100, encryptedCells: 50 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txPending, setTxPending] = useState(false);
  const [decrypting, setDecrypting] = useState<string | null>(null);
  const [decryptedPositions, setDecryptedPositions] = useState<Record<string, number>>({});
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const lowerCaseUserAddress = address?.toLowerCase() ?? null;

  const loadPlayers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const boundsResponse = (await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getMapBounds',
      })) as [number, number] | readonly [number, number];

      const totalCells = Number(boundsResponse[0]);
      const encryptedCells = Number(boundsResponse[1]);
      setMapBounds({ totalCells, encryptedCells });

      const playerAddresses = (await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getAllPlayers',
      })) as readonly `0x${string}`[];

      const entries = await Promise.all(
        playerAddresses.map(async (playerAddress) => {
          const info = (await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'getPlayerInfo',
            args: [playerAddress],
          })) as [boolean, boolean, string, number];

          const [exists, isEncrypted, encryptedPositionRaw, publicPosition] = info;
          if (!exists) {
            return null;
          }

          return {
            address: playerAddress,
            isEncrypted,
            encryptedPosition: encryptedPositionRaw as `0x${string}`,
            publicPosition: Number(publicPosition),
            isCurrentUser: lowerCaseUserAddress === playerAddress.toLowerCase(),
          } as PlayerEntry;
        }),
      );

      const filteredEntries = entries.filter((entry): entry is PlayerEntry => Boolean(entry));
      setPlayers(filteredEntries);

      setDecryptedPositions((previous) => {
        const next: Record<string, number> = {};
        for (const entry of filteredEntries) {
          const key = entry.address.toLowerCase();
          if (typeof previous[key] === 'number') {
            next[key] = previous[key];
          }
        }
        return next;
      });

      setLastUpdated(Date.now());
    } catch (loadError) {
      console.error('Failed to load player data', loadError);
      setError('Unable to load game state. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [lowerCaseUserAddress]);

  useEffect(() => {
    void loadPlayers();
  }, [loadPlayers]);

  useEffect(() => {
    if (!lowerCaseUserAddress) {
      setDecryptedPositions({});
    }
  }, [lowerCaseUserAddress]);

  const playersWithDisplay = useMemo<DisplayPlayer[]>(() => {
    return players
      .map((entry) => {
        const override = decryptedPositions[entry.address.toLowerCase()];
        const displayPosition = entry.isEncrypted ? override ?? null : entry.publicPosition;
        return {
          ...entry,
          displayPosition,
        };
      })
      .sort((a, b) => {
        if (a.isCurrentUser === b.isCurrentUser) {
          return a.address.localeCompare(b.address);
        }
        return a.isCurrentUser ? -1 : 1;
      });
  }, [players, decryptedPositions]);

  const mapCells = useMemo<MapCell[]>(() => {
    const cells: MapCell[] = [];
    for (let id = 1; id <= mapBounds.totalCells; id += 1) {
      const zone = id <= mapBounds.encryptedCells ? 'encrypted' : 'public';
      const occupants = playersWithDisplay
        .filter((player) => player.displayPosition === id)
        .map((player) => ({
          address: player.address,
          label: formatAddress(player.address),
          isCurrentUser: player.isCurrentUser,
        }));

      cells.push({
        id,
        zone,
        occupants,
      });
    }
    return cells;
  }, [mapBounds, playersWithDisplay]);

  const encryptedCount = useMemo(
    () => playersWithDisplay.filter((player) => player.isEncrypted).length,
    [playersWithDisplay],
  );
  const publicCount = useMemo(
    () => playersWithDisplay.length - encryptedCount,
    [playersWithDisplay, encryptedCount],
  );

  const handleStartGame = useCallback(async () => {
    if (!isConnected) {
      setError('Connect your wallet to start the game.');
      return;
    }

    if (!signer) {
      setError('Wallet signer is not ready yet.');
      return;
    }

    setTxPending(true);
    setError(null);

    try {
      const resolvedSigner = await signer;
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, resolvedSigner);
      const tx = await contract.startGame();
      await tx.wait();

      await loadPlayers();
    } catch (startError) {
      console.error('Failed to start game', startError);
      setError('Transaction failed. Please ensure you are on Sepolia and try again.');
    } finally {
      setTxPending(false);
    }
  }, [isConnected, signer, loadPlayers]);

  const handleDecrypt = useCallback(
    async (player: DisplayPlayer) => {
      if (!instance) {
        setError('Encryption service is not ready yet.');
        return;
      }

      if (!signer) {
        setError('Wallet signer is not available.');
        return;
      }

      const resolvedSigner = await signer;
      const userAddress = (await resolvedSigner.getAddress()).toLowerCase();
      if (player.address.toLowerCase() !== userAddress) {
        setError('You can only decrypt your own position.');
        return;
      }

      setDecrypting(player.address);
      setError(null);

      try {
        const keypair = instance.generateKeypair();
        const contractAddresses = [CONTRACT_ADDRESS];
        const startTimestamp = Math.floor(Date.now() / 1000).toString();
        const durationDays = '7';

        const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimestamp, durationDays);

        const signature = await resolvedSigner.signTypedData(
          eip712.domain,
          {
            UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
          },
          eip712.message,
        );

        const handleContractPairs = [
          {
            handle: player.encryptedPosition,
            contractAddress: CONTRACT_ADDRESS,
          },
        ];

        const decrypted = await instance.userDecrypt(
          handleContractPairs,
          keypair.privateKey,
          keypair.publicKey,
          signature.replace('0x', ''),
          contractAddresses,
          userAddress,
          startTimestamp,
          durationDays,
        );

        const value = decrypted[player.encryptedPosition];
        if (typeof value === 'bigint') {
          const numericValue = Number(value);
          setDecryptedPositions((previous) => ({
            ...previous,
            [player.address.toLowerCase()]: numericValue,
          }));
        } else {
          throw new Error('Unexpected decrypted response');
        }
      } catch (decryptError) {
        console.error('Failed to decrypt position', decryptError);
        setError('Could not decrypt position. Please retry shortly.');
      } finally {
        setDecrypting(null);
      }
    },
    [instance, signer],
  );

  return (
    <div className="game-app">
      <Header />

      <main className="game-content">
        <section className="game-actions">
          <div className="game-actions__left">
            <h2 className="game-actions__title">Mission Control</h2>
            <p className="game-actions__subtitle">
              {isConnected
                ? 'Drop into the map or refresh positions to keep track of every explorer.'
                : 'Connect your wallet to join the map and reveal your landing zone.'}
            </p>
            <div className="game-actions__stats">
              <span>Total players: {playersWithDisplay.length}</span>
              <span>Encrypted agents: {encryptedCount}</span>
              <span>Public explorers: {publicCount}</span>
            </div>
            {lastUpdated && (
              <p className="game-actions__updated">
                Last updated: {new Date(lastUpdated).toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="game-actions__buttons">
            <button
              type="button"
              className="game-button game-button--primary"
              onClick={() => void handleStartGame()}
              disabled={!isConnected || txPending}
            >
              {txPending ? 'Assigning position…' : 'Start Game'}
            </button>
            <button
              type="button"
              className="game-button"
              onClick={() => void loadPlayers()}
              disabled={loading}
            >
              {loading ? 'Refreshing…' : 'Refresh Map'}
            </button>
            <div className="game-actions__service">
              <span
                className={`game-actions__service-indicator ${
                  zamaError ? 'is-error' : zamaLoading ? 'is-loading' : 'is-ready'
                }`}
              />
              <span>
                Encryption service:{' '}
                {zamaError ? 'error' : zamaLoading ? 'initializing…' : 'ready'}
              </span>
            </div>
          </div>
        </section>

        {error && <div className="game-alert game-alert--error">{error}</div>}
        {zamaError && <div className="game-alert game-alert--warning">{zamaError}</div>}

        <section className="game-layout">
          <MapGrid cells={mapCells} loading={loading} />
          <PlayerList
            players={playersWithDisplay}
            encryptedCount={encryptedCount}
            publicCount={publicCount}
            onDecrypt={handleDecrypt}
            decryptingAddress={decrypting}
            zamaReady={!zamaLoading && !zamaError}
            loading={loading}
          />
        </section>
      </main>
    </div>
  );
}
