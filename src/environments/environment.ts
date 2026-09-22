export const environment = {
  production: false,
  // En dev con `ng serve`: backend local directo.
  // Con Docker el contenedor nginx reemplaza el placeholder de prod al arrancar.
  apiUrl: 'http://localhost:3000/api',
  appUrl: 'http://localhost:4200'
};