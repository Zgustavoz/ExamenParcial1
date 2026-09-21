# mobile — cliente Flutter

Una sola pantalla con un botón de micrófono. Su único trabajo es **demostrar que el backend generado
funciona**: se dicta «registra un cliente con nombre Juan» y el registro aparece en la API generada, que se
puede comprobar con Postman.

> No es el cliente completo de la sección 11.2 del enunciado (consulta de diagramas, modo offline con
> SQLite, notificaciones push). Ese alcance se redujo a propósito: ver [D-33](../docs/DECISIONS.md).

## Cómo funciona

```
Móvil                    Plataforma (8080)              Backend generado (8090)
  │  dicta la orden         │                                │
  │  (texto, D-06)          │                                │
  ├────────────────────────►│  interpreta con el asistente   │
  │                         │  o con el intérprete local     │
  │                         ├───────────────────────────────►│  POST /api/clientes
  │◄────────────────────────┤◄───────────────────────────────┤  201 + el registro
```

La transcripción ocurre **en el móvil** (D-06): a la plataforma solo le llega texto. La plataforma traduce
la orden a una llamada HTTP —con el asistente si está configurado, y si no con un intérprete local— y la
ejecuta contra el backend generado. El móvil solo muestra lo que respondió.

## Requisitos

- Flutter 3.41 o superior con el SDK de Android.
- La plataforma levantada (ver [docs/PROBAR_RAPIDO.md](../docs/PROBAR_RAPIDO.md)).
- El backend generado en marcha (ver más abajo).

## Poner en marcha el backend generado

1. En la web, abra un diagrama de clases con al menos una clase con atributos.
2. Genere el código (botón **Código** → **Generar código**) y descargue el ZIP como `developer`.
3. Descomprima y ejecútelo:

```powershell
cd <carpeta-del-zip>
mvn spring-boot:run
```

Queda en `http://localhost:8090` con una base H2 en `./data`, sin instalar nada más. Comprobar con Postman:

```
GET  http://localhost:8090/api/clientes
POST http://localhost:8090/api/clientes    {"nombre":"Juan","email":"juan@ejemplo.com"}
```

La plataforma lo busca en `http://host.docker.internal:8090`. Para cambiarlo, ponga `GENERATED_APP_URL` en
el `.env` de la raíz y reinicie el backend.

## Ejecutar la app

```powershell
cd mobile
flutter pub get
flutter run --dart-define=API_URL=http://10.0.2.2:8080
```

`10.0.2.2` es como el **emulador** de Android ve el `localhost` del PC. En un **móvil físico** use la IP de
su PC en la red local, por ejemplo `--dart-define=API_URL=http://192.168.1.50:8080`, con el móvil en la
misma wifi.

| Variable | Para qué | Por omisión |
|---|---|---|
| `API_URL` | dirección de la plataforma | `http://10.0.2.2:8080` |
| `COMPANY_SLUG` | empresa con la que se inicia sesión | `demo` |

## Usarla

1. Entre con un usuario de la empresa (por ejemplo `designer`).
2. Elija el diagrama. Debajo se listan las entidades que el backend generado registra.
3. Pulse el **micrófono** y dicte, o escriba la orden.
4. **Enviar la orden**. Verá qué llamada se hizo, con qué respuesta.

Órdenes que entiende el intérprete local (el asistente admite lenguaje más libre):

```
registra un cliente con nombre Juan Pérez y email juan@ejemplo.com
crea un pedido con total 150
lista los clientes
```

Si la orden la interpretó el respaldo local en vez del asistente, la tarjeta del resultado lo dice
(«interpretado sin IA»), para no dar por hecho lo que no fue.

## Pruebas

```powershell
flutter test      # 4 pruebas de la pantalla, sin red ni micrófono
flutter analyze
```
