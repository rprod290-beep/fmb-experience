/**
 * Service d'envoi d'e-mails utilisant l'API REST de Resend.
 * Permet d'envoyer des confirmations d'achat avec QR Code aux clients.
 */
export async function sendTicketEmail(
  toEmail: string,
  buyerName: string,
  eventTitle: string,
  ticketTier: string,
  quantity: number,
  confirmationCode: string,
  eventDate: string,
  slug: string
): Promise<{ success: boolean; error?: any }> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn("RESEND_API_KEY est manquante dans l'environnement. E-mail non envoyé.");
    return { success: false, error: "API key missing" };
  }

  // URL du billet avec le QR Code
  // On récupère le host depuis l'environnement ou on utilise fmb-experience.com par défaut
  const host = process.env.NEXT_PUBLIC_SITE_URL || 'https://fmb-experience.com';
  const ticketUrl = `${host}/evenements/${slug}/merci?code=${confirmationCode}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Votre Billet - FMB Expérience</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #050508; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #050508; padding: 40px 10px;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #09090b; border: 1px solid rgba(255,255,255,0.05); border-radius: 24px; overflow: hidden; padding: 40px 20px; text-align: center;">
              
              <!-- En-tête -->
              <tr>
                <td style="padding-bottom: 25px;">
                  <span style="font-size: 10px; font-weight: 800; color: #f472b6; text-transform: uppercase; letter-spacing: 2px; background-color: rgba(219,39,119,0.1); padding: 6px 16px; border-radius: 9999px; border: 1px solid rgba(219,39,119,0.2); display: inline-block; margin-bottom: 15px;">
                    Confirmation d'Achat
                  </span>
                  <h1 style="color: #ffffff; text-transform: uppercase; letter-spacing: 4px; font-size: 28px; font-weight: 900; margin: 0;">
                    FMB <span style="background: linear-gradient(to right, #a855f7, #ec4899, #f97316); -webkit-background-clip: text; color: transparent;">EXPÉRIENCE</span>
                  </h1>
                </td>
              </tr>

              <!-- Message principal -->
              <tr>
                <td style="color: #e4e4e7; font-size: 15px; line-height: 1.6; padding-bottom: 30px;">
                  Bonjour <strong>${buyerName}</strong>,<br><br>
                  Votre place pour l'événement <strong>${eventTitle}</strong> a bien été réservée !
                </td>
              </tr>

              <!-- Récapitulatif du billet -->
              <tr>
                <td align="left" style="background-color: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 25px; margin-bottom: 30px; display: block;">
                  <h3 style="margin-top: 0; margin-bottom: 15px; color: #ffffff; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px;">
                    Détails du Billet
                  </h3>
                  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="color: #a1a1aa; font-size: 13px;">
                    <tr>
                      <td style="padding: 5px 0;">Événement :</td>
                      <td align="right" style="color: #ffffff; font-weight: bold;">${eventTitle}</td>
                    </tr>
                    <tr>
                      <td style="padding: 5px 0;">Date :</td>
                      <td align="right" style="color: #ffffff; font-weight: bold;">${eventDate}</td>
                    </tr>
                    <tr>
                      <td style="padding: 5px 0;">Catégorie :</td>
                      <td align="right" style="color: #ffffff; font-weight: bold;">${ticketTier}</td>
                    </tr>
                    <tr>
                      <td style="padding: 5px 0;">Places :</td>
                      <td align="right" style="color: #ffffff; font-weight: bold;">${quantity} place(s)</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0 5px 0; border-top: 1px dashed rgba(255,255,255,0.05);">Code Unique :</td>
                      <td align="right" style="padding: 10px 0 5px 0; border-top: 1px dashed rgba(255,255,255,0.05); color: #db2777; font-size: 16px; font-weight: 900; letter-spacing: 1px;">${confirmationCode}</td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Instructions adresse -->
              <tr>
                <td style="color: #a1a1aa; font-size: 13px; line-height: 1.6; padding-bottom: 35px;">
                  Pour découvrir le <strong>Lieu Secret</strong> de la soirée :<br>
                  Copiez votre <strong>Code Unique</strong> ci-dessus, cliquez sur le bouton ci-dessous, et collez-le dans la section adresse.
                </td>
              </tr>

              <!-- Bouton d'accès au QR Code -->
              <tr>
                <td style="padding-bottom: 25px;">
                  <a href="${ticketUrl}" target="_blank" style="background: linear-gradient(to right, #9333ea, #db2777, #f97316); color: #ffffff; text-decoration: none; padding: 16px 36px; border-radius: 14px; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; display: inline-block; box-shadow: 0 4px 15px rgba(219,39,119,0.35);">
                    Accéder à mon QR Code & Adresse
                  </a>
                </td>
              </tr>

              <!-- Footer de l'email -->
              <tr>
                <td style="font-size: 10px; color: #52525b; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 25px; margin-top: 25px;">
                  FMB Expérience • Cet e-mail est généré automatiquement.
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: 'FMB Expérience <billetterie@resend.dev>',
        to: toEmail,
        subject: `Confirmation de Réservation - Code : ${confirmationCode}`,
        html: htmlContent
      })
    });

    if (response.ok) {
      console.log(`E-mail envoyé avec succès à ${toEmail} pour le code ${confirmationCode}`);
      return { success: true };
    } else {
      const errorData = await response.json();
      console.error("Erreur de l'API Resend:", errorData);
      return { success: false, error: errorData };
    }
  } catch (err) {
    console.error("Exception lors de l'envoi de l'e-mail:", err);
    return { success: false, error: err };
  }
}
