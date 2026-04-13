import { useEffect, useState, FormEvent } from 'react';
import { api } from '../api/client';
import { colors, gradients } from '../theme';

interface User {
  id: string; username: string; display_name: string; is_admin: boolean; is_active: boolean; created_at: string;
}
interface UsageStat {
  user_id: string; username: string; display_name: string; total_calls: number; total_input_tokens: number; total_output_tokens: number;
}
interface Limit {
  id: string | null; user_id: string | null; username: string | null; max_calls_per_day: number; max_calls_per_hour: number;
}

interface ParsedRow {
  username: string;
  display_name: string;
  password: string;
  error?: string;
}

interface BulkError {
  username: string;
  detail: string;
}

interface BulkResult {
  created: User[];
  errors: BulkError[];
}

export default function AdminPage() {
  const [tab, setTab] = useState<'users' | 'usage' | 'limits'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStat[]>([]);
  const [limits, setLimits] = useState<Limit[]>([]);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', display_name: '', password: '', is_admin: false });
  const [error, setError] = useState('');

  // Bulk create state
  const [showBulkCreate, setShowBulkCreate] = useState(false);
  const [bulkCsv, setBulkCsv] = useState('');
  const [bulkParsed, setBulkParsed] = useState<ParsedRow[] | null>(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);

  // Global limit edit
  const [globalDay, setGlobalDay] = useState(100);
  const [globalHour, setGlobalHour] = useState(30);

  const fetchUsers = () => api.get<User[]>('/api/admin/users').then(setUsers).catch(err => setError(err instanceof Error ? err.message : 'Failed to load users'));

  useEffect(() => {
    setError('');
    if (tab === 'users') fetchUsers();
    if (tab === 'usage') api.get<UsageStat[]>('/api/admin/usage').then(setUsageStats).catch(err => setError(err instanceof Error ? err.message : 'Failed to load usage'));
    if (tab === 'limits') api.get<Limit[]>('/api/admin/limits').then(lims => {
      setLimits(lims);
      const global = lims.find(l => l.user_id === null);
      if (global) { setGlobalDay(global.max_calls_per_day); setGlobalHour(global.max_calls_per_hour); }
    }).catch(err => setError(err instanceof Error ? err.message : 'Failed to load limits'));
  }, [tab]);

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    try {
      await api.post('/api/admin/users', newUser);
      setShowCreateUser(false);
      setNewUser({ username: '', display_name: '', password: '', is_admin: false });
      fetchUsers();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
  };

  const [seedingUserId, setSeedingUserId] = useState<string | null>(null);
  const [seedResult, setSeedResult] = useState<{ userId: string; count: number } | null>(null);

  const toggleActive = async (user: User) => {
    try {
      await api.patch(`/api/admin/users/${user.id}`, { is_active: !user.is_active });
      fetchUsers();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to update user'); }
  };

  const seedProjects = async (user: User) => {
    setSeedingUserId(user.id);
    setSeedResult(null);
    try {
      const res = await api.post<{ cloned: number }>(`/api/admin/users/${user.id}/seed-projects`, {});
      setSeedResult({ userId: user.id, count: res.cloned });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Seed failed');
    } finally {
      setSeedingUserId(null);
    }
  };

  const saveGlobalLimits = async () => {
    try {
      await api.put('/api/admin/limits/global', { max_calls_per_day: globalDay, max_calls_per_hour: globalHour });
      api.get<Limit[]>('/api/admin/limits').then(setLimits).catch(err => setError(err instanceof Error ? err.message : 'Failed to load limits'));
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to save limits'); }
  };

  const parseBulkCsv = () => {
    setBulkResult(null);
    const lines = bulkCsv.trim().split('\n').filter(l => l.trim());
    if (!lines.length) { setBulkParsed([]); return; }

    // Auto-detect header row
    let start = 0;
    const firstLower = lines[0].toLowerCase();
    if (firstLower.startsWith('username') || firstLower.startsWith('email')) {
      start = 1;
    }

    const rows: ParsedRow[] = [];
    for (let i = start; i < lines.length; i++) {
      const parts = lines[i].split(',').map(s => s.trim());
      const [username, display_name, password] = parts;
      let error: string | undefined;
      if (!username) error = 'Missing username';
      else if (!display_name) error = 'Missing display name';
      else if (!password) error = 'Missing password';
      rows.push({ username: username || '', display_name: display_name || '', password: password || '', error });
    }
    setBulkParsed(rows);
  };

  const submitBulk = async () => {
    if (!bulkParsed) return;
    const valid = bulkParsed.filter(r => !r.error);
    if (!valid.length) return;
    setBulkSubmitting(true);
    setError('');
    try {
      const res = await api.post<BulkResult>('/api/admin/users/bulk', {
        users: valid.map(r => ({ username: r.username, display_name: r.display_name, password: r.password })),
      });
      setBulkResult(res);
      if (res.created.length > 0) fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk create failed');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const resetBulk = () => {
    setBulkCsv('');
    setBulkParsed(null);
    setBulkResult(null);
  };

  const inputStyle = { padding: '8px 12px', borderRadius: 8, border: `1px solid ${colors.gray[300]}`, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const };
  const btnPrimary: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, border: 'none', background: gradients.phoenix, color: colors.white, fontSize: 13, fontWeight: 600, cursor: 'pointer' };
  const btnSecondary: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, border: `1px solid ${colors.gray[300]}`, background: colors.white, color: colors.gray[700], fontSize: 13, cursor: 'pointer' };

  return (
    <div>
      <h1 style={{ color: colors.navy, fontSize: 24, marginBottom: 24 }}>Admin Panel</h1>
      {error && (
        <div style={{ padding: '10px 16px', marginBottom: 16, borderRadius: 8, background: colors.errorBg, color: colors.error, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: colors.error, cursor: 'pointer', fontSize: 16, padding: 0 }}>&times;</button>
        </div>
      )}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {(['users', 'usage', 'limits'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: tab === t ? colors.navy : colors.gray[100], color: tab === t ? colors.white : colors.gray[600],
          }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {/* Users Tab */}
      {tab === 'users' && (
        <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 16, color: colors.navy }}>Users</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowBulkCreate(!showBulkCreate); if (showBulkCreate) resetBulk(); setShowCreateUser(false); }} style={btnSecondary}>Bulk Create</button>
              <button onClick={() => { setShowCreateUser(!showCreateUser); setShowBulkCreate(false); }} style={btnPrimary}>+ Create User</button>
            </div>
          </div>

          {showCreateUser && (
            <form onSubmit={handleCreateUser} style={{ marginBottom: 16, padding: 16, background: colors.gray[50], borderRadius: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <label style={{ fontSize: 11, color: colors.gray[500], display: 'block', marginBottom: 4 }}>Username</label>
                <input value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} required style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: colors.gray[500], display: 'block', marginBottom: 4 }}>Display Name</label>
                <input value={newUser.display_name} onChange={e => setNewUser({ ...newUser, display_name: e.target.value })} required style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: colors.gray[500], display: 'block', marginBottom: 4 }}>Password</label>
                <input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required style={inputStyle} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <input type="checkbox" checked={newUser.is_admin} onChange={e => setNewUser({ ...newUser, is_admin: e.target.checked })} /> Admin
              </label>
              <button type="submit" style={btnPrimary}>Create</button>
            </form>
          )}

          {showBulkCreate && (
            <div style={{ marginBottom: 16, padding: 16, background: colors.gray[50], borderRadius: 8 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: colors.gray[500], display: 'block', marginBottom: 4 }}>Paste CSV (username, display_name, password)</label>
                <textarea
                  value={bulkCsv}
                  onChange={e => { setBulkCsv(e.target.value); setBulkParsed(null); setBulkResult(null); }}
                  placeholder={'username,display_name,password\nstudent01@phoenixteam.com,Student 01,student01@!\nstudent02@phoenixteam.com,Student 02,student02@!'}
                  rows={6}
                  style={{ ...inputStyle, width: '100%', fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button onClick={parseBulkCsv} disabled={!bulkCsv.trim()} style={{ ...btnSecondary, opacity: bulkCsv.trim() ? 1 : 0.5 }}>Parse &amp; Preview</button>
                {bulkParsed && bulkParsed.some(r => !r.error) && !bulkResult && (
                  <button onClick={submitBulk} disabled={bulkSubmitting} style={{ ...btnPrimary, opacity: bulkSubmitting ? 0.6 : 1 }}>
                    {bulkSubmitting ? 'Creating...' : `Create ${bulkParsed.filter(r => !r.error).length} Users`}
                  </button>
                )}
                {bulkParsed && (
                  <button onClick={resetBulk} style={btnSecondary}>Clear</button>
                )}
              </div>

              {/* Preview table */}
              {bulkParsed && bulkParsed.length > 0 && !bulkResult && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      {['Username', 'Display Name', 'Password', 'Status'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '6px 8px', borderBottom: `2px solid ${colors.gray[200]}`, color: colors.navy, fontSize: 11, fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bulkParsed.map((r, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${colors.gray[100]}`, background: r.error ? colors.errorBg : undefined }}>
                        <td style={{ padding: '6px 8px' }}>{r.username || '—'}</td>
                        <td style={{ padding: '6px 8px' }}>{r.display_name || '—'}</td>
                        <td style={{ padding: '6px 8px' }}>{r.password ? '***' : '—'}</td>
                        <td style={{ padding: '6px 8px' }}>
                          {r.error
                            ? <span style={{ color: colors.error, fontSize: 11 }}>{r.error}</span>
                            : <span style={{ color: colors.success, fontSize: 11 }}>Ready</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {bulkParsed && bulkParsed.length === 0 && (
                <p style={{ fontSize: 12, color: colors.gray[500], margin: 0 }}>No data rows found.</p>
              )}

              {/* Results */}
              {bulkResult && (
                <div style={{ fontSize: 13 }}>
                  {bulkResult.created.length > 0 && (
                    <p style={{ color: colors.success, margin: '0 0 8px', fontWeight: 600 }}>
                      {bulkResult.created.length} user{bulkResult.created.length !== 1 ? 's' : ''} created successfully
                    </p>
                  )}
                  {bulkResult.errors.length > 0 && (
                    <div>
                      <p style={{ color: colors.error, margin: '0 0 4px', fontWeight: 600 }}>
                        {bulkResult.errors.length} error{bulkResult.errors.length !== 1 ? 's' : ''}:
                      </p>
                      <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {bulkResult.errors.map((e, i) => (
                          <li key={i} style={{ fontSize: 12, color: colors.error }}>{e.username}: {e.detail}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Username', 'Display Name', 'Admin', 'Active', 'Created', 'Status', 'Seed'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 8px', borderBottom: `2px solid ${colors.gray[200]}`, color: colors.navy, fontSize: 12, fontWeight: 600 }}>{h === 'Status' || h === 'Seed' ? '' : h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: `1px solid ${colors.gray[100]}` }}>
                  <td style={{ padding: '10px 8px' }}>{u.username}</td>
                  <td style={{ padding: '10px 8px' }}>{u.display_name}</td>
                  <td style={{ padding: '10px 8px' }}>{u.is_admin ? 'Yes' : 'No'}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, background: u.is_active ? colors.successBg : colors.errorBg, color: u.is_active ? colors.success : colors.error }}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px', fontSize: 12 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <button onClick={() => toggleActive(u)} style={{ ...btnSecondary, padding: '4px 10px', fontSize: 11 }}>
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    {!u.is_admin && (
                      <button
                        onClick={() => seedProjects(u)}
                        disabled={seedingUserId === u.id}
                        style={{ ...btnSecondary, padding: '4px 10px', fontSize: 11, opacity: seedingUserId === u.id ? 0.6 : 1 }}
                      >
                        {seedingUserId === u.id ? 'Seeding...' : 'Seed Projects'}
                      </button>
                    )}
                    {seedResult?.userId === u.id && (
                      <span style={{ marginLeft: 6, fontSize: 11, color: colors.success }}>
                        {seedResult.count} cloned
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Usage Tab */}
      {tab === 'usage' && (
        <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 20 }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 16, color: colors.navy }}>API Usage by User</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['User', 'Total Calls', 'Input Tokens', 'Output Tokens'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 8px', borderBottom: `2px solid ${colors.gray[200]}`, color: colors.navy, fontSize: 12, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usageStats.map(s => (
                <tr key={s.user_id} style={{ borderBottom: `1px solid ${colors.gray[100]}` }}>
                  <td style={{ padding: '10px 8px', fontWeight: 600 }}>{s.display_name} <span style={{ color: colors.gray[400], fontWeight: 400 }}>@{s.username}</span></td>
                  <td style={{ padding: '10px 8px' }}>{s.total_calls.toLocaleString()}</td>
                  <td style={{ padding: '10px 8px' }}>{s.total_input_tokens.toLocaleString()}</td>
                  <td style={{ padding: '10px 8px' }}>{s.total_output_tokens.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Limits Tab */}
      {tab === 'limits' && (
        <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 20 }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 16, color: colors.navy }}>API Limits</h2>
          <div style={{ padding: 16, background: colors.gray[50], borderRadius: 8, marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div>
              <label style={{ fontSize: 11, color: colors.gray[500], display: 'block', marginBottom: 4 }}>Global - Calls/Day</label>
              <input type="number" value={globalDay} onChange={e => setGlobalDay(Number(e.target.value))} style={{ ...inputStyle, width: 100 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: colors.gray[500], display: 'block', marginBottom: 4 }}>Global - Calls/Hour</label>
              <input type="number" value={globalHour} onChange={e => setGlobalHour(Number(e.target.value))} style={{ ...inputStyle, width: 100 }} />
            </div>
            <button onClick={saveGlobalLimits} style={btnPrimary}>Save</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Scope', 'Calls/Day', 'Calls/Hour'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 8px', borderBottom: `2px solid ${colors.gray[200]}`, color: colors.navy, fontSize: 12, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {limits.map((l, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${colors.gray[100]}` }}>
                  <td style={{ padding: '10px 8px', fontWeight: 600 }}>{l.user_id ? l.username || l.user_id : 'Global (default)'}</td>
                  <td style={{ padding: '10px 8px' }}>{l.max_calls_per_day}</td>
                  <td style={{ padding: '10px 8px' }}>{l.max_calls_per_hour}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
