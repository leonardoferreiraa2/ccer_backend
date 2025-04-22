const { Recipient, EmailParams, MailerSend } = require("mailersend");

const mailersend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY,
});

const sendNewPasswordEmail = async (email, nome, senha) => {
  try {
    const recipients = [new Recipient(email, nome)];

    const emailParams = new EmailParams()
      .setFrom({
        email: process.env.EMAIL_FROM,
        name: "Sistema CCER"  // Agora o nome é definido diretamente no setFrom
      })
      .setTo(recipients)
      .setSubject('Sua nova senha')
      .setHtml(`
        <h1>Olá ${nome},</h1>
        <p>Sua nova senha para acesso ao sistema é: <strong>${senha}</strong></p>
        <p>Recomendamos que você altere esta senha após o primeiro login.</p>
        <p>Atenciosamente,<br>Equipe do Sistema</p>
      `)
      .setText(`
        Olá ${nome},
        Sua nova senha para acesso ao sistema é: ${senha}
        Recomendamos que você altere esta senha após o primeiro login.
        Atenciosamente,
        Equipe do Sistema
      `);

    const response = await mailersend.email.send(emailParams);
    console.log('E-mail enviado:', response);
    return true;
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    return false;
  }
};

module.exports = { sendNewPasswordEmail };