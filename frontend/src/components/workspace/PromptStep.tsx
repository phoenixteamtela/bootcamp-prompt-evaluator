import { useState, useEffect } from 'react';
import { colors, gradients } from '../../theme';
import Tooltip from '../common/Tooltip';
import VersionSidebar from './VersionSidebar';
import type { WorkspaceState, WorkspaceActions, Version } from '../../types/workspace';

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

export default function PromptStep({ state, actions }: Props) {
  const { project, versions, selectedVersion } = state;

  const [editingTemplate, setEditingTemplate] = useState(selectedVersion?.template || '');
  const [isEditing, setIsEditing] = useState(false);
  const [newVersionLabel, setNewVersionLabel] = useState('');


  // Sync editor when version selection changes
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

  const handleSave = async () => {
    const v = await actions.saveVersion(editingTemplate, newVersionLabel || null);
    actions.setSelectedVersion(v);
    setIsEditing(false);
    setNewVersionLabel('');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>
      <VersionSidebar
        versions={versions}
        selectedVersion={selectedVersion}
        onSelectVersion={handleSelectVersion}
        onNewVersion={handleNewVersion}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Prompt Editor */}
        <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 16, color: colors.navy, display: 'flex', alignItems: 'center' }}>
              {isEditing ? 'New Version' : `Version ${selectedVersion?.version_number || '--'}`}
              {selectedVersion?.label && !isEditing && <span style={{ color: colors.gray[400], fontWeight: 400 }}> — {selectedVersion.label}</span>}
              {isEditing && <Tooltip text="Give this version a short name so you can remember what you changed, like 'added examples' or 'more specific instructions.'" />}
            </h2>
            {isEditing && (
              <input
                value={newVersionLabel}
                onChange={e => setNewVersionLabel(e.target.value)}
                placeholder="Label (optional)"
                style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${colors.gray[300]}`, fontSize: 13, width: 180 }}
              />
            )}
          </div>
          <div style={{ fontSize: 11, color: colors.gray[400], marginBottom: 8, display: 'flex', alignItems: 'center' }}>
            Input variables: {Object.keys(project.prompt_inputs_spec).join(', ')}
            <Tooltip text="This is where you write the instructions the AI will follow. When an evaluation runs, each test case's input data is automatically provided to the AI along with your instructions." />
          </div>
          <textarea
            value={editingTemplate}
            onChange={e => setEditingTemplate(e.target.value)}
            readOnly={!isEditing}
            rows={12}
            style={{
              width: '100%', padding: 14, borderRadius: 8, border: `1px solid ${colors.gray[200]}`,
              fontSize: 13, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box',
              background: isEditing ? colors.white : colors.gray[50], outline: 'none',
            }}
          />
          {isEditing && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setIsEditing(false)} style={btnStyle('secondary')}>Cancel</button>
              <button onClick={handleSave} style={btnStyle('primary')}>Save New Version</button>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={() => actions.goToStep(1)} style={btnStyle('secondary')}>← Datasets</button>
          <button onClick={() => actions.goToStep(3)} style={btnStyle('primary')}>Next: Run Evaluation →</button>
        </div>
      </div>
    </div>
  );
}
