"use client";

import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";

const FAQS = [
  {
    q: "How do I know the seva was actually performed?",
    a: "For every seva, we provide a personalized video snippet where the Goswami priest explicitly mentions your name, city, and Sankalp purpose during the ritual.",
  },
  {
    q: "Can I choose the time for the seva?",
    a: "Sevas are performed according to the temple's traditional 'Ashtayam' schedule. However, you can choose between morning Shringar or evening Sandhya samay.",
  },
  {
    q: "How is the Prasad delivered internationally?",
    a: "We use premium international courier services (DHL/FedEx) to send non-perishable prasad like dry fruits, Mishri, and sacred threads (Kalawa) to devotees abroad.",
  },
];

const ModernFaqSection = () => {
  return (
    <section className="py-10 md:py-18 bg-[#7a1b1b] relative overflow-hidden">
      <div className="absolute top-[15%] right-[-15%] w-[300px] md:w-[500px] aspect-square bg-[#8b1e1e] rounded-full blur-[100px] opacity-70 pointer-events-none" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <motion.h2
          initial={{ opacity: 0, y: -15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-2xl md:text-4xl lg:text-5xl font-bold text-center mb-8 md:mb-14 text-white font-heading tracking-tight"
        >
          Frequently Asked Questions
        </motion.h2>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-3 md:space-y-5">
            {FAQS.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.45 }}
              >
                <AccordionItem
                  value={`faq-${i}`}
                  className="bg-white rounded-2xl md:rounded-[2rem] px-5 md:px-10 border-none overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300"
                >
                  <AccordionTrigger className="text-sm md:text-lg font-bold text-[#114296] hover:no-underline py-4 md:py-7 text-left gap-3">
                    <span className="flex-grow">{faq.q}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm md:text-base text-gray-500 leading-relaxed pb-4 md:pb-7 font-medium opacity-90 pr-2">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default ModernFaqSection;
