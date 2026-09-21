import 'package:flutter/material.dart';

import 'api.dart';
import 'command_page.dart';

/// Cliente móvil: una sola pantalla para dictar órdenes contra el backend generado desde un diagrama.
///
/// No es el cliente completo de la sección 11.2 del enunciado (consulta de diagramas, offline, push):
/// su único trabajo es demostrar que el código que genera la plataforma funciona de verdad.
void main() {
  runApp(const DiagramasApp());
}

class DiagramasApp extends StatelessWidget {
  const DiagramasApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Diagramas UML',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF3B82F6)),
        useMaterial3: true,
      ),
      home: const CommandPage(api: Api()),
    );
  }
}
