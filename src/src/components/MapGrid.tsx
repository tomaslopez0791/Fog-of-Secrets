import '../styles/MapGrid.css';

export type MapCell = {
  id: number;
  zone: 'encrypted' | 'public';
  occupants: Array<{
    address: string;
    label: string;
    isCurrentUser: boolean;
  }>;
};

type MapGridProps = {
  cells: MapCell[];
  loading: boolean;
};

export function MapGrid({ cells, loading }: MapGridProps) {
  return (
    <section className="map-grid">
      <div className="map-grid__header">
        <div>
          <h2 className="map-grid__title">Map Overview</h2>
          <p className="map-grid__subtitle">
            Cells 1‒50 are encrypted. Cells 51‒100 are public.
          </p>
        </div>
        <div className="map-grid__legend">
          <span className="map-grid__legend-item map-grid__legend-item--encrypted">Encrypted zone</span>
          <span className="map-grid__legend-item map-grid__legend-item--public">Public zone</span>
        </div>
      </div>

      <div className="map-grid__board">
        {cells.map((cell) => (
          <div
            key={cell.id}
            className={`map-grid__cell map-grid__cell--${cell.zone} ${
              cell.occupants.length ? 'map-grid__cell--occupied' : ''
            }`}
          >
            <div className="map-grid__cell-id">{cell.id}</div>
            {cell.occupants.length > 0 ? (
              <div className="map-grid__occupants">
                {cell.occupants.slice(0, 2).map((occupant) => (
                  <span
                    key={occupant.address}
                    className={`map-grid__occupant ${
                      occupant.isCurrentUser ? 'map-grid__occupant--self' : ''
                    }`}
                  >
                    {occupant.label}
                  </span>
                ))}
                {cell.occupants.length > 2 && (
                  <span className="map-grid__occupant map-grid__occupant--extra">
                    +{cell.occupants.length - 2}
                  </span>
                )}
              </div>
            ) : (
              <span className="map-grid__empty">
                {cell.zone === 'encrypted' ? 'Encrypted' : 'Open'}
              </span>
            )}
          </div>
        ))}
      </div>

      {loading && <div className="map-grid__loading">Updating map…</div>}
    </section>
  );
}
