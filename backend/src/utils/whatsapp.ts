import axios from "axios";
import { env } from "../config/env";
import { logger } from "../lib/logger";

const pinbotMessagesUrl = (): string =>
  `https://partnersv1.pinbot.ai/v3/${env.whatsapp.pinbotPhoneNumberId}/messages`;

// A free-form `sendWhatsappMessage` used to live here. It was unused, and the
// WhatsApp Business API only accepts free-form text inside a 24-hour customer
// service window — every notification this backend sends is template-based.

type SendTemplateArgs = {
  to: string;
  templateName: string;
  /** not used in payload (kept optional for call-site compatibility) */
  templateId?: string;
  /** body params */
  parameters: string[];
  headerImageUrl?: string;
  /** default "en" */
  languageCode?: string;
};

export const sendWhatsappTemplateMessage = async ({
  to,
  templateName,
  parameters,
  headerImageUrl,
  languageCode = "en",
}: SendTemplateArgs) => {
  try {
    const components: Array<Record<string, unknown>> = [];

    // If the template header expects an IMAGE, this MUST be sent
    if (headerImageUrl) {
      components.push({
        type: "header",
        parameters: [{ type: "image", image: { link: headerImageUrl } }],
      });
    }

    // Body params
    if (parameters?.length) {
      components.push({
        type: "body",
        parameters: parameters.map((text) => ({ type: "text", text: String(text ?? "") })),
      });
    }

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
    };

    const res = await axios.post(pinbotMessagesUrl(), payload, {
      headers: {
        "Content-Type": "application/json",
        apikey: env.whatsapp.pinbotApiKey,
      },
    });

    return res.data;
  } catch (error: any) {
    logger.error({ err: error?.response?.data || error?.message }, "WhatsApp template send failed");
    throw error;
  }
};
