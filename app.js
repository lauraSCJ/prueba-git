// Librerías
const express = require('express');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const cors = require('cors');

// Inicialización de Express
const app = express();

// Configuración
const PORT = process.env.PORT || 3000;
const URL_CONEXION_MONGO = "mongodb+srv://apiUser:ZKST2xdoY7aif74@clusterapi.ynelw9w.mongodb.net/?retryWrites=true&w=majority&appName=ClusterAPI";
const NOMBRE_BASE_DE_DATOS_MONGODB = "Alzheimer";
const COLLECTION_DATOS = "datos";
const COLLECTION_PACIENTES = "pacientes";
const COLLECTION_USUARIOS = "usuarios";

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conexión a MongoDB
let db;
async function conexionMongoDB() {
    try {
        const client = new MongoClient(URL_CONEXION_MONGO);
        await client.connect();
        db = client.db(NOMBRE_BASE_DE_DATOS_MONGODB);
        
        // Crear índices para optimización
        await db.collection(COLLECTION_DATOS).createIndex({ usuario: 1, fecha_hora: -1 });
        await db.collection(COLLECTION_USUARIOS).createIndex({ usuario: 1 }, { unique: true });
        await db.collection(COLLECTION_USUARIOS).createIndex({ correo: 1 }, { unique: true });
        
        console.log("✅ Conectado a MongoDB Atlas");
    } catch (err) {
        console.error("❌ Error de conexión a MongoDB:", err);
        process.exit(1);
    }
}

// Endpoint para recibir datos GPS
app.post('/enviar', async (req, res) => {
    try {
        const { fecha, hora, ubicacion, dispositivo, usuario } = req.body;

        // Validaciones
        if (!fecha || !hora || !ubicacion || !dispositivo || !usuario) {
            return res.status(400).json({
                success: false,
                message: "Faltan campos obligatorios"
            });
        }

        if (!ubicacion.latitud || !ubicacion.longitud) {
            return res.status(400).json({
                success: false,
                message: "La ubicación debe contener latitud y longitud"
            });
        }

        // Crear timestamp unificado
        const fechaHora = new Date(`${fecha}T${hora}:00.000Z`);

        // Insertar documento
        const resultado = await db.collection(COLLECTION_DATOS).insertOne({
            fecha_hora: fechaHora,
            ubicacion: {
                latitud: ubicacion.latitud,
                longitud: ubicacion.longitud
            },
            dispositivo,
            usuario,
            fecha_registro: new Date()
        });

        res.status(201).json({
            success: true,
            message: 'Dato guardado correctamente',
            data: {
                id: resultado.insertedId,
                fecha_hora: fechaHora.toISOString()
            }
        });
    } catch (error) {
        console.error('Error en POST /enviar:', error);
        res.status(500).json({
            success: false,
            error: 'Error al guardar el dato',
            detalle: error.message
        });
    }
});

// Endpoint para última ubicación
app.get('/ultima-ubicacion/:usuario', async (req, res) => {
    try {
        const { usuario } = req.params;
        
        const ultimaUbicacion = await db.collection(COLLECTION_DATOS)
            .find({ usuario })
            .sort({ fecha_hora: -1 })
            .limit(1)
            .project({ 
                ubicacion: 1, 
                dispositivo: 1, 
                fecha_hora: 1,
                _id: 0 
            })
            .toArray();

        if (ultimaUbicacion.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se encontraron ubicaciones'
            });
        }

        res.status(200).json({
            success: true,
            data: ultimaUbicacion[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error al obtener la última ubicación',
            detalle: error.message
        });
    }
});

// Endpoint para todas las ubicaciones
app.get('/datos-ubicacion', async (req, res) => {
    try {
        const filtro = {};
        if (req.query.usuario) {
            filtro.usuario = req.query.usuario;
        }

        const datos = await db.collection(COLLECTION_DATOS)
            .find(filtro)
            .sort({ fecha_hora: -1 })
            .project({ 
                ubicacion: 1, 
                dispositivo: 1, 
                fecha_hora: 1,
                _id: 0 
            })
            .toArray();

        res.status(200).json({
            success: true,
            data: datos
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error al obtener ubicaciones',
            detalle: error.message
        });
    }
});

// Endpoint para registro de usuarios
app.post('/crear-cuenta', async (req, res) => {
    try {
        const { nombreCuidador, edadCuidador, ocupacionCuidador, parentescoCuidador, usuario, contrasena, correo, telefono } = req.body;

        // Validaciones
        if (!nombreCuidador || !edadCuidador || !ocupacionCuidador || !parentescoCuidador || !usuario || !contrasena || !correo || !telefono) {
            return res.status(400).json({ 
                success: false, 
                message: 'Todos los campos son requeridos' 
            });
        }

        // Verificar usuario/correo existente
        const usuarioExistente = await db.collection(COLLECTION_USUARIOS).findOne({ 
            $or: [{ usuario }, { correo: correo.toLowerCase() }] 
        });

        if (usuarioExistente) {
            return res.status(400).json({ 
                success: false, 
                message: usuarioExistente.usuario === usuario ? 'Usuario ya existe' : 'Correo ya registrado' 
            });
        }

        // Hash de contraseña
        const hashedPassword = await bcrypt.hash(contrasena, 10);

        // Insertar nuevo usuario
        const resultado = await db.collection(COLLECTION_USUARIOS).insertOne({
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
                id: resultado.insertedId,
                usuario
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error al crear cuenta',
            detalle: error.message
        });
    }
});

// Endpoint para login
app.post('/login', async (req, res) => {
    try {
        const { usuario, contrasena } = req.body;

        if (!usuario || !contrasena) {
            return res.status(400).json({
                success: false,
                message: 'Usuario y contraseña son requeridos'
            });
        }

        // Buscar usuario
        const user = await db.collection(COLLECTION_USUARIOS).findOne({ usuario });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Verificar contraseña
        const passwordMatch = await bcrypt.compare(contrasena, user.contrasena);
        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Respuesta exitosa (sin contraseña)
        const userData = { ...user };
        delete userData.contrasena;
        delete userData._id;

        res.status(200).json({
            success: true,
            message: 'Inicio de sesión exitoso',
            data: userData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error en el login',
            detalle: error.message
        });
    }
});

// Iniciar servidor
app.listen(PORT, async () => {
    await conexionMongoDB();
    console.log(`🚀 Servidor listo en http://localhost:${PORT}`);
});