import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bot, Check, LoaderCircle, Mic, MicOff, Send, User } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { FormError } from '@/components/FormError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { confirmAiChanges, listAiChats, sendAiInstruction, type AiMessage, type InputType } from '@/lib/api/copilot'
import { errorMessage } from '@/lib/api/errors'
import { useSpeechRecognition } from '@/lib/use-speech-recognition'
import { cn } from '@/lib/utils'

interface Props {
  diagramId: string
  /** Se llama cuando la IA ya aplicó cambios, para recargar el diagrama del editor. */
  onApplied: () => void
}

/** CU-12 Generar o modificar el diagrama con IA, y CU-13 consultar el historial de la conversación. */
export function CopilotPanel({ diagramId, onApplied }: Props) {
  const queryClient = useQueryClient()
  const [instruction, setInstruction] = useState('')
  const [inputType, setInputType] = useState<InputType>('TEXTO')
  const [lastExplanation, setLastExplanation] = useState<string | null>(null)

  const chats = useQuery({ queryKey: ['aiChats', diagramId], queryFn: () => listAiChats(diagramId) })

  const speech = useSpeechRecognition((text) => {
    setInstruction(text)
    setInputType('VOZ')
  })

  const ask = useMutation({
    mutationFn: () => sendAiInstruction({ diagramId, instruction: instruction.trim(), inputType }),
    onSuccess: async (result) => {
      setInstruction('')
      setInputType('TEXTO')
      setLastExplanation(result.explanation)
      await queryClient.invalidateQueries({ queryKey: ['aiChats', diagramId] })
      // El asistente aplica los cambios por su cuenta (D-07): el editor tiene que releer el diagrama.
      onApplied()
    },
  })

  const confirm = useMutation({
    mutationFn: () => confirmAiChanges(diagramId),
    onSuccess: () => {
      setLastExplanation(null)
      toast.success('Cambios confirmados.')
      onApplied()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!instruction.trim()) return
    ask.mutate()
  }

  const messages: AiMessage[] = chats.data?.flatMap((chat) => chat.messages) ?? []

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
        {chats.isPending && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
            Cargando la conversación…
          </p>
        )}

        {chats.isSuccess && messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Pídale al asistente lo que necesite. Por ejemplo: «agrega una clase Cliente con nombre y email».
          </p>
        )}

        <ul className="space-y-3">
          {messages.map((message, index) => (
            <li
              key={`${message.timestamp ?? index}-${index}`}
              className={cn(
                'flex gap-2 rounded-lg p-2 text-sm',
                message.role === 'user' ? 'bg-secondary' : 'bg-accent/40',
              )}
            >
              {message.role === 'user' ? (
                <User className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              ) : (
                <Bot className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              )}
              <p className="whitespace-pre-wrap">{message.content}</p>
            </li>
          ))}
        </ul>

        {ask.isPending && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
            El asistente está trabajando…
          </p>
        )}

        {/* Un fallo del asistente nunca toca el diagrama (CP-04). */}
        <FormError error={ask.error} />

        {lastExplanation && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            <p className="mb-2">{lastExplanation}</p>
            <Button size="sm" onClick={() => confirm.mutate()} disabled={confirm.isPending}>
              {confirm.isPending ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
              ) : (
                <Check className="size-4" aria-hidden />
              )}
              Confirmar cambios
            </Button>
          </div>
        )}
      </div>

      <form onSubmit={submit} className="flex items-center gap-2">
        <Input
          value={instruction}
          onChange={(e) => {
            setInstruction(e.target.value)
            setInputType('TEXTO')
          }}
          placeholder="Escriba una instrucción"
          aria-label="Instrucción para el asistente"
          disabled={ask.isPending}
        />

        {speech.supported && (
          <Button
            type="button"
            size="icon"
            variant={speech.listening ? 'default' : 'outline'}
            aria-label={speech.listening ? 'Dejar de dictar' : 'Dictar por voz'}
            onClick={() => (speech.listening ? speech.stop() : speech.start())}
            disabled={ask.isPending}
          >
            {speech.listening ? <MicOff className="size-4" aria-hidden /> : <Mic className="size-4" aria-hidden />}
          </Button>
        )}

        <Button type="submit" size="icon" aria-label="Enviar instrucción" disabled={ask.isPending || !instruction.trim()}>
          <Send className="size-4" aria-hidden />
        </Button>
      </form>
    </div>
  )
}
