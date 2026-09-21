import 'package:flutter/material.dart';

import 'api.dart';
import 'command_page.dart';
import 'offline/connectivity_monitor.dart';
import 'offline/sqlite_pending_store.dart';
import 'offline/sync_service.dart';

/// Cliente móvil: una sola pantalla para dictar órdenes contra el backend generado desde un diagrama.
///
/// No es el cliente completo de la sección 11.2 del enunciado (consulta de diagramas, chat, push): su
/// trabajo es demostrar que el código que genera la plataforma funciona de verdad, y que las órdenes dictadas
/// sin conexión no se pierden —se guardan en SQLite y se envían al volver la red—.
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Las órdenes guardadas viven en la base local del dispositivo, así que sobreviven a cerrar la app.
  final sync = SyncService(
    api: const Api(),
    store: await SqlitePendingStore.open(),
    connectivity: PlusConnectivityMonitor(),
  );
  await sync.start();

  runApp(DiagramasApp(sync: sync));
}

class DiagramasApp extends StatelessWidget {
  const DiagramasApp({super.key, required this.sync});

  final SyncService sync;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Diagramas UML',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF3B82F6)),
        useMaterial3: true,
      ),
      home: CommandPage(api: const Api(), sync: sync),
    );
  }
}
