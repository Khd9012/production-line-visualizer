import type { EventItem } from "../types";

type EventTimelineProps = {
  events: EventItem[];
};

export function EventTimeline({ events }: EventTimelineProps) {
  return (
    <section className="panel timeline-panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Live Events</p>
          <h3>Operation Timeline</h3>
        </div>
        <span className="panel__pill">8 latest</span>
      </div>
      <div className="timeline-list">
        {events.map((event) => (
          <article key={event.id} className={`timeline-item timeline-item--${event.tone}`}>
            <div className="timeline-item__time">{event.time}</div>
            <div className="timeline-item__body">
              <strong>{event.title}</strong>
              <p>{event.detail}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
