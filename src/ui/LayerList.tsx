import { useEditor } from '@editor/store';

export function LayerList() {
  const project = useEditor((s) => s.project);
  const activeId = useEditor((s) => s.activeLayerId);
  const setActive = useEditor((s) => s.setActiveLayer);

  const toggleVisible = (id: string) => {
    useEditor.setState((s) => {
      const l = s.project?.layers.find((l) => l.id === id);
      if (l) l.visible = !l.visible;
    });
  };

  return (
    <div style={{ padding: 8, overflowY: 'auto', height: '100%' }}>
      <div style={panelTitle}>圖層</div>
      {project?.layers.map((l) => (
        <div
          key={l.id}
          onClick={() => setActive(l.id)}
          style={{
            padding: '4px 8px',
            cursor: 'pointer',
            fontSize: 12,
            background: activeId === l.id ? '#2b4a7a' : 'transparent',
            color: l.visible ? '#eee' : '#666',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            borderRadius: 3,
          }}
        >
          <input
            type="checkbox"
            checked={l.visible}
            onChange={(e) => {
              e.stopPropagation();
              toggleVisible(l.id);
            }}
          />
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {l.name}
          </span>
          <span style={{ color: '#666', fontSize: 10 }}>
            {project.meshes[l.id] ? 'M' : '—'}
          </span>
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