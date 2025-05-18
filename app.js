const express = require('express');
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  console.log("¡Alguien accedió a la ruta /!"); // Debug
  res.send('Funciona localmente');
});

app.listen(PORT, '0.0.0.0', () => { // '0.0.0.0' permite conexiones externas
  console.log(`Servidor REALMENTE iniciado en http://localhost:${PORT}`);
});
