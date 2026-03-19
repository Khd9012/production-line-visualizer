import type { PalletLayer } from "../types";

type PalletStackPanelProps = {
  layers: PalletLayer[];
};

export function PalletStackPanel({ layers }: PalletStackPanelProps) {
  return (
    <section className="panel stack-panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Pallet Build</p>
          <h3>Layer Stack</h3>
        </div>
        <span className="panel__pill">3 x 3 recipe</span>
      </div>

      <div className="layer-list">
        {layers
          .slice()
          .reverse()
          .map((layer) => (
            <article key={layer.layer} className="layer-card">
              <div className="layer-card__header">
                <strong>Layer {layer.layer}</strong>
                <span>
                  {layer.filledCount}/{layer.totalCount}
                </span>
              </div>
              <div className="pallet-grid">
                {layer.cells.map((cell) => (
                  <div
                    key={`${layer.layer}-${cell.row}-${cell.col}`}
                    className={cell.filled ? "pallet-grid__cell is-filled" : "pallet-grid__cell"}
                    style={cell.filled && cell.color ? { background: cell.color } : undefined}
                    title={cell.cargoId ?? "Empty"}
                  >
                    <span>{cell.slotLabel}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
      </div>
    </section>
  );
}
