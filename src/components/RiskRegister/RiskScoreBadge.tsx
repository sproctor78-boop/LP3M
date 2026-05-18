import { RiskScore } from '../../domain/types';

interface Props {
  score: RiskScore;
  /** Show probability band alongside score for inherent/residual cards. */
  showDetail?: boolean;
}

export function RiskScoreBadge({ score, showDetail }: Props) {
  const label = showDetail ? `${score.score} (${score.probabilityBand}×${Math.max(score.costImpact, score.timeImpact)})` : String(score.score);
  return (
    <span
      className={`risk-score-badge risk-score-badge--${score.rag}`}
      title={`Score ${score.score} · Prob ${score.probabilityPct}% band ${score.probabilityBand} · Cost ${score.costImpact} · Time ${score.timeImpact} · ${score.rag.toUpperCase()}`}
    >
      {label}
    </span>
  );
}
