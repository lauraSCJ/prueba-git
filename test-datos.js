// test-datos.js
const fetch = require('node-fetch'); // Necesitarás instalar node-fetch: npm install node-fetch

const API_URL = 'http://localhost:3000/datos';
const API_KEY = 'PORT'; // Reemplaza con tu API_KEY real

const testData = {
  "nonbra": "Laura",
  "edad": 22
};

async function testEndpoint() {
  try {
    console.log("Probando endpoint /datos...");
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': API_KEY
      },
      body: JSON.stringify(testData)
    });

    const data = await response.json();
    console.log("Respuesta del servidor:");
    console.log(data);
    console.log(`Status: ${response.status}`);
  } catch (error) {
    console.error("Error en la prueba:");
    console.error(error);
  }
}

testEndpoint();
