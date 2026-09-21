import 'dart:async';

import 'package:diagramas_movil/api.dart';
import 'package:diagramas_movil/offline/connectivity_monitor.dart';

/// Api de prueba: ni red ni micrófono. Guarda lo que se le envió y permite provocar fallos.
class FakeApi implements Api {
  /// Las órdenes que el «servidor» ejecutó, en el orden en que llegaron.
  final List<String> enviadas = [];

  /// Si devuelve un error para una orden, se lanza en vez de ejecutarla.
  ApiError? Function(String instruction)? fallo;

  /// Mientras haya una puerta, `command` espera a que se abra: permite ver una orden «en vuelo».
  Completer<void>? puerta;

  @override
  Future<String> login(String username, String password) async => 'jwt-de-prueba';

  @override
  Future<List<({String id, String name})>> diagrams(String token) async => [(id: 'd1', name: 'Ventas · Dominio')];

  @override
  Future<List<String>> entities(String token, String diagramId) async => ['Cliente'];

  @override
  Future<CommandResult> command(String token, String diagramId, String instruction) async {
    await puerta?.future;
    final error = fallo?.call(instruction);
    if (error != null) throw error;
    enviadas.add(instruction);
    return CommandResult(
      explanation: 'Hecho: $instruction',
      method: 'POST',
      path: '/api/clientes',
      status: 201,
      usedAi: false,
      response: {'orden': instruction},
    );
  }
}

/// Conectividad de prueba: se enciende y se apaga a voluntad.
class FakeConnectivity implements ConnectivityMonitor {
  FakeConnectivity({this.online = true});

  bool online;
  final _controller = StreamController<bool>.broadcast();

  @override
  Future<bool> isOnline() async => online;

  @override
  Stream<bool> get changes => _controller.stream;

  /// Simula que el dispositivo gana o pierde la red.
  void set(bool value) {
    online = value;
    _controller.add(value);
  }
}

ApiError sinRed() => ApiError('NETWORK_ERROR', 'No se pudo conectar con el servidor.');
