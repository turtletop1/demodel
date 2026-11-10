import { useRef } from 'react';
import type { Renderer } from '@runtime/renderer/Renderer';
import { Toolbar } from './ui/Toolbar';
import { LayerList } from './ui/LayerList';
import { Viewport } from './ui/Viewport';
import { MeshPanel } from './ui/MeshPanel';
import { SkeletonPanel } from './ui/SkeletonPanel';
import { Timeline } from './ui/Timeline';
import { Inspector } from './ui/Inspector';
import { useEditor } from './editor/store';

export default function App() {
  const rendererRef = useRef<Renderer | null>(null);

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    try {
      if (ext === 'psd' || ext === 'psb') {
        const { importPSD } = await import('./editor/psd');
        const { project, textures } = await importPSD(file);
        useEditor.getState().setProject(project, textures);
        rendererRef.current?.resize(project.width, project.height);
        rendererRef.current?.syncLayers(project, textures);
      } else if (ext === 'mdpz') {
        const { deserializeProject } = await import('@runtime/io');
        const lp = await deserializeProject(await file.arrayBuffer());
        useEditor.getState().setProject(lp.project, lp.textures);
        rendererRef.current?.resize(lp.project.width, lp.project.height);
        rendererRef.current?.syncLayers(lp.project, lp.textures);
      }
    } catch (err) {
      alert(`載入失敗：${(err as Error).message}`);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#0e0e0e',
        color: '#ddd',
        fontFamily: 'system-ui, -apple-system, "PingFang TC", sans-serif',
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <Toolbar rendererRef={rendererRef} />

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div
          style={{
            width: 200,
            borderRight: '1px solid #2a2a2a',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <LayerList />
          <div style={{ borderTop: '1px solid #2a2a2a' }}>
            <MeshPanel />
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Viewport rendererRef={rendererRef} />
          <Timeline />
        </div>

        <div
          style={{
            width: 240,
            borderLeft: '1px solid #2a2a2a',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <SkeletonPanel />
          <div style={{ borderTop: '1px solid #2a2a2a' }}>
            <Inspector />
          </div>
        </div>
      </div>
    </div>
  );
}