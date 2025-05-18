const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000; // ¡Importante para Render!

app.get("/", (req, res) => {
  console.log("¡Ruta / accedida!");
  res.send("¡API funcionando en Render y localmente!");
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor en http://localhost:${PORT}`); // Usa backticks ``
});
