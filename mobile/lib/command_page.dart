import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart';

import 'api.dart';

/// Pantalla única: se elige el diagrama, se dicta la orden y se ve lo que respondió el backend generado.
class CommandPage extends StatefulWidget {
  const CommandPage({super.key, required this.api});

  final Api api;

  @override
  State<CommandPage> createState() => _CommandPageState();
}

class _CommandPageState extends State<CommandPage> {
  final _speech = SpeechToText();
  final _instruction = TextEditingController();
  final _username = TextEditingController(text: 'designer');
  final _password = TextEditingController();

  String? _token;
  List<({String id, String name})> _diagrams = const [];
  String? _diagramId;
  List<String> _entities = const [];

  bool _listening = false;
  bool _busy = false;
  String? _error;
  CommandResult? _result;

  @override
  void dispose() {
    _instruction.dispose();
    _username.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
    } on ApiError catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _login() => _run(() async {
    final token = await widget.api.login(_username.text.trim(), _password.text);
    final diagrams = await widget.api.diagrams(token);
    setState(() {
      _token = token;
      _diagrams = diagrams;
      _diagramId = diagrams.isEmpty ? null : diagrams.first.id;
    });
    if (_diagramId != null) await _loadEntities();
  });

  Future<void> _loadEntities() async {
    final names = await widget.api.entities(_token!, _diagramId!);
    if (mounted) setState(() => _entities = names);
  }

  /// La transcripción ocurre en el móvil (D-06): al servidor solo le llega texto.
  Future<void> _toggleMic() async {
    if (_listening) {
      await _speech.stop();
      setState(() => _listening = false);
      return;
    }
    final disponible = await _speech.initialize(
      onError: (e) => setState(() {
        _listening = false;
        _error = 'No se pudo usar el micrófono (${e.errorMsg}).';
      }),
      onStatus: (s) {
        if (s == 'done' || s == 'notListening') setState(() => _listening = false);
      },
    );
    if (!disponible) {
      setState(() => _error = 'Este dispositivo no tiene reconocimiento de voz disponible.');
      return;
    }
    setState(() {
      _listening = true;
      _error = null;
    });
    await _speech.listen(
      listenOptions: SpeechListenOptions(localeId: 'es_ES'),
      onResult: (r) => setState(() => _instruction.text = r.recognizedWords),
    );
  }

  Future<void> _send() => _run(() async {
    final result = await widget.api.command(_token!, _diagramId!, _instruction.text.trim());
    setState(() => _result = result);
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Backend generado')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_token == null) ..._loginFields() else ..._commandFields(),
              if (_error != null) ...[
                const SizedBox(height: 16),
                _Aviso(texto: _error!, color: Theme.of(context).colorScheme.errorContainer),
              ],
              if (_result != null) ...[
                const SizedBox(height: 16),
                _ResultCard(result: _result!),
              ],
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _loginFields() => [
    const Text('Entre con su usuario para elegir el diagrama.'),
    const SizedBox(height: 12),
    TextField(
      controller: _username,
      decoration: const InputDecoration(labelText: 'Usuario', border: OutlineInputBorder()),
    ),
    const SizedBox(height: 12),
    TextField(
      controller: _password,
      obscureText: true,
      decoration: const InputDecoration(labelText: 'Contraseña', border: OutlineInputBorder()),
      onSubmitted: (_) => _login(),
    ),
    const SizedBox(height: 16),
    FilledButton(
      onPressed: _busy ? null : _login,
      child: Text(_busy ? 'Entrando…' : 'Entrar'),
    ),
  ];

  List<Widget> _commandFields() => [
    DropdownButtonFormField<String>(
      initialValue: _diagramId,
      isExpanded: true,
      decoration: const InputDecoration(labelText: 'Diagrama', border: OutlineInputBorder()),
      items: [
        for (final d in _diagrams) DropdownMenuItem(value: d.id, child: Text(d.name, overflow: TextOverflow.ellipsis)),
      ],
      onChanged: _busy
          ? null
          : (value) {
              setState(() => _diagramId = value);
              _run(_loadEntities);
            },
    ),
    if (_entities.isNotEmpty) ...[
      const SizedBox(height: 8),
      Text(
        'El backend generado registra: ${_entities.join(', ')}.',
        style: Theme.of(context).textTheme.bodySmall,
      ),
    ],
    const SizedBox(height: 16),
    TextField(
      controller: _instruction,
      minLines: 2,
      maxLines: 4,
      // Sin esto el botón de enviar no se entera de que ya hay texto escrito.
      onChanged: (_) => setState(() {}),
      decoration: const InputDecoration(
        labelText: 'Orden',
        hintText: 'registra un cliente con nombre Juan y email juan@ejemplo.com',
        border: OutlineInputBorder(),
      ),
    ),
    const SizedBox(height: 16),
    Row(
      children: [
        // El botón del micrófono es lo único que hace falta para la demostración.
        IconButton.filled(
          onPressed: _busy ? null : _toggleMic,
          iconSize: 40,
          padding: const EdgeInsets.all(20),
          style: IconButton.styleFrom(
            backgroundColor: _listening ? Theme.of(context).colorScheme.error : null,
          ),
          icon: Icon(_listening ? Icons.stop : Icons.mic),
          tooltip: _listening ? 'Dejar de dictar' : 'Dictar la orden',
        ),
        const SizedBox(width: 16),
        Expanded(
          child: FilledButton.icon(
            onPressed: _busy || _diagramId == null || _instruction.text.trim().isEmpty ? null : _send,
            icon: const Icon(Icons.send),
            label: Text(_busy ? 'Enviando…' : 'Enviar la orden'),
          ),
        ),
      ],
    ),
    if (_listening)
      const Padding(
        padding: EdgeInsets.only(top: 12),
        child: Text('Escuchando… hable ahora.'),
      ),
  ];
}

class _Aviso extends StatelessWidget {
  const _Aviso({required this.texto, required this.color});

  final String texto;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(12)),
      child: Text(texto),
    );
  }
}

class _ResultCard extends StatelessWidget {
  const _ResultCard({required this.result});

  final CommandResult result;

  @override
  Widget build(BuildContext context) {
    final cuerpo = const JsonEncoder.withIndent('  ').convert(result.response);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(result.explanation, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(
              '${result.method} ${result.path} → ${result.status}'
              '${result.usedAi ? '' : '  (interpretado sin IA)'}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 12),
            SelectableText(cuerpo, style: const TextStyle(fontFamily: 'monospace', fontSize: 12)),
          ],
        ),
      ),
    );
  }
}
