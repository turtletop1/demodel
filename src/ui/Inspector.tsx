import { useEditor } from '@editor/store';

export function Inspector() {
  const activeId = useEditor((s) => s.activeLayerId);
  const project = useEditor((s) => s.project);
  const layer = project?.layers.find((l) => l.id === activeId);

  if (!layer) return <div style={{ padding: 8, fontSize: 12, color: '#666' }}>未選擇圖層</div>;

  return (
    <div style={{ padding: 8 }}>
      <div style={panelTitle}>圖層屬性</div>
      <div style={{ fontSize: 12, color: '#ddd', marginBottom: 6 }}>{layer.name}</div>
      <label style={row}>
        <span>Opacity</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={layer.opacity}
          onChange={(e) => {
            useEditor.setState((s) => {
              const l = s.project?.layers.find((l) => l.id === activeId);
              if (l) l.opacity = Number(e.target.value);
            });
          }}
          style={{ flex: 1 }}
        />
        <span style={{ width: 32, textAlign: 'right', color: '#888' }}>
          {layer.opacity.toFixed(2)}
        </span>
      </label>
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
  gap: 6,
  fontSize: 12,
  color: '#ccc',
  marginBottom: 6,
};