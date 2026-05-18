import { ResponseItem } from '../../domain/types';

interface Props {
  items: ResponseItem[];
  label: string;
  onBadgeClick: () => void;
}

export function ResponseCountBadge({ items, label, onBadgeClick }: Props) {
  if (items.length === 0) {
    return <span className="response-count-badge response-count-badge--empty">0</span>;
  }

  const tooltip = items.map((item) => item.description).join('\n');

  return (
    <button
      type="button"
      className="response-count-badge"
      title={tooltip}
      onClick={(e) => {
        e.stopPropagation();
        onBadgeClick();
      }}
      aria-label={`${items.length} ${label}`}
    >
      {items.length}
    </button>
  );
}
