import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { colors, gradients } from '../theme';
import ScoreBadge from '../components/common/ScoreBadge';
import Tooltip from '../components/common/Tooltip';

interface Project {
  id: string;
  name: string;
  mode: 'template' | 'conversation';
  task_description: string;
  version_count: number;
  latest_avg_score: number | null;
  created_at: string;
  updated_at: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    api.get<Project[]>('/api/projects').then(setProjects).finally(() => setLoading(false));
  }, []);

  const handleDeleteClick = (e: React.MouseEvent, projectId: string, projectName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmDelete({ id: projectId, name: projectName });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    setConfirmDelete(null);
    try {
      await api.delete(`/api/projects/${confirmDelete.id}`);
      setProjects(prev => prev.filter(p => p.id !== confirmDelete.id));
    } catch {
      // silently fail — card stays
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ color: colors.navy, margin: 0, fontSize: 24, display: 'flex', alignItems: 'center' }}>
          My Projects
          <Tooltip text="A project is one prompt engineering challenge. It contains your task definition, test datasets, prompt versions, and evaluation results — everything you need to iterate toward a better prompt." />
        </h1>
        <Link
          to="/projects/new"
          style={{
            background: gradients.phoenix,
            color: colors.white,
            padding: '10px 20px',
            borderRadius: 8,
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          + New Project
        </Link>
      </div>

      {loading ? (
        <p style={{ color: colors.gray[500] }}>Loading...</p>
      ) : projects.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 60,
          background: colors.white,
          borderRadius: 12,
          border: `1px solid ${colors.gray[200]}`,
        }}>
          <p style={{ color: colors.gray[500], fontSize: 16, marginBottom: 16 }}>No projects yet</p>
          <Link
            to="/projects/new"
            style={{ color: colors.orange, fontWeight: 600, textDecoration: 'none' }}
          >
            Create your first project
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {projects.map(p => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              style={{
                textDecoration: 'none',
                background: colors.white,
                borderRadius: 12,
                border: `1px solid ${colors.gray[200]}`,
                padding: 20,
                display: 'block',
                transition: 'box-shadow 0.2s, border-color 0.2s',
                opacity: deletingId === p.id ? 0.5 : 1,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = colors.orange;
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(232,131,42,0.12)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = colors.gray[200];
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                  <h3 style={{ color: colors.navy, margin: 0, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</h3>
                  <span style={{
                    fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
                    padding: '2px 6px', borderRadius: 4, flexShrink: 0,
                    background: p.mode === 'conversation' ? 'rgba(232,131,42,0.1)' : colors.gray[100],
                    color: p.mode === 'conversation' ? colors.orange : colors.gray[500],
                  }}>{p.mode}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <ScoreBadge score={p.latest_avg_score} size="sm" />
                  <button
                    onClick={e => handleDeleteClick(e, p.id, p.name)}
                    disabled={deletingId === p.id}
                    title="Delete project"
                    style={{
                      background: 'none', border: 'none',
                      cursor: deletingId === p.id ? 'not-allowed' : 'pointer',
                      color: colors.gray[300], padding: '2px 4px', lineHeight: 1,
                      borderRadius: 4, transition: 'color 0.15s', display: 'flex',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = colors.error)}
                    onMouseLeave={e => (e.currentTarget.style.color = colors.gray[300])}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 011.334-1.334h2.666a1.333 1.333 0 011.334 1.334V4M6.667 7.333v4M9.333 7.333v4M12.667 4v9.333a1.333 1.333 0 01-1.334 1.334H4.667a1.333 1.333 0 01-1.334-1.334V4" />
                    </svg>
                  </button>
                </div>
              </div>
              <p style={{ color: colors.gray[600], fontSize: 13, margin: '0 0 12px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {p.task_description}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: colors.gray[400] }}>
                <span>{p.version_count} version{p.version_count !== 1 ? 's' : ''}</span>
                <span>{new Date(p.updated_at).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setConfirmDelete(null)}
        >
          <div
            style={{
              background: colors.white, borderRadius: 16, padding: 32,
              maxWidth: 420, width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Trash icon */}
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: colors.errorBg, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke={colors.error} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 011.334-1.334h2.666a1.333 1.333 0 011.334 1.334V4M6.667 7.333v4M9.333 7.333v4M12.667 4v9.333a1.333 1.333 0 01-1.334 1.334H4.667a1.333 1.333 0 01-1.334-1.334V4" />
              </svg>
            </div>

            <h3 style={{
              margin: '0 0 8px', fontSize: 18, fontWeight: 700,
              color: colors.navy, textAlign: 'center',
            }}>
              Delete Project
            </h3>
            <p style={{
              margin: '0 0 8px', fontSize: 14, color: colors.gray[600],
              textAlign: 'center', lineHeight: 1.5,
            }}>
              Are you sure you want to delete <strong style={{ color: colors.navy }}>{confirmDelete.name}</strong>?
            </p>
            <p style={{
              margin: '0 0 24px', fontSize: 13, color: colors.gray[400],
              textAlign: 'center', lineHeight: 1.5,
            }}>
              All prompt versions, datasets, and evaluation runs will be permanently removed. This action cannot be undone.
            </p>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{
                  flex: 1, padding: '10px 16px', borderRadius: 8,
                  border: `1px solid ${colors.gray[300]}`, background: colors.white,
                  color: colors.gray[700], fontSize: 14, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  flex: 1, padding: '10px 16px', borderRadius: 8,
                  border: 'none', background: colors.error,
                  color: colors.white, fontSize: 14, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
