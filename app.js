const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();
const PORT = 3000;

// ✅ Cadena de conexión CORRECTA - EJEMPLO (usa la TUYA de MongoDB Atlas)
const uri = "mongodb+srv://apiUser:ZKST2xdoY7aif74@clusterapi.ynelw9w.mongodb.net/?retryWrites=true&w=majority&appName=ClusterAPI";

// Conexión a MongoDB
async function connectDB() {
  const client = new MongoClient(uri); // <-- Usa la misma variable (uri)
  try {
    await client.connect();
    console.log("✅ Conectado a MongoDB Atlas");
    return client.db("miBasedeDatos"); // Nombre CORRECTO de tu base de datos
  } catch (err) {
    console.error("❌ Error de conexión:", err);
  }
}

// Ruta de prueba
app.get('/hola', (req, res) => {
 console.log("llego un dato");
 res.send('Hola Mundo');
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor en http://0.0.0.0:${PORT}`); // <-- Usa backticks
  connectDB(); // Opcional: Probar conexión al iniciar
});
