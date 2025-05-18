const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para JSON
app.use(express.json());

// Ruta GET existente
app.get("/", (req, res) => {
  res.send("API funcionando en Render y localmente!");
});

// ✨ Nueva ruta GET /hola
app.get("/hola", (req, res) => {
  res.send("Hola Mundo");
});

// Ruta POST existente (si la tienes)
app.post("/datos", (req, res) => {
  res.json({ mensaje: "Datos recibidos" });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor en puerto ${PORT}`);
});
