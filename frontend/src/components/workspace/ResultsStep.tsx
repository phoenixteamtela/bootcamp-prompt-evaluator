import { useState } from 'react';
import { colors, gradients } from '../../theme';
import ScoreBadge from '../common/ScoreBadge';
import Tooltip from '../common/Tooltip';
import type { WorkspaceState, WorkspaceActions, EvalRun } from '../../types/workspace';

const btnStyle = (variant: 'primary' | 'secondary'): React.CSSProperties => ({
  padding: '8px 16px', borderRadius: 8, border: variant === 'secondary' ? `1px solid ${colors.gray[300]}` : 'none',
  background: variant === 'primary' ? gradients.phoenix : colors.white,
  color: variant === 'primary' ? colors.white : colors.gray[700],
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
});

interface Props {
  state: WorkspaceState;
  actions: WorkspaceActions;
}

export default function ResultsStep({ state, actions }: Props) {
  const { evalRuns } = state;
  const [viewingRun, setViewingRun] = useState<EvalRun | null>(null);

  const handleViewRun = async (runId: string) => {
    const run = await actions.viewRun(runId);
    setViewingRun(run);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16, color: colors.navy }}>
            {viewingRun ? `Run Results — ${viewingRun.run_model}` : 'Evaluation Runs'}
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => actions.downloadProject()} style={btnStyle('secondary')}>Download Project</button>
          </div>
        </div>

        {viewingRun ? (
          <div>
            {/* Metrics Cards */}
            <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ background: colors.gray[50], padding: 12, borderRadius: 8, flex: 1, minWidth: 120 }}>
                <div style={{ fontSize: 11, color: colors.gray[500], display: 'flex', alignItems: 'center' }}>
                  Avg Score
                  <Tooltip text="The overall grade for this evaluation run, averaged across all test scenarios. A score of 8+ means your prompt is performing well." />
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: colors.navy }}>{viewingRun.avg_score?.toFixed(1) ?? '--'}</div>
              </div>
              <div style={{ background: colors.gray[50], padding: 12, borderRadius: 8, flex: 1, minWidth: 120 }}>
                <div style={{ fontSize: 11, color: colors.gray[500], display: 'flex', alignItems: 'center' }}>
                  Pass Rate
                  <Tooltip text="What percentage of test scenarios your prompt handled well (scored 8 or above). A high pass rate means your prompt works reliably across different situations." />
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: colors.navy }}>{viewingRun.pass_rate?.toFixed(1) ?? '--'}%</div>
              </div>
              <div style={{ background: colors.gray[50], padding: 12, borderRadius: 8, flex: 1, minWidth: 120 }}>
                <div style={{ fontSize: 11, color: colors.gray[500] }}>Test Cases</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: colors.navy }}>{viewingRun.total_cases}</div>
              </div>
            </div>

            {/* Error Banner */}
            {viewingRun.status === 'failed' && viewingRun.error_message && (
              <div style={{ background: colors.errorBg, color: colors.error, padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                <strong>Error:</strong> {viewingRun.error_message}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button onClick={() => setViewingRun(null)} style={btnStyle('secondary')}>Back to Runs</button>
              <button onClick={() => actions.downloadRun(viewingRun.id)} style={btnStyle('secondary')}>Download Run</button>
              <button onClick={() => actions.goToStep(2)} style={btnStyle('primary')}>Edit Prompt</button>
            </div>

            {/* Results Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['Scenario', 'Prompt Inputs', 'Rendered Prompt', 'Criteria', 'Output', 'Score', 'Reasoning'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 8px', borderBottom: `2px solid ${colors.gray[200]}`, color: colors.navy, fontSize: 12, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {viewingRun.results.map(r => (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${colors.gray[100]}` }}>
                      <td style={{ padding: '10px 8px', verticalAlign: 'top', maxWidth: 160 }}>{r.scenario}</td>
                      <td style={{ padding: '10px 8px', verticalAlign: 'top', maxWidth: 260, fontSize: 12 }}>
                        {Object.entries(r.prompt_inputs).map(([k, v]) => (
                          <div key={k} style={{ marginBottom: 6 }}>
                            <strong>{k}:</strong>
                            <div style={{ whiteSpace: 'pre-wrap', background: colors.gray[50], padding: 6, borderRadius: 4, maxHeight: 120, overflow: 'auto', marginTop: 2, fontSize: 11 }}>
                              {String(v)}
                            </div>
                          </div>
                        ))}
                      </td>
                      <td style={{ padding: '10px 8px', verticalAlign: 'top', maxWidth: 200 }}>
                        {r.rendered_prompt ? (
                          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 11, background: colors.gray[50], padding: 8, borderRadius: 4, maxHeight: 200, overflow: 'auto' }}>
                            {r.rendered_prompt}
                          </pre>
                        ) : <span style={{ color: colors.gray[400], fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 8px', verticalAlign: 'top', maxWidth: 160, fontSize: 12 }}>
                        {r.solution_criteria.map((c, i) => <div key={i}>- {c}</div>)}
                      </td>
                      <td style={{ padding: '10px 8px', verticalAlign: 'top', maxWidth: 200 }}>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 11, background: colors.gray[50], padding: 8, borderRadius: 4, maxHeight: 200, overflow: 'auto' }}>
                          {r.output}
                        </pre>
                      </td>
                      <td style={{ padding: '10px 8px', verticalAlign: 'top' }}><ScoreBadge score={r.score} /></td>
                      <td style={{ padding: '10px 8px', verticalAlign: 'top', maxWidth: 200, fontSize: 12 }}>{r.reasoning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          evalRuns.length === 0 ? (
            <p style={{ color: colors.gray[400], fontSize: 13 }}>No evaluation runs yet. Go to Run Evaluation to start one.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Version', 'Model', 'Score', 'Pass Rate', 'Cases', 'Status', 'Date', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 8px', borderBottom: `2px solid ${colors.gray[200]}`, color: colors.navy, fontSize: 12, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {evalRuns.map(run => (
                  <tr key={run.id} style={{ borderBottom: `1px solid ${colors.gray[100]}` }}>
                    <td style={{ padding: '10px 8px' }}>v{run.version_number}{run.version_label ? ` (${run.version_label})` : ''}</td>
                    <td style={{ padding: '10px 8px', fontSize: 12 }}>{run.run_model}</td>
                    <td style={{ padding: '10px 8px' }}><ScoreBadge score={run.avg_score} size="sm" /></td>
                    <td style={{ padding: '10px 8px' }}>{run.pass_rate !== null ? `${run.pass_rate.toFixed(0)}%` : '--'}</td>
                    <td style={{ padding: '10px 8px' }}>{run.completed_cases}/{run.total_cases}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                        background: run.status === 'completed' ? colors.successBg : run.status === 'failed' ? colors.errorBg : colors.warningBg,
                        color: run.status === 'completed' ? colors.success : run.status === 'failed' ? colors.error : colors.warning,
                      }}>{run.status}</span>
                    </td>
                    <td style={{ padding: '10px 8px', fontSize: 12 }}>{new Date(run.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '10px 8px' }}>
                      {(run.status === 'completed' || run.status === 'failed') && (
                        <button onClick={() => handleViewRun(run.id)} style={{ ...btnStyle('secondary'), padding: '4px 10px', fontSize: 12 }}>View</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>

      {/* Navigation */}
      {!viewingRun && (
        <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 8 }}>
          <button onClick={() => actions.goToStep(3)} style={btnStyle('secondary')}>← Run Evaluation</button>
          <button onClick={() => actions.goToStep(2)} style={btnStyle('primary')}>Edit Prompt</button>
        </div>
      )}
    </div>
  );
}
