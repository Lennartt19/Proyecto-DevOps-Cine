export const environment = {
  production: true,
  // PLACEHOLDERS reemplazados al arrancar el contenedor nginx (docker-entrypoint.sh):
  //   __PARKY_API_URL__ -> $API_URL (ej. http://localhost:3000/api)
  //   __PARKY_APP_URL__ -> $APP_URL (ej. http://localhost:8080)
  // No poner aquí URLs de Railway: la imagen debe servir para cualquier entorno.
  apiUrl: '__PARKY_API_URL__',
  appUrl: '__PARKY_APP_URL__'
};