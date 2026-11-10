import { useEditor } from '@editor/store';

export function Timeline() {
  const project = useEditor((s) => s.project);
  const t = useEditor((s) => s.t);
  const playing = useEditor((s) => s.playing);

  if (!project) return null;
  const { tracks, skeleton } = project;
  const boneName = (id: string) => skeleton.find((b) => b.id === id)?.name ?? '?';

  return (
    <div
      style={{
        height: 180,
        background: '#141414',
        borderTop: '1px solid #2a2a2a',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <div
        style={{
          padding: '4px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12,
          color: '#ccc',
        }}
      >
        <button
          onClick={() => useEditor.getState().setPlaying(!playing)}
          style={{
            background: playing ? '#a33333' : '#2b4a7a',
            color: '#fff',
            border: 'none',
            borderRadius: 3,
            padding: '4px 10px',
            cursor: 'pointer',
          }}
        >
          {playing ? '暫停' : '播放'}
        </button>
        <input
          type="range"
          min={0}
          max={1000}
          value={t * 1000}
          onChange={(e) => useEditor.getState().setT(Number(e.target.value) / 1000)}
          style={{ flex: 1 }}
        />
        <span style={{ width: 60, textAlign: 'right', color: '#888' }}>
          {(t * project.durationMs).toFixed(0)}ms
        </span>
        <span>/ {project.durationMs}ms</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
        {tracks.length === 0 && (
          <div style={{ fontSize: 11, color: '#555' }}>尚無軌道。</div>
        )}
        {tracks.map((track) => (
          <div
            key={track.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 11,
              color: '#bbb',
              marginBottom: 3,
            }}
          >
            <span style={{ width: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {boneName(track.boneId)} · {track.param}
            </span>
            <div
              style={{
                flex: 1,
                height: 18,
                background: '#1e1e1e',
                position: 'relative',
                borderRadius: 2,
              }}
            >
              {track.keys.map((k, i) => (
                <div
                  key={i}
                  title={`t=${k.t.toFixed(2)} value=${k.value.toFixed(2)}`}
                  style={{
                    position: 'absolute',
                    left: `${k.t * 100}%`,
                    top: '50%',
                    transform: 'translate(-50%, -50%) rotate(45deg)',
                    width: 8,
                    height: 8,
                    background: '#00ccff',
                    cursor: 'pointer',
                  }}
                  onClick={() => useEditor.getState().setT(k.t)}
                />
              ))}
              <div
                style={{
                  position: 'absolute',
                  left: `${t * 100}%`,
                  top: 0,
                  bottom: 0,
                  width: 1,
                  background: '#ff2d55',
                }}
              />
            </div>
            <input
              type="number"
              step={0.01}
              placeholder="value"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = Number((e.target as HTMLInputElement).value);
                  if (!Number.isNaN(val)) {
                    useEditor.getState().addKey(track.id, t, val);
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
              style={{
                width: 60,
                background: '#111',
                color: '#fff',
                border: '1px solid #333',
                borderRadius: 3,
                padding: '1px 3px',
                fontSize: 11,
              }}
            />
            <button
              onClick={() => useEditor.getState().removeTrack(track.id)}
              style={{
                background: '#333',
                color: '#ccc',
                border: 'none',
                borderRadius: 3,
                padding: '1px 6px',
                cursor: 'pointer',
                fontSize: 10,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}