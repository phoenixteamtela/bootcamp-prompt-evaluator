import { useState, useEffect } from 'react';
import { colors, gradients } from '../../theme';
import Tooltip from '../common/Tooltip';
import ScoreBadge from '../common/ScoreBadge';
import VersionSidebar from './VersionSidebar';
import type { WorkspaceState, WorkspaceActions, Version } from '../../types/workspace';

const btnStyle = (variant: 'primary' | 'secondary'): React.CSSProperties => ({
  padding: '8px 16px', borderRadius: 8, border: variant === 'secondary' ? `1px solid ${colors.gray[300]}` : 'none',
  background: variant === 'primary' ? gradients.phoenix : colors.white,
  color: variant === 'primary' ? colors.white : colors.gray[700],
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
});

const PILLARS = [
  { name: 'Clarity & Directness', hint: 'Clear task, action verbs, persona' },
  { name: 'Specificity', hint: 'Guidelines, output qualities, constraints' },
  { name: 'Examples', hint: 'Sample I/O, edge cases, labeled sections' },
  { name: 'Structure', hint: 'XML tags, delimiters, logical organization' },
];

interface Props {
  state: WorkspaceState;
  actions: WorkspaceActions;
}

export default function ConversationWriteRunStep({ state, actions }: Props) {
  const { project, versions, selectedVersion, models, evalSSE, activeRunId } = state;
  const hasVersions = versions.length > 0;

  const [editingTemplate, setEditingTemplate] = useState(selectedVersion?.template || '');
  const [isEditing, setIsEditing] = useState(!hasVersions);
  const [newVersionLabel, setNewVersionLabel] = useState('');
  const [runModel, setRunModel] = useState('claude-haiku-4-5-20251001');
  const [gradingModel, setGradingModel] = useState('claude-haiku-4-5-20251001');
  const [temperature, setTemperature] = useState(1.0);
  const [running, setRunning] = useState(false);
  const [showRubric, setShowRubric] = useState(false);

  useEffect(() => {
    if (selectedVersion) {
      setEditingTemplate(selectedVersion.template);
      setIsEditing(false);
    }
  }, [selectedVersion]);

  const handleSelectVersion = (v: Version) => {
    actions.setSelectedVersion(v);
    setEditingTemplate(v.template);
    setIsEditing(false);
  };

  const handleNewVersion = () => {
    setIsEditing(true);
    setEditingTemplate(selectedVersion?.template || '');
  };

  const handleSaveAndRun = async () => {
    let version = selectedVersion;
    if (isEditing) {
      version = await actions.saveVersion(editingTemplate, newVersionLabel || null);
      actions.setSelectedVersion(version);
      setIsEditing(false);
      setNewVersionLabel('');
    }
    if (!version) return;

    setRunning(true);
    try {
      await actions.runEval(null, version.id, runModel, gradingModel, temperature);
    } finally {
      setRunning(false);
    }
  };

  // Auto-advance when eval completes
  useEffect(() => {
    if (evalSSE.done && activeRunId) {
      actions.goToStep(1);
    }
  }, [evalSSE.done, activeRunId, actions]);

  const isRunning = !!activeRunId && !evalSSE.done;
  const lastEvent = evalSSE.lastEvent;
  const lastScore = lastEvent?.event === 'result' ? (lastEvent.data as { score?: number }).score : null;

  const selectStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: 6, border: `1px solid ${colors.gray[300]}`,
    fontSize: 13, width: '100%', boxSizing: 'border-box',
    cursor: 'pointer', appearance: 'none',
    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%23666\' d=\'M6 8L1 3h10z\'/%3E%3C/svg%3E")',
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: 28,
  };

  const editor = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Task context */}
      <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: colors.gray[400], textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Your Task</div>
            <div style={{ fontSize: 14, color: colors.gray[700], lineHeight: 1.6 }}>
              {project.task_description}
            </div>
            {project.extra_criteria && (
              <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 6, background: colors.warningBg, fontSize: 12, color: colors.warning, lineHeight: 1.5 }}>
                <strong>Extra criteria:</strong> {project.extra_criteria}
              </div>
            )}
          </div>
          <button
            onClick={() => setShowRubric(!showRubric)}
            style={{
              background: 'none', border: `1px solid ${colors.gray[200]}`,
              borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600,
              color: showRubric ? colors.orange : colors.gray[500], cursor: 'pointer',
              marginLeft: 12, whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            {showRubric ? 'Hide Rubric' : 'View Rubric'}
          </button>
        </div>

        {showRubric && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${colors.gray[100]}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: colors.gray[400], textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              Grading Rubric — 4 Pillars (each 0-2.5 pts, total 1-10)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {PILLARS.map(p => (
                <div key={p.name} style={{
                  padding: '8px 12px', borderRadius: 6, background: colors.gray[50],
                  borderLeft: `3px solid ${colors.orange}`,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: colors.navy }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: colors.gray[500], marginTop: 2 }}>{p.hint}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Prompt Editor */}
      <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16, color: colors.navy, display: 'flex', alignItems: 'center' }}>
            {!hasVersions ? 'Write Your Prompt' : isEditing ? 'New Version' : `Version ${selectedVersion?.version_number || '--'}`}
            {selectedVersion?.label && !isEditing && <span style={{ color: colors.gray[400], fontWeight: 400 }}> — {selectedVersion.label}</span>}
            {isEditing && hasVersions && <Tooltip text="Give this version a short name so you can remember what you changed." />}
          </h2>
          {isEditing && hasVersions && (
            <input
              value={newVersionLabel}
              onChange={e => setNewVersionLabel(e.target.value)}
              placeholder="Label (optional)"
              style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${colors.gray[300]}`, fontSize: 13, width: 180 }}
            />
          )}
        </div>
        {!hasVersions && (
          <p style={{ fontSize: 13, color: colors.gray[500], margin: '0 0 12px', lineHeight: 1.5 }}>
            Write a plain prompt for the AI. No variables needed — just write exactly what you want the AI to do.
          </p>
        )}
        <textarea
          value={editingTemplate}
          onChange={e => setEditingTemplate(e.target.value)}
          readOnly={!isEditing}
          rows={14}
          placeholder={!hasVersions ? 'Write your prompt here...\n\nTip: Include a clear task, specific instructions, examples, and use XML tags to structure your prompt.' : undefined}
          style={{
            width: '100%', padding: 14, borderRadius: 8, border: `1px solid ${isEditing && !hasVersions ? colors.orange : colors.gray[200]}`,
            fontSize: 13, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box',
            background: isEditing ? colors.white : colors.gray[50], outline: 'none',
          }}
        />
        {isEditing && hasVersions && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
            <button onClick={() => setIsEditing(false)} style={btnStyle('secondary')}>Cancel</button>
          </div>
        )}
      </div>

      {/* Model Config + Run */}
      <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: colors.gray[700], marginBottom: 12 }}>Evaluation Config</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 11, color: colors.gray[500], marginBottom: 4, display: 'block' }}>Run Model</label>
            <select value={runModel} onChange={e => setRunModel(e.target.value)} style={selectStyle}>
              {models.map(m => <option key={m.id} value={m.id}>{m.id}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: colors.gray[500], marginBottom: 4, display: 'block' }}>Grading Model</label>
            <select value={gradingModel} onChange={e => setGradingModel(e.target.value)} style={selectStyle}>
              {models.map(m => <option key={m.id} value={m.id}>{m.id}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: colors.gray[500], marginBottom: 4, display: 'block' }}>Temperature</label>
            <input type="number" min={0} max={2} step={0.1} value={temperature} onChange={e => setTemperature(parseFloat(e.target.value))}
              style={{ padding: '8px 12px', borderRadius: 6, border: `1px solid ${colors.gray[300]}`, fontSize: 13, width: '100%', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {isRunning ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: colors.gray[600], marginBottom: 6 }}>
              <span>Running evaluation...</span>
              {lastScore != null && <ScoreBadge score={lastScore} size="sm" />}
            </div>
            <div style={{ height: 8, borderRadius: 4, background: colors.gray[100], overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '100%', background: gradients.phoenix, borderRadius: 4, transition: 'width 0.3s', animation: 'pulse 1.5s ease-in-out infinite' }} />
            </div>
          </div>
        ) : (
          <button
            onClick={handleSaveAndRun}
            disabled={running || (!isEditing && !selectedVersion) || (isEditing && !editingTemplate.trim())}
            style={{
              ...btnStyle('primary'),
              width: '100%', padding: '12px 24px', fontSize: 14,
              opacity: (running || (!isEditing && !selectedVersion) || (isEditing && !editingTemplate.trim())) ? 0.6 : 1,
              cursor: (running || (!isEditing && !selectedVersion) || (isEditing && !editingTemplate.trim())) ? 'not-allowed' : 'pointer',
            }}
          >
            {isEditing ? 'Save & Run Evaluation' : 'Run Evaluation'}
          </button>
        )}
      </div>
    </div>
  );

  if (!hasVersions) return editor;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>
      <VersionSidebar
        versions={versions}
        selectedVersion={selectedVersion}
        onSelectVersion={handleSelectVersion}
        onNewVersion={handleNewVersion}
      />
      {editor}
    </div>
  );
}
