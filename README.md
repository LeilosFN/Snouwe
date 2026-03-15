## Leilos Backend

> Este backend está basado en el código de LawinServerv2 y fue modificado por Crisutf.

# Cambios y mejoras incluidas

- Incluye todas las skins hasta el Capítulo 5 - Temporada 1.

- Puedes elegir cualquier skin sin problemas y se guardará automáticamente.

- Permite establecer un fondo personalizado.

- Se han ocultado las secciones de Tienda, Pase de Batalla, Carrera y Pavos.

- Se añadió la opción de marcar como "Listo" (aunque actualmente no inicia partida, ya que no se pudieron implementar los modos de juego).

- Panel de control donde el usuario controla de forma visual su cuenta, y si es admin incluido el control de banear y expulsar a otros usuarios.

- El bot te notificara cuando te banean y por que y encima se puede apelar.

# Cómo instalar
1. Clonar el repositorio
```bash
git clone https://github.com/LeilosFN/Backend.git
cd backend-v2-main
```
2. Instalar las dependencias
```bash
npm install
```
3. Configurar el token del bot de Discord

Abre el archivo:

`Config/config.json`

Busca la línea:

`"bot_token": ""`

Y coloca tu token de Discord dentro de las comillas.

4. Cambiar la IP

Modifica la URL **api.leilos.qzz.io** por tu propia IP, ya que es la dirección a la que se conectará el backend.

5. Iniciar el backend

Ejecuta el archivo:

start.bat

Y listo.

## Nota

Si quieres ayudar en el proyecto, ¡muchas gracias!
Puedes contactarme en Discord:

Crisutf
