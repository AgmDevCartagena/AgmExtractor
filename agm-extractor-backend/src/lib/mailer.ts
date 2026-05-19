import * as nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
});

export const sendEmail = async ({ to, subject, html }: { to: string, subject: string, html: string }) => {
    try {
        const result = await transporter.sendMail({
            from: process.env.SMTP_FROM_EMAIL,
            to,
            subject,
            html,
        });
        console.log('Correo enviado exitosamente:', result.messageId);
        return result;
    } catch (error) {
        console.error('Error detallado al enviar correo:', error);
        throw error;
    }
};
