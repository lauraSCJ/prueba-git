// --- Librerías ---
const express = require('express'); // Framework web para construir APIs y aplicaciones web.
const { MongoClient } = require('mongodb'); // Driver oficial de MongoDB para interactuar con la base de datos.
const cors = require('cors'); // Middleware para habilitar Cross-Origin Resource Sharing (CORS). Esencial para permitir solicitudes desde diferentes orígenes (como tu ESP32 o tu frontend web).

// --- Inicialización de la Aplicación Express ---
const app = express(); // Crea una instancia de la aplicación Express.

// --- Middlewares Esenciales ---
// Habilita CORS para todas las rutas. Permite que cualquier dominio pueda hacer solicitudes a esta API.
app.use(cors());
// Middleware para parsear el cuerpo de las solicitudes entrantes con formato JSON.
// Los datos JSON enviados en el cuerpo de una solicitud POST/PUT estarán disponibles en req.body.
app.use(express.json());
// Middleware para parsear cuerpos de solicitud con datos codificados en URL (ej. de formularios HTML simples).
// extended: true permite el parseo de objetos y arrays anidados en el cuerpo.
app.use(express.urlencoded({ extended: true }));

// --- Variables de Configuración del Servidor ---
// Define el puerto en el que el servidor escuchará.
// process.env.PORT es utilizado por servicios de hosting como Render.com para asignar un puerto dinámicamente.
// Si no está definido (ej. en desarrollo local), usará el puerto 3000.
const PORT = process.env.PORT || 3000;

// --- Configuración de MongoDB ---
// URL de conexión a tu clúster de MongoDB Atlas.
// ¡ADVERTENCIA DE SEGURIDAD! En un entorno de producción real, esta URL (que contiene usuario y contraseña)
// DEBERÍA ser almacenada en una variable de entorno (ej. process.env.MONGO_URI) y no directamente en el código.
const URL_CONEXION_MONGO = "mongodb+srv://apiUser:ZKST2xdoY7aif74@clusterapi.ynelw9w.mongodb.net/?retryWrites=true&w=majority&appName=ClusterAPI";
let db; // Variable global para almacenar la instancia de la base de datos conectada.

// Nombres de las bases de datos y colecciones en MongoDB.
const NOMBRE_BASE_DE_DATOS_MONGODB = "Alzheimer";
const COLLECTION_DATOS_EQUIPOS = "datos"; // Colección para guardar datos de los equipos (GPS, etc.)
const COLLECTION_PACIENTES_REGISTRADOS = "pacientes"; // Colección para guardar datos de nuevos pacientes (nombre, edad, etc.)

// --- Definición de Rutas de la API ---
const RUTA_ENVIAR_DATOS_EQUIPO = "/enviar"; // Ruta para recibir datos de equipos (POST)
const RUTA_OBTENER_DATOS_EQUIPO = "/recibir"; // Ruta para obtener el dato más reciente de equipos (GET)
const RUTA_REGISTRAR_NUEVO_PACIENTE = "/nuevo-paciente"; // Ruta para registrar un nuevo paciente (POST)

// --- Función para Conectar a MongoDB ---
/**
 * Función asíncrona para establecer una conexión con MongoDB Atlas.
 * Si la conexión es exitosa, asigna la instancia de la base de datos a la variable global db.
 * Si la conexión falla, registra el error en la consola y termina el proceso del servidor.
 */
async function conexionMongoDB() {
    try {
        const client = new MongoClient(URL_CONEXION_MONGO); // Crea un nuevo cliente de MongoDB.
        await client.connect(); // Intenta conectar al clúster de MongoDB.
        db = client.db(NOMBRE_BASE_DE_DATOS_MONGODB); // Asigna la base de datos específica a la variable db.
        console.log("✅ Conectado a MongoDB Atlas"); // Mensaje de éxito en la consola.
    } catch (err) {
        console.error("❌ Error de conexión a MongoDB:", err); // Registra el error de conexión.
        process.exit(1); // Termina el proceso de Node.js con un código de error (1).
    }
}

