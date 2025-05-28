const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();

// Middlewares esenciales
app.use(express.json()); // Para parsear JSON
app.use(express.urlencoded({ extended: true }));

// Conexión a MongoDB
const uri = "mongodb+srv://apiUser:ZKST2xdoY7aif74@cluster.mongodb.net/miDB?retryWrites=true&w=majority";
let db;

async function connectDB() {
  try {
    const client = new MongoClient(uri);
    await client.connect();
    db = client.db();
    console.log("✅ Conectado a MongoDB Atlas");
  } catch (err) {
    console.error("❌ Error de conexión a MongoDB:", err);
    process.exit(1);
  }
}

// Endpoint POST corregido
app.post('/datos', async (req, res) => {
  try {
    console.log("JSON recibido:", req.body); // Debug
    
    if (!req.body.paciente || !req.body.edad) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    // Insertar en MongoDB
    const collection = db.collection('pacientes');
    const result = await collection.insertOne({
      ...req.body,
      fecha: new Date()
    });

    res.status(201).json({
      status: "Datos guardados",
      id: result.insertedId
    });

  } catch (err) {
    console.error("Error en POST /datos:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Iniciar servidor
(async () => {
  await connectDB();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor listo en http://0.0.0.0:${PORT}`);
  });
})();