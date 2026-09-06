import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs: { question: string; answer: string }[] = [
  {
    question: "Do we need a registered business to reach out?",
    answer:
      "No. We work with running businesses, but also with founders at the idea stage, schools, government units, and non-profits. The form asks what stage you're at so we can skip the questions that don't apply to you.",
  },
  {
    question: "We're not sure exactly what system we need. Is that okay?",
    answer:
      "Yes. Most inquiries start that way. Tell us what's slowing you down and what you're hoping to change; figuring out the right system is part of the conversation, not a prerequisite for having it.",
  },
  {
    question: "How is pricing worked out?",
    answer:
      "There's no fixed price list. Cost depends on scope, so we talk through the problem first, then come back with a proposal sized to what's actually needed rather than a generic package.",
  },
  {
    question: "How soon can we start?",
    answer:
      "We usually reply within 1 business day of your inquiry to schedule a first conversation. How soon actual work begins depends on scope and our current workload.",
  },
  {
    question: "Do you support the system after it launches?",
    answer:
      "Yes. We stay involved after launch for fixes, adjustments, and the improvements that only become obvious once real people are using the system day to day.",
  },
  {
    question: "What happens right after we submit the form?",
    answer:
      "We review what you've shared and reach out to schedule a call. There's no automated quote or sales sequence; a person reads every submission.",
  },
];

export function Faq() {
  return (
    <Accordion type="single" collapsible className="w-full">
      {faqs.map((item, index) => (
        <AccordionItem key={item.question} value={`item-${index}`}>
          <AccordionTrigger className="text-left text-base font-semibold">
            {item.question}
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            {item.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