// --- Rutas de la API ---

// POST /nuevo-paciente: Recibe los datos enviados desde el formulario de "Crear Nueva Cuenta"
// para registrar un nuevo paciente en la base de datos.
app.post(RUTA_REGISTRAR_NUEVO_PACIENTE, async (req, res) => {
    try {
        // Registra en consola los datos recibidos en esta ruta para depuración.
        console.log(📥 Solicitud POST recibida en ${RUTA_REGISTRAR_NUEVO_PACIENTE}:, req.body);

        // Desestructura los campos esperados del cuerpo de la solicitud (req.body).
        // Estos nombres deben coincidir con los 'name' o 'id' de tus inputs en el HTML del formulario.
        const {
            nombreCuidador,
            edad,
            ocupacion,
            parentesco,
            usuario,
            email,
            telefono,
            password, // Contraseña sin cifrar (¡RECORDATORIO: Cifrar en producción!)
            confirmPassword
        } = req.body;

        // Validación básica de campos obligatorios.
        if (!nombreCuidador || !edad || !usuario || !email || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Faltan campos obligatorios para registrar el paciente."
            });
        }

        // Validación de coincidencia de contraseñas.
        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Las contraseñas no coinciden."
            });
        }

        // --- Lógica de Negocio Adicional (Recomendado para Producción): ---
        // 1. Cifrado de Contraseña: Utiliza una librería como 'bcrypt' para hashear la contraseña
        //    antes de guardarla en la base de datos. ¡Esto es CRÍTICO para la seguridad!
        //    Ej: const hashedPassword = await bcrypt.hash(password, 10);
        // 2. Verificación de Unicidad: Comprueba si el 'usuario' o 'email' ya existen en la
        //    colección pacientesRegistrados para evitar duplicados.
        // 3. Validación de Formato: Valida el formato del email, la edad, etc.

        // Accede a la colección de pacientes.
        const pacientesCollection = db.collection(COLLECTION_PACIENTES_REGISTRADOS);
        // Inserta el nuevo documento de paciente en la colección.
        const result = await pacientesCollection.insertOne({
            nombreCuidador,
            edad: parseInt(edad), // Asegura que la edad se guarde como número
            ocupacion,
            parentesco,
            usuario,
            email,
            telefono,
            password_hash: password, // Aquí DEBERÍA ir la contraseña cifrada
            fechaRegistro: new Date() // Marca de tiempo de cuándo se registró el paciente.
        });

        // Envía una respuesta exitosa al cliente (el navegador web).
        res.status(201).json({
            success: true,
            message: Paciente agregado exitosamente a la colección ${COLLECTION_PACIENTES_REGISTRADOS}.,
            data: {
                id: result.insertedId, // El ID único generado por MongoDB para el nuevo documento.
                usuario: usuario,
                email: email
            }
        });

    } catch (err) {
        // Manejo de errores: Registra el error y envía una respuesta de error al cliente.
        console.error(❌ Error en POST ${RUTA_REGISTRAR_NUEVO_PACIENTE}:, err);
        res.status(500).json({
            success: false,
            message: "Error interno del servidor al registrar paciente.",
            error: err.message // Envía el mensaje de error para depuración (evitar en producción).
        });
    }
});

