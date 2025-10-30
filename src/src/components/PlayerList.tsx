import '../styles/PlayerList.css';

export type DisplayPlayer = {
  address: string;
  isEncrypted: boolean;
  encryptedPosition: `0x${string}`;
  publicPosition: number;
  isCurrentUser: boolean;
  displayPosition: number | null;
};

type PlayerListProps = {
  players: DisplayPlayer[];
  encryptedCount: number;
  publicCount: number;
  onDecrypt: (player: DisplayPlayer) => void;
  decryptingAddress: string | null;
  zamaReady: boolean;
  loading: boolean;
};

function truncate(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function PlayerList({
  players,
  encryptedCount,
  publicCount,
  onDecrypt,
  decryptingAddress,
  zamaReady,
  loading,
}: PlayerListProps) {
  return (
    <section className="player-list">
      <div className="player-list__header">
        <div>
          <h2 className="player-list__title">Player Intelligence</h2>
          <p className="player-list__subtitle">
            Encrypted agents stay hidden until they decrypt their coordinates.
          </p>
        </div>
        <div className="player-list__summary">
          <span>{encryptedCount} encrypted</span>
          <span>{publicCount} public</span>
        </div>
      </div>

      {loading && !players.length ? (
        <div className="player-list__empty">Loading player data…</div>
      ) : players.length === 0 ? (
        <div className="player-list__empty">
          No players have joined yet. Be the first to drop in.
        </div>
      ) : (
        <ul className="player-list__items">
          {players.map((player) => {
            const isDecrypting = decryptingAddress === player.address;
            const canDecrypt = player.isCurrentUser && player.isEncrypted;
            const status = player.isEncrypted
              ? player.displayPosition !== null
                ? `Decrypted cell #${player.displayPosition}`
                : 'Encrypted zone'
              : `Public cell #${player.publicPosition}`;

            return (
              <li key={player.address} className="player-card">
                <div className="player-card__row">
                  <div>
                    <p className="player-card__address">{truncate(player.address)}</p>
                    <div className="player-card__tags">
                      <span
                        className={`player-card__tag ${player.isEncrypted ? 'player-card__tag--encrypted' : 'player-card__tag--public'}`}
                      >
                        {player.isEncrypted ? 'Encrypted' : 'Public'}
                      </span>
                      {player.isCurrentUser && <span className="player-card__tag player-card__tag--self">You</span>}
                    </div>
                  </div>
                  <p className="player-card__status">{status}</p>
                </div>

                <div className="player-card__footer">
                  <div className="player-card__cipher">
                    <span className="player-card__label">Ciphertext</span>
                    <code className="player-card__cipher-text">{player.encryptedPosition}</code>
                  </div>
                  {canDecrypt && (
                    <button
                      type="button"
                      className="player-card__decrypt"
                      onClick={() => onDecrypt(player)}
                      disabled={isDecrypting || !zamaReady}
                    >
                      {isDecrypting ? 'Decrypting…' : 'Decrypt my position'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
