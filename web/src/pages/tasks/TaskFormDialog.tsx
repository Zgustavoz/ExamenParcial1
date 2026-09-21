import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LoaderCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { FormError } from '@/components/FormError'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createTask, listAssignableUsers } from '@/lib/api/tasks'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Diagrama al que pertenece la tarea; desde el editor viene fijado. */
  diagramId: string
}

/**
 * CU-21 Crear tarea manual. El asignado tiene que ser alguien activo de la misma empresa: si no, el
 * backend responde `USER_NOT_ELIGIBLE`.
 */
export function TaskFormDialog({ open, onOpenChange, diagramId }: Props) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState('')

  const people = useQuery({ queryKey: ['assignable-users'], queryFn: listAssignableUsers, enabled: open })

  const mutation = useMutation({
    mutationFn: createTask,
    onSuccess: async (task) => {
      await queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success(`Tarea «${task.title}» creada y asignada.`)
      onOpenChange(false)
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate({ diagramId, assignedTo, title: title.trim(), description: description.trim() })
  }

  const pending = mutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva tarea</DialogTitle>
          <DialogDescription>Se avisará a la persona a la que la asigne.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} noValidate className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="task-title">Título</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
              autoFocus
              disabled={pending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="task-assignee">Asignar a</Label>
            {/* Un <select> nativo: la lista es corta y así no hace falta más maquinaria. */}
            <select
              id="task-assignee"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              required
              disabled={pending || people.isPending}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
            >
              <option value="">
                {people.isPending ? 'Cargando personas…' : 'Elija a quién asignarla'}
              </option>
              {people.data?.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.displayName} ({person.username})
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="task-description">Descripción</Label>
            <textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={pending}
              className="min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
            />
          </div>

          <FormError error={mutation.error ?? people.error} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending || !assignedTo}>
              {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
              Crear tarea
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
