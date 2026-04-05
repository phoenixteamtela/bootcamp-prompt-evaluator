import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { colors } from '../theme';
import ScoreBadge from '../components/common/ScoreBadge';

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  best_avg_score: number;
  version_number: number | null;
  version_label: string | null;
  model: string | null;
  run_date: string | null;
  project_name: string | null;
  mode: string | null;
}

type ModeFilter = 'all' | 'template' | 'conversation';

export default function LeaderboardPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all');

  const isGlobal = !projectId;

  useEffect(() => {
    setLoading(true);
    let url: string;
    if (isGlobal) {
      url = modeFilter === 'all' ? '/api/leaderboard' : `/api/leaderboard?mode=${modeFilter}`;
    } else {
      url = `/api/projects/${projectId}/leaderboard`;
    }
    api.get<LeaderboardEntry[]>(url).then(setEntries).finally(() => setLoading(false));
  }, [projectId, isGlobal, modeFilter]);

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 20px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600,
    cursor: 'pointer',
    background: active ? colors.navy : 'transparent',
    color: active ? colors.white : colors.gray[500],
    transition: 'all 0.15s',
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ color: colors.navy, fontSize: 24, margin: 0 }}>
          {isGlobal ? 'Global Leaderboard' : 'Project Leaderboard'}
        </h1>

        {isGlobal && (
          <div style={{ display: 'flex', gap: 4, background: colors.gray[100], borderRadius: 8, padding: 4 }}>
            <button onClick={() => setModeFilter('all')} style={tabStyle(modeFilter === 'all')}>All</button>
            <button onClick={() => setModeFilter('template')} style={tabStyle(modeFilter === 'template')}>Template</button>
            <button onClick={() => setModeFilter('conversation')} style={tabStyle(modeFilter === 'conversation')}>Conversation</button>
          </div>
        )}
      </div>

      {loading ? (
        <p style={{ color: colors.gray[500] }}>Loading...</p>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}` }}>
          <p style={{ color: colors.gray[500] }}>No completed evaluations yet</p>
        </div>
      ) : (
        <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                {['Rank', 'Student', 'Best Score', 'Version', 'Model', isGlobal ? 'Project' : null, 'Date'].filter(Boolean).map(h => (
                  <th key={h!} style={{
                    textAlign: 'left', padding: '14px 16px', borderBottom: `2px solid ${colors.gray[200]}`,
                    color: colors.navy, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.user_id} style={{ borderBottom: `1px solid ${colors.gray[100]}` }}>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 28, height: 28, borderRadius: '50%', fontWeight: 700, fontSize: 13,
                      background: entry.rank <= 3 ? colors.orange : colors.gray[200],
                      color: entry.rank <= 3 ? colors.white : colors.gray[600],
                    }}>{entry.rank}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: colors.navy }}>{entry.display_name}</td>
                  <td style={{ padding: '12px 16px' }}><ScoreBadge score={entry.best_avg_score} /></td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>
                    v{entry.version_number}{entry.version_label ? ` (${entry.version_label})` : ''}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: colors.gray[600] }}>{entry.model}</td>
                  {isGlobal && (
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>
                      <span style={{ marginRight: 6 }}>{entry.project_name}</span>
                      {entry.mode && (
                        <span style={{
                          fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3,
                          padding: '1px 5px', borderRadius: 3,
                          background: entry.mode === 'conversation' ? 'rgba(232,131,42,0.1)' : colors.gray[100],
                          color: entry.mode === 'conversation' ? colors.orange : colors.gray[500],
                        }}>{entry.mode}</span>
                      )}
                    </td>
                  )}
                  <td style={{ padding: '12px 16px', fontSize: 12, color: colors.gray[500] }}>{entry.run_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
