import { colors } from '../../theme';
import ScoreBadge from '../common/ScoreBadge';
import Tooltip from '../common/Tooltip';
import type { Version } from '../../types/workspace';

interface Props {
  versions: Version[];
  selectedVersion: Version | null;
  onSelectVersion: (v: Version) => void;
  onNewVersion: () => void;
}

export default function VersionSidebar({ versions, selectedVersion, onSelectVersion, onNewVersion }: Props) {
  return (
    <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.gray[200]}`, fontWeight: 600, fontSize: 14, color: colors.navy, display: 'flex', alignItems: 'center' }}>
        Versions
        <Tooltip text="Every time you save your prompt, it's saved as a new version. This lets you try different approaches and compare which version gets the best scores." position="right" />
      </div>
      {versions.map(v => (
        <div
          key={v.id}
          onClick={() => onSelectVersion(v)}
          style={{
            padding: '10px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: selectedVersion?.id === v.id ? colors.gray[50] : 'transparent',
            borderLeft: selectedVersion?.id === v.id ? `3px solid ${colors.orange}` : '3px solid transparent',
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.navy }}>v{v.version_number}</div>
            {v.label && <div style={{ fontSize: 11, color: colors.gray[500] }}>{v.label}</div>}
          </div>
          <ScoreBadge score={v.latest_avg_score} size="sm" />
        </div>
      ))}
      <div
        onClick={onNewVersion}
        style={{
          padding: '10px 16px', cursor: 'pointer', color: colors.orange, fontWeight: 600, fontSize: 13,
          borderTop: `1px solid ${colors.gray[200]}`, textAlign: 'center',
        }}
      >
        + New Version
      </div>
    </div>
  );
}
