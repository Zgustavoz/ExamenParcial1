# Lista de pruebas manuales

Recorrido para comprobar a mano que el sistema hace lo que pide el documento. Cubre los 19 casos de uso del
cliente web (CU-18, el modo offline, es exclusivo del móvil) y las excepciones que más importan.

**Antes de empezar**, levanta el entorno (ver [PUESTA_EN_MARCHA.md](PUESTA_EN_MARCHA.md)) y ten a mano la
contraseña de los usuarios de ejemplo:

```powershell
Select-String -Path .env -Pattern "^SEED_ADMIN_PASSWORD="
```

Todos los usuarios de ejemplo usan esa misma contraseña.

| Empresa | Usuario | Rol |
|---|---|---|
| `platform` | `admin` | Administrador de la plataforma |
| `demo` | `companyadmin` | Administrador de empresa |
| `demo` | `designer` | Diseñador |
| `demo` | `developer` | Desarrollador |

> Marca cada casilla al comprobarla. Si algo no coincide con lo que dice aquí, anótalo: es un fallo.

---

## 1. Acceso y roles (CU-01)

- [ ] **Entrar bien.** Empresa `demo`, usuario `designer` → entra y aterriza en **Proyectos**.
- [ ] **Contraseña mal.** Cambia un carácter → mensaje de error **en español**, y no entra.
- [ ] **Empresa que no existe.** Empresa `noexiste` → el mensaje **no revela** si el usuario existe o no
      (dice lo mismo que con la contraseña mal).
- [ ] **Cada rol ve su menú.** Entra con cada usuario y comprueba la navegación:
  - `admin` → **Empresas** · `companyadmin` → **Usuarios** · `designer` y `developer` → **Proyectos**.
  - Ninguno ve los enlaces de los otros; **Notificaciones** lo ven todos.
- [ ] **Sesión persistente.** Recarga la página (F5) con la sesión abierta → sigues dentro.
- [ ] **Cerrar sesión** → vuelve al login y ya no puedes volver atrás con el botón del navegador.

## 2. Empresas (CU-02) — con `admin` de `platform`

- [ ] **Listar** las empresas existentes.
- [ ] **Crear** una empresa nueva (nombre y *slug*) → aparece en la lista.
- [ ] **Nombre o slug repetido** → error `DUPLICATE_COMPANY` con mensaje claro, no se crea.
- [ ] **Crear su primer administrador** desde la empresa recién creada.
- [ ] **Entrar con ese administrador** en su empresa → funciona y solo ve lo suyo.
- [ ] **Desactivar** una empresa → sus usuarios ya no pueden iniciar sesión.

## 3. Usuarios de la empresa (CU-03) — con `companyadmin`

- [ ] **Crear** un usuario con rol Diseñador → aparece en la lista y puede iniciar sesión.
- [ ] **Usuario o correo repetido** en la misma empresa → error, no se crea.
- [ ] **No existe la opción de crear un Administrador de la plataforma** (ese rol no se puede asignar).
- [ ] **Editar** un usuario (nombre, correo, roles) → se guarda.
- [ ] **Desactivar** un usuario → ya no puede entrar, pero **sigue apareciendo** en la lista (no se borra).

## 4. Proyectos (CU-04, CU-05)

- [ ] **Crear proyecto** con `designer` → aparece en la lista con su dueño y fecha.
- [ ] **Nombre repetido** en la misma empresa → error, no se crea.
- [ ] **Buscar** por texto → filtra la lista.
- [ ] **`developer` NO puede crear** proyectos, pero **sí los ve**.
- [ ] **Empresa recién creada** → su lista aparece vacía, con un mensaje, **no un error**.

## 5. Diagramas: crear y editar (CU-06 … CU-10) — con `designer`

- [ ] **Nuevo diagrama** dentro de un proyecto → se abre el editor vacío.
- [ ] **Nombre repetido** en el mismo proyecto → error, no se crea.
- [ ] **Agregar clase** → aparece en el lienzo.
- [ ] **Mover una clase** arrastrándola → se queda donde la sueltas.
- [ ] **Recargar (F5)** → la posición nueva **se mantuvo** (autoguardado, CP-02).
- [ ] **Agregar atributos y métodos** a una clase (nombre, tipo, visibilidad).
- [ ] **Tipo de dato inválido** (por ejemplo `Foo`) → lo rechaza con mensaje claro.
- [ ] **Nombre de clase repetido** → lo rechaza.
- [ ] **Crear relación** entre dos clases con multiplicidades.
- [ ] **Repetir la misma relación** A→B → **se bloquea** con «la conexión entre esas clases ya existe»
      (CP-01, el caso que más miran).
- [ ] **Herencia circular** (A hereda de B y B de A) → la rechaza.
- [ ] **Eliminar** una clase → desaparece ella y sus relaciones.

## 6. Asistente de IA (CU-12, CU-13) — con `designer`

