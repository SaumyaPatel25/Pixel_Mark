export interface FAQItem {
  question: string;
  answer: string;
}

export const faqs: FAQItem[] = [
  {
    question: "What is PixelMark?",
    answer: "PixelMark is a visual website feedback tool and bug reporting platform. It allows clients, designers, and QA testers to click anywhere on a live website and pin visual feedback directly on the page without screenshots, downloads, or extensions."
  },
  {
    question: "Can clients use it without coding?",
    answer: "Yes, absolutely. Clients and non-technical reviewers do not need to write code, install extension walls, or understand layout structures. They simply click the element they want to discuss, drop a pin, and type their comment. All technical metadata is captured automatically in the background."
  },
  {
    question: "Does it work on live websites?",
    answer: "Yes. PixelMark works on live websites, staging environments, and local dev servers. It dynamically loads your web pages through a secure visual review session and overlays a collaborative feedback layer so you can annotate in real-time."
  },
  {
    question: "Can developers export feedback into implementation tasks?",
    answer: "Yes. Developers can review all pinned feedback in a unified inbox, inspect exact element selectors, browser details, and layout dimensions, and export the comments directly into implementation checklists, markdown tasks, or project tools."
  },
  {
    question: "Does a client need an account to leave reviews?",
    answer: "No. You can generate secure client review links that allow external stakeholders to view the live site and add visual feedback without needing to sign up or log in. This removes all friction from design reviews."
  },
  {
    question: "How can I contact the PixelMark team?",
    answer: "You can reach out directly to Saumya Patel and the Entrext Labs engineering team at team@pixelmark.dev or via our LinkedIn company page. We are always active and ready to assist with custom workspace integrations and feedback reviews."
  }
];
