const dotenv = require('dotenv');
const path = require('path');

// Charge les variables d'environnement locales
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const { registerBuyer } = require('../src/app/actions');

async function test() {
  console.log("Démarrage du test d'inscription et d'envoi d'e-mail...");
  console.log("RESEND_API_KEY présente :", !!process.env.RESEND_API_KEY);
  
  const eventId = 'f23ce617-4d9f-4865-8069-b432bcfa44c4'; // Dead or Alive event ID
  const buyerName = 'Test Agent';
  const tierLabel = 'Vague 0 - Michael Myers';
  const ticketCount = 1;
  const email = 'ryanblozan@gmail.com';
  
  try {
    const result = await registerBuyer(eventId, buyerName, tierLabel, ticketCount, 'verified', email);
    console.log("Résultat de l'inscription :", result);
  } catch (err) {
    console.error("Erreur durant le test :", err);
  }
}

test();
