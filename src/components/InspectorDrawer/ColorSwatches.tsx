import { TASK_COLORS } from '../../domain/constants';

interface Props {
  current: string | null | undefined;
  onPick: (value: string | null) => void;
}

export function ColorSwatches({ current, onPick }: Props) {
  return (
    <div className="color-swatches">
      {TASK_COLORS.map((c) => {
        const classes = ['color-swatch'];
        if (c.value === null) classes.push('none');
        if ((c.value ?? null) === (current ?? null)) classes.push('selected');
        return (
          <button
            key={c.name}
            type="button"
            className={classes.join(' ')}
            title={c.name}
            aria-label={c.name}
            style={c.value ? { background: c.value } : undefined}
            onClick={() => onPick(c.value)}
          />
        );
      })}
    </div>
  );
}
