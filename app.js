const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

// ¡IMPORTANTE! Middleware para recibir JSON
app.use(express.json());

// Ruta GET (ya funciona)
app.get("/", (req, res) => {
  res.send("API funcionando en Render y localmente!");
});

// ✨ Añade esta ruta POST (fíjate en "/datos")
app.post("/datos", (req, res) => {  // <-- ¡Coincide con lo que envías en Postman!
  console.log("Datos recibidos:", req.body);
  res.json({ 
    mensaje: "POST exitoso",
    datos_recibidos: req.body 
  });
});

app.listen(PORT, () => {
  console.log(`Servidor en puerto ${PORT}`);
});

