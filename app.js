const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON (necesario para recibir datos POST)
app.use(express.json());

// Ruta GET en la raíz
app.get('/', (req, res) => {
    res.send('¡API funcionando en Render!');
});

// Ruta POST en la raíz
app.post('/', (req, res) => {
    console.log(req.body); // Verifica los datos recibidos
    res.send('¡POST recibido correctamente!');
});

// Iniciar servidor (solo UNA vez)
app.listen(PORT, () => {
    console.log(`Servidor en http://localhost:${PORT}`);
});
