// Librerías
const express = require('express');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs'); // LÍNEA para hashear contraseñas
const cors = require('cors');

// Inicialización de Express
const app = express();

app.use(cors()); // Habilita CORS

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
        // Agrega "usuario" a la destructuración
const { fecha, hora, ubicacion, dispositivo, usuario } = req.body;

if (!fecha || !hora || !ubicacion || !dispositivo || !usuario) {
  return res.status(400).json({
    success: false,
    message: "Faltan campos obligatorios: fecha, hora, ubicacion, dispositivo o usuario"
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
  fecha_dato: fecha,
  hora_dato: hora,
  ubicacion: {
    latitud: ubicacion.latitud,
    longitud: ubicacion.longitud
  },
  dispositivo,
  usuario, // ✅ GUARDAMOS EL USUARIO
  fecha_registro: new Date()
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


// Endpoint actualizado (/crear-cuenta)

app.post('/crear-cuenta', async (req, res) => {
    try {
        const {
            nombreCuidador,
            edadCuidador,
            ocupacionCuidador,
            parentescoCuidador, // Corregido nombre
            usuario,
            contrasena,
            correo,
            telefono
        } = req.body;

        // Validación mejorada
        if (!nombreCuidador || !edadCuidador || !ocupacionCuidador || 
            !parentescoCuidador || !usuario || !contrasena || !correo || !telefono) {
            return res.status(400).json({ success: false, message: 'Todos los campos son requeridos.' });
        }

        const collection = db.collection("usuarios");

        // Verifica usuario/correo existente
        const usuarioExistente = await collection.findOne({ $or: [{ usuario }, { correo }] });
        if (usuarioExistente) {
            return res.status(400).json({ 
                success: false, 
                message: usuarioExistente.usuario === usuario ? 'El usuario ya existe' : 'El correo ya está registrado' 
            });
        }

        // Hashear contraseña
        const hashedPassword = await bcrypt.hash(contrasena, 10);

        const result = await collection.insertOne({
            nombreCuidador,
            edadCuidador: parseInt(edadCuidador),
            ocupacionCuidador,
            parentescoCuidador,
            usuario,
            contrasena: hashedPassword,
            correo: correo.toLowerCase(),
            telefono,
            fecha_creacion: new Date()
        });

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
        console.error('Error al crear cuenta:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});


// POST LOGIN para iniciar sesión

app.post('/login', async (req, res) => {
  try {
    const { usuario, contrasena } = req.body;

    if (!usuario || !contrasena) {
      return res.status(400).json({
        success: false,
        message: 'Usuario y contraseña son requeridos'
      });
    }

    const collection = db.collection("usuarios");

    // Buscar el usuario por nombre de usuario
    const user = await collection.findOne({ usuario });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Comparar contraseñas
    const passwordMatch = await bcrypt.compare(contrasena, user.contrasena);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Contraseña incorrecta'
      });
    }

    // Si llegó aquí, login exitoso
    res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso',
      data: {
        id: user._id,
        nombreCuidador: user.nombreCuidador,
        usuario: user.usuario,
        correo: user.correo
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// GET LOGIN buscar usuario sin contraseña
app.get('/usuario/:usuario', async (req, res) => {
  try {
    const usuario = req.params.usuario;
    const user = await db.collection('usuarios').findOne(
      { usuario },
      { projection: { contrasena: 0 } }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al buscar usuario',
      error: error.message
    });
  }
});


// GET /datos-ubicacion: Devuelve todos los datos de ubicación de los dispositivos
app.get('/datos-ubicacion', async (req, res) => {
  try {
    const filtro = {};

    // 🔁 CAMBIO: ahora se puede filtrar por dispositivo en vez de usuario
    if (req.query.dispositivo) {
      filtro.dispositivo = req.query.dispositivo;
    }

    const datosUbicacion = await db.collection(COLLECTION_DATOS)
      .find(filtro)
      .project({ ubicacion: 1, dispositivo: 1, fecha_dato: 1, hora_dato: 1, usuario: 1 })
      .sort({ fecha_registro: -1 })
      .toArray();

    if (datosUbicacion.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No hay datos de ubicación disponibles'
      });
    }

    res.status(200).json({
      success: true,
      data: datosUbicacion
    });

  } catch (error) {
    console.error('Error al obtener datos de ubicación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener datos de ubicación',
      error: error.message
    });
  }
});

// Iniciar servidor
app.listen(PORT, async () => {
    await conexionMongoDB();
    console.log(`🚀 Servidor listo en http://localhost:${PORT}`);
});