// GET /recibir: Devuelve el dato de equipo más reciente de la colección datos.
// Este endpoint es útil para que tu frontend web pueda mostrar la última ubicación.
app.get(RUTA_OBTENER_DATOS_EQUIPO, async (req, res) => {
    try {
        console.log(📥 Solicitud GET recibida en ${RUTA_OBTENER_DATOS_EQUIPO}.);

        // Busca el documento más reciente en la colección COLLECTION_DATOS_EQUIPOS.
        // .sort({ fechaRecepcionServidor: -1 }) ordena los documentos de forma descendente por la fecha de recepción.
        // .limit(1) asegura que solo se obtenga el primer (más reciente) documento.
        // .toArray() convierte el cursor de MongoDB en un array.
        const datoMasReciente = await db.collection(COLLECTION_DATOS_EQUIPOS).find().sort({ fechaRecepcionServidor: -1 }).limit(1).toArray();

        // Si no se encuentra ningún dato en la colección, envía un estado 404 (Not Found).
        if (datoMasReciente.length === 0) {
            return res.status(404).json({ message: 'No hay datos de equipos aún.' });
        }

        // Envía el dato más reciente como respuesta JSON al cliente.
        res.json(datoMasReciente[0]);
    } catch (error) {
        // Manejo de errores para la ruta GET.
        console.error(❌ Error al obtener el dato en GET ${RUTA_OBTENER_DATOS_EQUIPO}:, error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al obtener el dato.',
            error: error.message
        });
    }
});

// POST /enviar: Por aquí llegan los datos de ubicación y tiempo que los equipos (ESP32) envían.
// Este endpoint está diseñado para guardar la estructura exacta que tu ESP32 está enviando.
app.post(RUTA_ENVIAR_DATOS_EQUIPO, async (req, res) => {
    try {
        // Muestra en consola el cuerpo completo del JSON recibido del ESP32.
        console.log(📥 Solicitud POST de equipo recibida en ${RUTA_ENVIAR_DATOS_EQUIPO}:, req.body);

        // Desestructura los campos principales del JSON recibido para una validación rápida.
        const { fecha, hora, ubicacion, dispositivo } = req.body;

        // Validación básica: asegura que el JSON contenga los campos esenciales de la tarjeta.
        if (!fecha || !hora || !ubicacion || !dispositivo) {
            return res.status(400).json({
                success: false,
                message: "Faltan campos obligatorios (fecha, hora, ubicacion, dispositivo) en el JSON del equipo."
            });
        }

        // Crea el documento a insertar en MongoDB.
        // El operador ...req.body copia todas las propiedades del JSON recibido (fecha, hora, ubicacion, dispositivo)
        // directamente como campos de nivel superior en el nuevo documento de MongoDB.
        const documentoEquipo = {
            ...req.body, // Copia los datos de la tarjeta (longitud, latitud, fecha, hora, dispositivo)
            fechaRecepcionServidor: new Date() // Añade una marca de tiempo del servidor (en UTC) al momento de la recepción.
        };

        // Inserta el documento en la colección de datos de equipos (COLLECTION_DATOS_EQUIPOS).
        const resultadoInsercion = await db.collection(COLLECTION_DATOS_EQUIPOS).insertOne(documentoEquipo);

        // Envía una respuesta exitosa (201 Created) al ESP32.
        res.status(201).json({
            success: true,
            message: 'Dato de equipo guardado exitosamente.',
            id: resultadoInsercion.insertedId // Devuelve el ID generado por MongoDB.
        });
    } catch (error) {
        // Manejo de errores: Registra el error y envía una respuesta de error al cliente.
        console.error(❌ Error al guardar el dato en POST ${RUTA_ENVIAR_DATOS_EQUIPO}:, error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al guardar el dato del equipo.',
            error: error.message
        });
    }
});

// --- Inicio del Servidor ---
// El servidor Express comienza a escuchar en el puerto definido.
// La conexión a MongoDB se establece de forma asíncrona ANTES de que el servidor empiece a aceptar solicitudes.
// Esto asegura que la base de datos esté lista cuando lleguen las peticiones.
app.listen(PORT, async () => {
    await conexionMongoDB(); // Espera a que la conexión a MongoDB se establezca.
    console.log(🚀 Servidor listo en http://localhost:${PORT} (ejecutándose localmente));
    console.log(🌍 URL de la API (si está desplegada en Render): https://mi-api-express.onrender.com);
});