import { useState, useEffect } from 'react';
import { colors, gradients } from '../../theme';
import ScoreBadge from '../common/ScoreBadge';
import type { WorkspaceState, WorkspaceActions, EvalRun, PillarScores } from '../../types/workspace';

const PILLAR_LABELS: Record<keyof PillarScores, string> = {
  clarity: 'Clarity & Directness',
  specificity: 'Specificity',
  examples: 'Examples',
  structure: 'Structure',
};

const btnStyle = (variant: 'primary' | 'secondary'): React.CSSProperties => ({
  padding: '8px 16px', borderRadius: 8, border: variant === 'secondary' ? `1px solid ${colors.gray[300]}` : 'none',
  background: variant === 'primary' ? gradients.phoenix : colors.white,
  color: variant === 'primary' ? colors.white : colors.gray[700],
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
});

function PillarBar({ label, score }: { label: string; score: number }) {
  const pct = (score / 2.5) * 100;
  const barColor = score >= 2.0 ? colors.success : score >= 1.0 ? colors.warning : colors.error;

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: colors.navy }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: barColor }}>{score.toFixed(1)} / 2.5</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: colors.gray[100], overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 4,
          background: barColor, transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  );
}

interface Props {
  state: WorkspaceState;
  actions: WorkspaceActions;
}

export default function ConversationResultsStep({ state, actions }: Props) {
  const { evalRuns } = state;
  const [viewingRun, setViewingRun] = useState<EvalRun | null>(null);

  // Auto-load latest completed run on mount
  useEffect(() => {
    const latestCompleted = evalRuns.find(r => r.status === 'completed');
    if (latestCompleted && !viewingRun) {
      actions.viewRun(latestCompleted.id).then(setViewingRun);
    }
  }, [evalRuns, viewingRun, actions]);

  const handleViewRun = async (runId: string) => {
    const run = await actions.viewRun(runId);
    setViewingRun(run);
  };

  // Run list view
  if (!viewingRun) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: colors.navy }}>Evaluation Runs</h2>
          <button onClick={() => actions.downloadProject()} style={btnStyle('secondary')}>Download Project</button>
        </div>
        {evalRuns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}` }}>
            <p style={{ color: colors.gray[500] }}>No evaluation runs yet. Go to Write & Run to create one.</p>
          </div>
        ) : (
          <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  {['Version', 'Model', 'Score', 'Status', 'Date', ''].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '12px 16px', borderBottom: `2px solid ${colors.gray[200]}`,
                      color: colors.navy, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {evalRuns.map(run => (
                  <tr key={run.id} style={{ borderBottom: `1px solid ${colors.gray[100]}` }}>
                    <td style={{ padding: '10px 16px', fontSize: 13 }}>
                      v{run.version_number}{run.version_label ? ` (${run.version_label})` : ''}
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: colors.gray[600] }}>{run.run_model}</td>
                    <td style={{ padding: '10px 16px' }}><ScoreBadge score={run.avg_score} size="sm" /></td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                        background: run.status === 'completed' ? colors.successBg : run.status === 'failed' ? colors.errorBg : colors.warningBg,
                        color: run.status === 'completed' ? colors.success : run.status === 'failed' ? colors.error : colors.warning,
                      }}>{run.status}</span>
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: colors.gray[500] }}>
                      {new Date(run.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      {run.status === 'completed' && (
                        <button onClick={() => handleViewRun(run.id)} style={{ ...btnStyle('secondary'), padding: '4px 12px', fontSize: 12 }}>View</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // Detail view
  const result = viewingRun.results[0];
  const pillarScores = result?.pillar_scores;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setViewingRun(null)} style={btnStyle('secondary')}>← All Runs</button>
          <span style={{ fontSize: 14, color: colors.gray[500] }}>
            v{viewingRun.version_number}{viewingRun.version_label ? ` (${viewingRun.version_label})` : ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => actions.downloadRun(viewingRun.id)} style={btnStyle('secondary')}>Download Run</button>
          <button onClick={() => actions.goToStep(1)} style={btnStyle('primary')}>Edit Prompt</button>
        </div>
      </div>

      {viewingRun.error_message && (
        <div style={{ background: colors.errorBg, border: `1px solid ${colors.error}`, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13, color: colors.error }}>
          {viewingRun.error_message}
        </div>
      )}

      {/* Score Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 16 }}>
        {/* Overall Score */}
        <div style={{
          background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 24,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: 12, color: colors.gray[500], marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Overall Score</div>
          <div style={{ fontSize: 48, fontWeight: 700, color: colors.navy, lineHeight: 1 }}>
            {viewingRun.avg_score != null ? viewingRun.avg_score.toFixed(1) : '--'}
          </div>
          <div style={{ fontSize: 12, color: colors.gray[400], marginTop: 4 }}>out of 10</div>
        </div>

        {/* Pillar Breakdown */}
        <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: colors.gray[700], marginBottom: 12 }}>Pillar Breakdown</div>
          {pillarScores ? (
            Object.entries(PILLAR_LABELS).map(([key, label]) => (
              <PillarBar key={key} label={label} score={pillarScores[key as keyof PillarScores] ?? 0} />
            ))
          ) : (
            <p style={{ color: colors.gray[400], fontSize: 13 }}>No pillar scores available</p>
          )}
        </div>
      </div>

      {/* Strengths / Weaknesses */}
      {result && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.success, marginBottom: 8 }}>Strengths</div>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {result.strengths.map((s, i) => (
                <li key={i} style={{ fontSize: 13, color: colors.gray[700], marginBottom: 4, lineHeight: 1.5 }}>{s}</li>
              ))}
            </ul>
          </div>
          <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.error, marginBottom: 8 }}>Areas for Improvement</div>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {result.weaknesses.map((w, i) => (
                <li key={i} style={{ fontSize: 13, color: colors.gray[700], marginBottom: 4, lineHeight: 1.5 }}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Reasoning */}
      {result && (
        <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: colors.gray[700], marginBottom: 8 }}>Evaluation Reasoning</div>
          <p style={{ fontSize: 13, color: colors.gray[600], lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
            {result.reasoning}
          </p>
        </div>
      )}

      {/* Prompt and Output */}
      {result && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.gray[700], marginBottom: 8 }}>Your Prompt</div>
            <pre style={{
              fontSize: 12, background: colors.gray[50], padding: 12, borderRadius: 8,
              overflow: 'auto', maxHeight: 300, whiteSpace: 'pre-wrap', margin: 0,
              lineHeight: 1.5, color: colors.gray[700],
            }}>
              {result.rendered_prompt}
            </pre>
          </div>
          <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.gray[700], marginBottom: 8 }}>LLM Output</div>
            <pre style={{
              fontSize: 12, background: colors.gray[50], padding: 12, borderRadius: 8,
              overflow: 'auto', maxHeight: 300, whiteSpace: 'pre-wrap', margin: 0,
              lineHeight: 1.5, color: colors.gray[700],
            }}>
              {result.output}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
