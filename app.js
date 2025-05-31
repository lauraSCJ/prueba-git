// Librerias

const express = require('express');
const { MongoClient } = require('mongodb');

// Objetos

const app = express();

// Middlewares esenciales
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Variables
const PORT = process.env.PORT || 3000;

// MongoDB
const URL_CONEXION_MONGO = "mongodb+srv://apiUser:ZKST2xdoY7aif74@clusterapi.ynelw9w.mongodb.net/?retryWrites=true&w=majority&appName=ClusterAPI";
let db;
const NOMBRE_BASE_DE_DATOS_MONGODB = "Alzheimer"
const COLLECTION_DATOS = "datos"; //Collección para estar guardando datos de los equipos
const COLLECTION_PACIENTES = "pacientes"; //Collección para estar guardando datos de los equipos

// Ir agregando las variables de las colleciones que utlices aqui 


// Rutas

const RUTA_ENVIAR = "/enviar";
const RUTA_RECIBIR = "/recibir";
const RUTA_NUEVO_PACIENTE = "/nuevo-paciente"


async function conexionMongoDB() {
    try {
        const client = new MongoClient(URL_CONEXION_MONGO);
        await client.connect();
        db = client.db(NOMBRE_BASE_DE_DATOS_MONGODB);
        console.log("✅ Conectado a MongoDB Atlas");
    } catch (err) {
        console.error("❌ Error de conexión a MongoDB:", err);
        process.exit(1);
    }
}


// El codigo tienes que irle poniendo comentarios de que hace cada cosa , comentarios clave , etc. 
// Ponerle bien el nombre a las variables por ejemplo en el codigo anterior decia:   const { nonbra, edad } = req.body; en lugar de nombre y cosas asi


// POST /nuevo-paciente: Recibe los datos enviados para agregar un nuevo paciente
app.post(RUTA_NUEVO_PACIENTE, async (req, res) => {
    try {
        console.log(`📥 Dato recibido en ${RUTA_NUEVO_PACIENTE}:`, req.body);

        const { nombre, edad } = req.body;

        if (!nombre || !edad) {
            return res.status(400).json({
                success: false,
                message: "Se requieren nombre y edad"
            });
        }

        const collection = db.collection(COLLECTION_PACIENTES);
        const result = await collection.insertOne({
            nombre,
            edad,
            fecha: new Date()
        });

        res.status(201).json({
            success: true,
            message: `Paciente agregado exitosamente a la colección ${COLLECTION_PACIENTES}`,
            data: {
                id: result.insertedId,
                nombre,
                edad
            }
        });

    } catch (err) {
        console.error(`Error en POST ${RUTA_NUEVO_PACIENTE}:`, err);
        res.status(500).json({
            success: false,
            message: "Error interno del servidor",
            error: err.message
        });
    }
});

// GET /recibir: devuelve el dato más reciente
app.get(RUTA_RECIBIR, async (req, res) => {

    try {
        console.log(`📥 Dato recibido en ${RUTA_RECIBIR}:`, req.body); // Mensaje en consola
        //Va y busca en la colección datos para trerte el dato mas reciente
        // Aqui luego vas a necesitar filtrar por fecha y por nombre del equipo ya que asi como está te va a traer el dato mas reciente sea cual sea el equipo
        const dato = await db.collection(COLLECTION_DATOS).find().sort({ fecha: -1 }).limit(1).toArray();
        if (dato.length === 0) {
            return res.status(404).json({ mensaje: 'No hay datos aún' });
        }
        res.json(dato[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el dato', detalle: error.message });
    }
});

// POST /enviar: Por aqui llegan los datos que los equipos envian
app.post(RUTA_ENVIAR, async (req, res) => {
    try {
        console.log(`📥 Dato recibido en ${RUTA_ENVIAR}:`, req.body); // Mensaje en consola

        // Puedes cambiar esto o investigar o pedirle al chatgpt que cuando recibas el json lo ac
        const documento = {
            contenido: req.body,
            fecha: new Date() //Guarda la fecha en utc , en tu pagina conviertelo a tu hora local
        };
        const resultado = await db.collection(COLLECTION_DATOS).insertOne(documento);
        res.status(201).json({ mensaje: 'Dato guardado', id: resultado.insertedId });
    } catch (error) {
        res.status(500).json({ error: 'Error al guardar el dato', detalle: error.message });
    }
});

// Iniciar servidor

app.listen(PORT, async () => {
    await conexionMongoDB();
    console.log(`🚀 Servidor listo en https://localhost:${PORT}`);
});