- [ ] **Instrucción sencilla**: «agrega una clase Cliente con nombre y email» → aparece la clase con sus dos
      atributos, colocada en el lienzo (CP-03).
- [ ] **Instrucción con relación**: «relaciona Cliente con Pedido» → crea la relación entre las clases que
      ya existen, no unas nuevas.
- [ ] **Instrucción vacía** → no hace nada y avisa.
- [ ] **El historial** de la conversación se mantiene al recargar (CU-13).
- [ ] **Continuidad**: una segunda instrucción que se refiera a la primera («ahora ponle un teléfono») debe
      entender de qué clase hablas.

**Si el asistente responde que no está disponible**, revisa `LLM_API_KEY` y `LLM_MODEL` en el `.env`.

## 7. Generar y descargar código (CU-14, CU-15)

- [ ] **Diagrama vacío** → «Generar código» lo rechaza diciendo que el diagrama debe tener clases con
      atributos o métodos, y **no crea ninguna tarea** (CP-06).
- [ ] **Diagrama con contenido** → genera y aparece en el historial con estado **COMPLETADO** (CP-05).
- [ ] **Descargar el ZIP** con `developer` → se descarga y dentro hay `pom.xml`, `Application.java` y una
      clase por cada clase del diagrama.
- [ ] **Abrir un archivo generado** → la entidad tiene `@Entity`, su `@Id` y los atributos del diagrama.
- [ ] **`designer` no puede descargar** el ZIP (solo el Desarrollador).

## 8. XMI (CU-16) — con `designer`

- [ ] **Exportar** un diagrama → se descarga un `.xmi`.
- [ ] **Importar** ese mismo archivo → crea un diagrama nuevo con las mismas clases, atributos y relaciones
      (CP-07).
- [ ] **Importar un archivo que no es XMI** (por ejemplo una imagen renombrada a `.xmi`) → lo rechaza con un
      mensaje claro, sin romperse.

## 9. Colaboración en tiempo real (CU-17)

Necesitas **dos ventanas**: una con `designer` y otra con `designer2`, en el **mismo diagrama**.

- [ ] Ambas muestran que están **conectadas** y se ven como participantes.
- [ ] **Agrega una clase en la ventana A** → aparece en la B **sin recargar** (CP-09).
- [ ] **Mueve una clase en B** → se mueve en A.
- [ ] **Edita en A una clase que B está editando** → aviso de elemento bloqueado.
- [ ] **Cierra una ventana** → la otra actualiza la lista de participantes.

## 10. Diagrama de secuencia (CU-20) — con `designer`

- [ ] **Generar diagrama de secuencia** desde un diagrama de clases con métodos → crea uno nuevo y lo abre.
- [ ] Las **líneas de vida** corresponden a clases del diagrama de origen.
- [ ] Los **mensajes** usan nombres de métodos que existen.
- [ ] **Desde un diagrama vacío** → lo rechaza avisando de que está incompleto.

## 11. Consultar (CU-11)

- [ ] **`developer` abre un diagrama** → lo ve en **solo lectura**, con zoom y desplazamiento, y **no puede
      editarlo**.
- [ ] El **diagrama de secuencia** también se puede consultar.

## 12. Notificaciones (CU-19)

- [ ] Tras **generar código**, aparece una notificación **Código listo** en la pantalla de Notificaciones.
- [ ] **Marcar como leída** → cambia de estado.
- [ ] **Filtrar «solo sin leer»** → funciona.
- [ ] Un usuario **no ve** las notificaciones de otro.

### Avisos push del navegador

Usa una **ventana normal de Chrome** (en incógnito Chrome desactiva esta función a propósito).

- [ ] En **Notificaciones** aparece el recuadro con **«Activar avisos»**.
- [ ] Al pulsarlo, Chrome **pide permiso**; al aceptar, el recuadro pasa a estado activo.
- [ ] **Genera código** con la pestaña visible → aparece un aviso en la esquina.
- [ ] **Minimiza el navegador** y genera código otra vez → llega una **notificación de Windows**.
- [ ] **Desactivar** los avisos → el recuadro vuelve a ofrecer activarlos.

## 13. Aislamiento entre empresas (lo más importante en seguridad)

- [ ] Crea un proyecto con un usuario de la **empresa A**.
- [ ] Copia la dirección del navegador (la que lleva el identificador del proyecto o del diagrama).
- [ ] Entra con un usuario de la **empresa B** y pega esa dirección → debe decir que **no existe**
      (no «no tienes permiso»: no puede revelar que existe).

---

## Qué anotar si algo falla

1. Qué hacías, con qué usuario y en qué pantalla.
2. Qué esperabas y qué pasó.
3. El mensaje de error tal cual aparece.
4. Si el error viene del servidor, ayuda mucho el registro: `docker logs diagramas-backend-1 --tail 50`.
