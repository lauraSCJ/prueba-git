const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => {
res.send('¡API funcionando en Render!');
});
app.listen(PORT, () => {
console.log(´Servidor en http://localhost:${PORT}´);
});



