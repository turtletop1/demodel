import { useEditor } from '@editor/store';
import type { ParamName } from '@runtime/types';

const PARAMS: ParamName[] = [
  'angle',
  'translateX',
  'translateY',
  'scaleX',
  'scaleY',
  'opacity',
];

export function SkeletonPanel() {
  const project = useEditor((s) => s.project);
  const activeBoneId = useEditor((s) => s.activeBoneId);

  if (!project) return <div style={{ padding: 8, color: '#666', fontSize: 12 }}>尚未載入</div>;

  return (
    <div style={{ padding: 8, overflowY: 'auto', height: '100%' }}>
      <div style={panelTitle}>骨骼</div>
      <button
        style={btn}
        onClick={() => {
          const x = project.width / 2;
          const y = project.height / 2;
          useEditor.getState().addBone(x, y, activeBoneId ?? null);
        }}
      >
        + 新增骨骼
      </button>
      <div style={{ marginTop: 8 }}>
        {project.skeleton.length === 0 && (
          <div style={{ fontSize: 11, color: '#666' }}>尚無骨骼。</div>
        )}
        {project.skeleton.map((b) => (
          <div
            key={b.id}
            onClick={() => useEditor.getState().setActiveBone(b.id)}
            style={{
              padding: '4px 6px',
              fontSize: 12,
              borderRadius: 3,
              background: b.id === activeBoneId ? '#2b4a7a' : 'transparent',
              color: '#ddd',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>{b.name}</span>
            <span style={{ color: '#666', fontSize: 10 }}>
              {b.parentId ? '↳' : 'root'}
            </span>
          </div>
        ))}
      </div>

      {activeBoneId &&
        project.skeleton
          .filter((b) => b.id === activeBoneId)
          .map((b) => (
            <div key={b.id} style={{ marginTop: 8 }}>
              <label style={row}>
                <span>旋轉°</span>
                <input
                  type="number"
                  step={1}
                  value={(b.angle * 180 / Math.PI).toFixed(1)}
                  onChange={(e) =>
                    useEditor.getState().updateBone(b.id, {
                      angle: (Number(e.target.value) * Math.PI) / 180,
                    })
                  }
                  style={numInput}
                />
              </label>
              <label style={row}>
                <span>長度</span>
                <input
                  type="number"
                  value={b.length}
                  onChange={(e) =>
                    useEditor.getState().updateBone(b.id, {
                      length: Number(e.target.value) || 10,
                    })
                  }
                  style={numInput}
                />
              </label>
              <button style={btn} onClick={() => useEditor.getState().removeBone(b.id)}>
                刪除骨骼
              </button>
              <div style={{ ...panelTitle, marginTop: 12 }}>新增軌道</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {PARAMS.map((p) => (
                  <button
                    key={p}
                    style={tagBtn}
                    onClick={() => useEditor.getState().addTrack(b.id, p)}
                  >
                    + {p}
                  </button>
                ))}
              </div>
            </div>
          ))}
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
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: 12,
  color: '#ccc',
  marginBottom: 6,
};
const numInput: React.CSSProperties = {
  width: 70,
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
const tagBtn: React.CSSProperties = {
  background: '#333',
  color: '#ddd',
  border: 'none',
  borderRadius: 3,
  padding: '3px 6px',
  fontSize: 11,
  cursor: 'pointer',
};