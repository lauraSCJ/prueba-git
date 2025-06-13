// Librerías
const express = require('express');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs'); // LÍNEA para hashear contraseñas

// Inicialización de Express
const app = express();

// Middlewares esenciales
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración
const PORT = process.env.PORT || 3000;

// Conexión a MongoDB
const URL_CONEXION_MONGO = "mongodb+srv://apiUser:ZKST2xdoY7aif74@clusterapi.ynelw9w.mongodb.net/?retryWrites=true&w=majority&appName=ClusterAPI";
let db;
const NOMBRE_BASE_DE_DATOS_MONGODB = "Alzheimer";
const COLLECTION_DATOS = "datos"; // Colección para guardar datos de los dispositivos
const COLLECTION_PACIENTES = "pacientes"; // Colección para guardar información de pacientes
const COLLECTION_USUARIOS = "usuarios";

// Rutas
const RUTA_ENVIAR = "/enviar";
const RUTA_RECIBIR = "/recibir";
const RUTA_NUEVO_PACIENTE = "/nuevo-paciente";
const RUTA_USUARIOS = "/crear-cuenta";

// Conexión a MongoDB Atlas
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

/**
 * POST /enviar: Endpoint para recibir datos de los dispositivos IoT
 * Ejemplo de body:
 * {
 *   "fecha": "2025-05-30",
 *   "hora": "20:32:22",
 *   "ubicacion": {
 *     "latitud": 19.3456,
 *     "longitud": -99.1234
 *   },
 *   "dispositivo": "Lilygo 7070g ESP32"
 * }
 */
app.post(RUTA_ENVIAR, async (req, res) => {
    try {
        console.log(`📥 Dato recibido en ${RUTA_ENVIAR}:`, req.body);

        // Validación de campos obligatorios
        const { fecha, hora, ubicacion, dispositivo } = req.body;

        if (!fecha || !hora || !ubicacion || !dispositivo) {
            return res.status(400).json({
                success: false,
                message: "Faltan campos obligatorios: fecha, hora, ubicacion o dispositivo"
            });
        }

        // Validación de estructura de ubicación
        if (!ubicacion.latitud || !ubicacion.longitud) {
            return res.status(400).json({
                success: false,
                message: "La ubicación debe contener latitud y longitud"
            });
        }

        // Crear documento para MongoDB
        const documento = {
            fecha_dato: fecha,  // Fecha proporcionada por el dispositivo
            hora_dato: hora,    // Hora proporcionada por el dispositivo
            ubicacion: {
                latitud: ubicacion.latitud,
                longitud: ubicacion.longitud
            },
            dispositivo: dispositivo,
            fecha_registro: new Date() // Fecha/hora cuando se recibió el dato en el servidor
        };

        // Insertar en la base de datos
        const resultado = await db.collection(COLLECTION_DATOS).insertOne(documento);

        // Respuesta exitosa
        res.status(201).json({
            success: true,
            message: 'Dato guardado correctamente',
            data: {
                id: resultado.insertedId,
                dispositivo: dispositivo,
                fecha: fecha,
                hora: hora
            }
        });
    } catch (error) {
        console.error(`Error en POST ${RUTA_ENVIAR}:`, error);
        res.status(500).json({
            success: false,
            error: 'Error al guardar el dato',
            detalle: error.message
        });
    }
});

// GET /recibir: devuelve el dato más reciente
app.get(RUTA_RECIBIR, async (req, res) => {
    try {
        const dato = await db.collection(COLLECTION_DATOS).find().sort({ fecha_registro: -1 }).limit(1).toArray();
        if (dato.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No hay datos disponibles'
            });
        }
        res.json({
            success: true,
            data: dato[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error al obtener el dato',
            detalle: error.message
        });
    }
});

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
            fecha_registro: new Date()
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


// Endpoint: POST /crear-cuenta
app.post(RUTA_USUARIOS, async (req, res) => {
    try {
        console.log(`📥  Dato recibido en ${RUTA_USUARIOS}:`, req.body);

        let {
            nombreCuidador,
            edadCuidador,
            ocupacionCuidador,
            parentescoCuidador, //  Campo corregido
            usuario,
            contrasena,
            correo,
            telefono
        } = req.body;

        // Validación básica
        if (
            !nombreCuidador || !edadCuidador || !ocupacionCuidador || !parentescoCuidador ||
            !usuario || !contrasena || !correo || !telefono
        ) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son requeridos.'
            });
        }

        // Validación adicional de edad
        if (isNaN(edadCuidador)) {
            return res.status(400).json({
                success: false,
                message: 'La edad debe ser un número válido.'
            });
        }

        // Normalizar el correo
        correo = correo.trim().toLowerCase();

        const collection = db.collection(COLLECTION_USUARIOS);

        const usuarioExistente = await collection.findOne({ usuario });
        if (usuarioExistente) {
            return res.status(400).json({
                status: "Error",
                message: "El usuario ya existe"
            });
        }

        const correoExistente = await collection.findOne({ correo });
        if (correoExistente) {
            return res.status(400).json({
                status: "Error",
                message: "El correo ya está registrado"
            });
        }

        // Hashear contraseña 
        const hashedPassword = await bcrypt.hash(contrasena, 10);

        // Crear nuevo usuario
        const nuevoUsuario = {
            nombreCuidador,
            edadCuidador: parseInt(edadCuidador),
            ocupacionCuidador,
            parentescoCuidador,
            usuario,
            contrasena: hashedPassword,
            correo,
            telefono,
            fecha_creacion: new Date()
        };

        const result = await collection.insertOne(nuevoUsuario);

        res.status(201).json({
            success: true,
            message: 'Cuenta creada exitosamente',
            data: {
                id: result.insertedId,
                nombreCuidador,
                correo
            }
        });

    } catch (error) {
        console.error(`Error en POST ${RUTA_USUARIOS}:`, error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});



// Iniciar servidor
app.listen(PORT, async () => {
    await conexionMongoDB();
    console.log(`🚀 Servidor listo en http://localhost:${PORT}`);
});