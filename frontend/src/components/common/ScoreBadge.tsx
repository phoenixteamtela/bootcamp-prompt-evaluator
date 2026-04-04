import { colors } from '../../theme';

export default function ScoreBadge({ score, size = 'md' }: { score: number | null; size?: 'sm' | 'md' }) {
  if (score === null || score === undefined) return <span style={{ color: colors.gray[400], fontSize: size === 'sm' ? 12 : 14 }}>--</span>;

  const bg = score >= 8 ? colors.successBg : score >= 6 ? colors.warningBg : colors.errorBg;
  const fg = score >= 8 ? colors.success : score >= 6 ? colors.warning : colors.error;
  const padding = size === 'sm' ? '2px 8px' : '4px 12px';
  const fontSize = size === 'sm' ? 12 : 14;

  return (
    <span style={{
      background: bg,
      color: fg,
      fontWeight: 700,
      padding,
      borderRadius: 6,
      fontSize,
      display: 'inline-block',
    }}>
      {score.toFixed(1)}
    </span>
  );
}
