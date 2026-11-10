import { useEditor } from '@editor/store';

export function MeshPanel() {
  const activeId = useEditor((s) => s.activeLayerId);
  const project = useEditor((s) => s.project);
  const cols = useEditor((s) => s.gridCols);
  const rows = useEditor((s) => s.gridRows);
  const mode = useEditor((s) => s.mode);

  const mesh = activeId && project ? project.meshes[activeId] : null;

  return (
    <div style={{ padding: 8 }}>
      <div style={panelTitle}>網格</div>
      <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
        模式：{mode === 'mesh' ? '編輯網格' : mode === 'bone' ? '編輯骨骼' : '預覽'}
      </div>
      <label style={row}>
        <span>列</span>
        <input
          type="number"
          min={2}
          max={64}
          value={cols}
          onChange={(e) => useEditor.getState().setGridDims(Number(e.target.value) || 2, rows)}
          style={numInput}
        />
      </label>
      <label style={row}>
        <span>行</span>
        <input
          type="number"
          min={2}
          max={64}
          value={rows}
          onChange={(e) => useEditor.getState().setGridDims(cols, Number(e.target.value) || 2)}
          style={numInput}
        />
      </label>
      <button
        disabled={!activeId}
        onClick={() => activeId && useEditor.getState().generateMesh(activeId)}
        style={btn}
      >
        {mesh ? '重新生成網格' : '生成網格'}
      </button>
      {!activeId && (
        <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>請先選擇一個圖層</div>
      )}
      {mesh && (
        <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>
          {mesh.vertices.length} 頂點 · {mesh.indices.length / 3} 三角
        </div>
      )}
    </div>
  );
}

const panelTitle: React.CSSProperties = {
  fontSize: 11,
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: 1,
  marginBottom: 6,
};
const row: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  fontSize: 12,
  color: '#ccc',
  marginBottom: 6,
};
const numInput: React.CSSProperties = {
  width: 60,
  background: '#111',
  color: '#fff',
  border: '1px solid #333',
  borderRadius: 3,
  padding: '2px 4px',
};
const btn: React.CSSProperties = {
  width: '100%',
  marginTop: 6,
  background: '#2b4a7a',
  color: '#fff',
  border: 'none',
  borderRadius: 3,
  padding: '6px 0',
  cursor: 'pointer',
  fontSize: 12,
};