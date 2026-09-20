import { ReactFlowProvider, type Connection, type NodeChange } from '@xyflow/react'
import { ArrowLeft, Eye, LoaderCircle, Plus, Save, Users, Wifi, WifiOff } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DiagramCanvas } from '@/components/diagram/DiagramCanvas'
import type { UmlNode } from '@/components/diagram/UmlClassNode'
import { FormError } from '@/components/FormError'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { NewRelationship } from '@/lib/diagram/operations'
import { clampToCanvas } from '@/lib/diagram/types'
import { ClassPropertiesPanel } from './ClassPropertiesPanel'
import { NewRelationshipDialog } from './NewRelationshipDialog'
import { RelationshipPanel } from './RelationshipPanel'
import { useDiagramEditor } from './use-diagram-editor'

/** CU-07 … CU-10: edición manual del diagrama de clases. */
export default function DiagramEditorPage() {
  const { diagramId = '' } = useParams()
  const editor = useDiagramEditor(diagramId)
  const { content, classes, locks, participants, connected, loadError, saving, send, save } = editor

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null)

  const selectedClass = classes.find((c) => c.id === selectedClassId) ?? null
  const selectedEdge = content?.relationships.find((r) => r.id === selectedEdgeId) ?? null
  const lockedBySomeoneElse = selectedClassId !== null && locks[selectedClassId] !== undefined

  /** Al terminar de arrastrar se envía `MOVE_CLASS`: el servidor lo persiste y lo difunde (CP-02). */
  const onNodesChange = useCallback(
    (changes: NodeChange<UmlNode>[]) => {
      for (const change of changes) {
        if (change.type === 'position' && change.dragging === false && change.position) {
          send({
            op: 'MOVE_CLASS',
            classId: change.id,
            x: clampToCanvas(change.position.x),
            y: clampToCanvas(change.position.y),
          })
        }
      }
    },
    [send],
  )

  const addClass = () =>
    send({
      op: 'ADD_CLASS',
      class: {
        name: `Clase${classes.length + 1}`,
        // Sin x/y el servidor coloca la clase en la grilla; aquí se propone un hueco a la derecha.
        x: clampToCanvas(80 + (classes.length % 4) * 260),
        y: clampToCanvas(80 + Math.floor(classes.length / 4) * 220),
      },
    })

  const createRelationship = (relationship: NewRelationship) => {
    send({ op: 'ADD_RELATIONSHIP', relationship })
    setPendingConnection(null)
  }

  if (loadError) {
    return (
      <div className="grid gap-4">
        <FormError error={loadError} />
        <Button asChild variant="link" className="justify-self-start">
          <Link to="/projects">Volver a proyectos</Link>
        </Button>
      </div>
    )
  }

  if (!content) {
    return (
      <p className="flex items-center gap-2 text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" aria-hidden />
        Cargando diagrama…
      </p>
    )
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link to="/projects">
              <ArrowLeft className="size-4" aria-hidden />
              Proyectos
            </Link>
          </Button>
          <Badge variant="outline">versión {editor.version}</Badge>
          {connected ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Wifi className="size-3.5 text-emerald-600" aria-hidden />
              Conectado
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-amber-700">
              <WifiOff className="size-3.5" aria-hidden />
              Sin conexión
            </span>
          )}
          {participants.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="size-3.5" aria-hidden />
              {participants.map((p) => p.username).join(', ')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/diagrams/${diagramId}/view`}>
              <Eye className="size-4" aria-hidden />
              Ver
            </Link>
          </Button>
          <Button size="sm" onClick={() => void save()} disabled={saving}>
            {saving ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
            Guardar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="h-[70vh] overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Button size="sm" variant="outline" onClick={addClass} disabled={!connected}>
              <Plus className="size-4" aria-hidden />
              Agregar clase
            </Button>
            <p className="text-xs text-muted-foreground">
              Arrastre de un borde a otro para crear una relación.
            </p>
          </div>

          <div className="h-[calc(70vh-3rem)]">
            <ReactFlowProvider>
              <DiagramCanvas
                content={content}
                locks={locks}
                editable
                onNodesChange={onNodesChange}
                onConnect={(connection) => setPendingConnection(connection)}
                onSelectionChange={({ nodes, edges }) => {
                  setSelectedClassId(nodes[0]?.id ?? null)
                  setSelectedEdgeId(edges[0]?.id ?? null)
                }}
              />
            </ReactFlowProvider>
          </div>
        </div>

        <aside className="h-[70vh] overflow-y-auto rounded-xl border bg-card p-4">
          {selectedClass ? (
            <>
              <h2 className="mb-4 font-medium">Clase</h2>
              {lockedBySomeoneElse && (
                <p className="mb-3 rounded-md bg-amber-50 p-2 text-xs text-amber-800">
                  {locks[selectedClass.id]} está editando esta clase.
                </p>
              )}
              <ClassPropertiesPanel uml={selectedClass} readOnly={!connected || lockedBySomeoneElse} send={send} />
            </>
          ) : selectedEdge ? (
            <>
              <h2 className="mb-4 font-medium">Relación</h2>
              <RelationshipPanel
                relationship={selectedEdge}
                classes={classes}
                readOnly={!connected}
                send={send}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Seleccione una clase o una relación para ver sus propiedades.
            </p>
          )}
        </aside>
      </div>

      {pendingConnection?.source && pendingConnection.target && (
        <NewRelationshipDialog
          sourceId={pendingConnection.source}
          targetId={pendingConnection.target}
          classes={classes}
          onCancel={() => setPendingConnection(null)}
          onCreate={createRelationship}
        />
      )}
    </>
  )
}
