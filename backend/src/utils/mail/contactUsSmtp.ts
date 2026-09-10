import type nodemailer from "nodemailer";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import { transporter } from "./smtp";

/** Simple HTML wrapper for contact-us emails. */
const getBaseTemplate = (title: string, bodyContent: string): string => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h2 { color: #333; }
        p { font-size: 16px; }
        hr { margin: 20px 0; }
      </style>
    </head>
    <body>
      ${bodyContent}
    </body>
    </html>
  `;
};

/** Contact Us form submission (Vedic Vaibhav main website), with optional image attachments. */
const sendContactUsMailVedicVaibhavMain = async ({
  name,
  email,
  number,
  description,
  images,
}: {
  name: string;
  email: string;
  number: string;
  description: string;
  images?: Express.Multer.File[];
}): Promise<void> => {
  const bodyContent = `
    <h2>New Contact Us Form Submission (Vedic Vaibhav Main)</h2>
    <p>You have received a new message from the "Contact Us" form on the website.</p>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Phone Number:</strong> ${number}</p>
    <p><strong>Description:</strong> ${description}</p>
    <hr>
    <p>This message was sent from the Vedic Vaibhav website.</p>
  `;

  const mailOptions: nodemailer.SendMailOptions = {
    from: `"Vedic Vaibhav" <${env.smtp.email}>`,
    to: "support@vedicvaibhav.com",
    subject: `New Contact Us Form Submission (Vedic Vaibhav Main) from ${name}`,
    html: getBaseTemplate("Contact Us Submission", bodyContent),
  };

  if (images && images.length > 0) {
    mailOptions.attachments = images.map((image) => ({
      filename: image.originalname,
      content: image.buffer,
      contentType: image.mimetype,
    }));
  }

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    logger.error({ err: error }, "Error sending Contact Us email");
    throw error;
  }
};

export { sendContactUsMailVedicVaibhavMain };
