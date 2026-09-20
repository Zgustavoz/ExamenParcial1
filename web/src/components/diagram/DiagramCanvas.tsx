import {
  Background,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  type Connection,
  type EdgeTypes,
  type NodeChange,
  type NodeTypes,
  type OnSelectionChangeParams,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useMemo } from 'react'
import type { ClassContent } from '@/lib/diagram/types'
import { UmlClassNode, type UmlNode } from './UmlClassNode'
import { UmlMarkers, UmlRelationshipEdge, type UmlEdge } from './UmlRelationshipEdge'

const nodeTypes: NodeTypes = { umlClass: UmlClassNode }
const edgeTypes: EdgeTypes = { umlRelationship: UmlRelationshipEdge }

interface Props {
  content: ClassContent
  /** Bloqueos activos por elemento: `elementId → nombre de quien edita` (CU-17). */
  locks?: Record<string, string>
  editable?: boolean
  onNodesChange?: (changes: NodeChange<UmlNode>[]) => void
  onConnect?: (connection: Connection) => void
  onSelectionChange?: (params: OnSelectionChangeParams) => void
}

/** Convierte `content_json` en el grafo de React Flow. Los ids son siempre los del servidor. */
export function contentToGraph(content: ClassContent, locks: Record<string, string> = {}) {
  const nodes: UmlNode[] = content.classes.map((uml) => ({
    id: uml.id,
    type: 'umlClass',
    position: { x: uml.x, y: uml.y },
    data: { uml, lockedBy: locks[uml.id] ?? null },
    draggable: locks[uml.id] === undefined,
  }))

  const edges: UmlEdge[] = content.relationships.map((relationship) => ({
    id: relationship.id,
    type: 'umlRelationship',
    source: relationship.sourceId,
    target: relationship.targetId,
    data: { relationship },
  }))

  return { nodes, edges }
}

/** Lienzo compartido por el visor (CU-11) y el editor (CU-07). */
export function DiagramCanvas({
  content,
  locks = {},
  editable = false,
  onNodesChange,
  onConnect,
  onSelectionChange,
}: Props) {
  const { nodes, edges } = useMemo(() => contentToGraph(content, locks), [content, locks])

  return (
    <div className="relative size-full">
      <UmlMarkers />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        // Con un solo punto de conexión por lado, el modo flexible deja empezar y terminar en cualquiera.
        connectionMode={ConnectionMode.Loose}
        nodesDraggable={editable}
        nodesConnectable={editable}
        elementsSelectable
        edgesReconnectable={false}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable className="!bg-secondary" />
      </ReactFlow>
    </div>
  )
}
