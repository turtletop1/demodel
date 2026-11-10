import { useRef } from 'react';
import { useEditor, textureRegistry } from '@editor/store';
import { importPSD } from '@editor/psd';
import { deserializeProject, serializeProject } from '@runtime/io';
import type { Renderer } from '@runtime/renderer/Renderer';

interface Props {
  rendererRef: React.MutableRefObject<Renderer | null>;
}

export function Toolbar({ rendererRef }: Props) {
  const psdInput = useRef<HTMLInputElement>(null);
  const mdpzInput = useRef<HTMLInputElement>(null);
  const mode = useEditor((s) => s.mode);
  const project = useEditor((s) => s.project);

  const onPSD = async (file: File) => {
    try {
      const { project, textures } = await importPSD(file);
      useEditor.getState().setProject(project, textures);
      rendererRef.current?.resize(project.width, project.height);
      rendererRef.current?.syncLayers(project, textures);
    } catch (e) {
      alert(`PSD 匯入失敗：${(e as Error).message}`);
    }
  };

  const onMdpz = async (file: File) => {
    try {
      const lp = await deserializeProject(await file.arrayBuffer());
      useEditor.getState().setProject(lp.project, lp.textures);
      rendererRef.current?.resize(lp.project.width, lp.project.height);
      rendererRef.current?.syncLayers(lp.project, lp.textures);
    } catch (e) {
      alert(`開啟檔案失敗：${(e as Error).message}`);
    }
  };

  const save = async () => {
    const s = useEditor.getState();
    if (!s.project) return;
    const blob = await serializeProject(s.project, Object.fromEntries(textureRegistry));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'model.mdpz';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        background: '#181818',
        borderBottom: '1px solid #2a2a2a',
      }}
    >
      <strong style={{ color: '#eee', marginRight: 8 }}>deModel</strong>
      <button style={btn} onClick={() => psdInput.current?.click()}>
        匯入 PSD
      </button>
      <button style={btn} onClick={() => mdpzInput.current?.click()}>
        開啟 .mdpz
      </button>
      <button style={btn} disabled={!project} onClick={save}>
        儲存 .mdpz
      </button>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', gap: 2 }}>
        {(['mesh', 'bone', 'preview'] as const).map((m) => (
          <button
            key={m}
            style={{ ...btn, background: mode === m ? '#2b4a7a' : '#333' }}
            onClick={() => useEditor.getState().setMode(m)}
          >
            {m === 'mesh' ? '網格' : m === 'bone' ? '骨骼' : '預覽'}
          </button>
        ))}
      </div>

      <input
        ref={psdInput}
        type="file"
        accept=".psd,.psb"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPSD(f);
          e.target.value = '';
        }}
      />
      <input
        ref={mdpzInput}
        type="file"
        accept=".mdpz"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onMdpz(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}

const btn: React.CSSProperties = {
  background: '#333',
  color: '#eee',
  border: 'none',
  borderRadius: 3,
  padding: '5px 10px',
  cursor: 'pointer',
  fontSize: 12,
};