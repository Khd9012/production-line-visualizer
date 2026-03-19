type ControlTabsProps = {
  current: "overview" | "robot" | "pallet";
  onChange: (tab: "overview" | "robot" | "pallet") => void;
};

const tabs: Array<{ id: "overview" | "robot" | "pallet"; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "robot", label: "Palletizer" },
  { id: "pallet", label: "Pallet Stack" }
];

export function ControlTabs({ current, onChange }: ControlTabsProps) {
  return (
    <div className="control-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={tab.id === current ? "control-tabs__tab is-active" : "control-tabs__tab"}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
