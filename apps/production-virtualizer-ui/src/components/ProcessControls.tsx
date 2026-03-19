import type { FocusLine, PlaybackSpeed } from "../types";

type ProcessControlsProps = {
  focusedLine: FocusLine;
  playbackSpeed: PlaybackSpeed;
  onFocusChange: (line: FocusLine) => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
};

const lines: FocusLine[] = ["ALL", "L1", "L2", "L3", "L4", "L5", "L6", "L7", "QC"];
const speeds: PlaybackSpeed[] = [0.5, 1, 1.5, 2];

export function ProcessControls({ focusedLine, playbackSpeed, onFocusChange, onSpeedChange }: ProcessControlsProps) {
  return (
    <section className="panel process-controls">
      <div className="process-controls__group">
        <div>
          <p className="eyebrow">Line Zoom</p>
          <h3>Focus Mode</h3>
        </div>
        <div className="process-controls__buttons">
          {lines.map((line) => (
            <button
              key={line}
              type="button"
              className={line === focusedLine ? "process-controls__button is-active" : "process-controls__button"}
              onClick={() => onFocusChange(line)}
            >
              {line}
            </button>
          ))}
        </div>
      </div>

      <div className="process-controls__group">
        <div>
          <p className="eyebrow">Playback</p>
          <h3>Animation Speed</h3>
        </div>
        <div className="process-controls__buttons">
          {speeds.map((speed) => (
            <button
              key={speed}
              type="button"
              className={speed === playbackSpeed ? "process-controls__button is-active" : "process-controls__button"}
              onClick={() => onSpeedChange(speed)}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
