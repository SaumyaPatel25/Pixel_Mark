export interface FAQItem {
  question: string;
  answer: string;
}

export const faqs: FAQItem[] = [
  {
    question: "What is STAGE and how does it optimize visual website feedback?",
    answer: "STAGE is an AI-ready visual website feedback and QA bug reporting software developed by Entrext Labs. It enables product managers, designers, and clients to click any DOM element, 3D WebGL mesh, or canvas coordinate on a live website and pin contextual feedback directly on the page, reducing website revision cycles by over 65% without screenshots or browser extensions."
  },
  {
    question: "How does STAGE enable zero-extension visual feedback on live websites?",
    answer: "STAGE uses dynamic viewport hydration and a secure proxy architecture that overlays an interactive annotation canvas directly over your live web pages, staging servers, or local environments. Reviewers do not need to install Chrome extensions, download desktop apps, or register accounts to leave feedback."
  },
  {
    question: "How does STAGE capture 3D WebGL and Three.js canvas coordinates?",
    answer: "STAGE features native 3D raycasting and drawing buffer capture. When a reviewer clicks on a 3D scene, STAGE calculates the exact raycast intersection vector, mesh identifier, face index, and viewport coordinates, enabling spatial 3D bug reporting that standard 2D screenshot tools cannot perform."
  },
  {
    question: "Can non-technical clients and external stakeholders use STAGE without coding?",
    answer: "Yes. Clients simply open a secure review link, click any element they want to discuss, drop a pin, and type their feedback. STAGE automatically captures exact CSS selectors, viewport resolutions, operating system specs, and console logs in the background for developers."
  },
  {
    question: "How do developers export feedback into engineering tasks and GitHub checklists?",
    answer: "Developers can filter all feedback by status, page URL, or urgency in the project dashboard and export comments directly into GitHub-compatible Markdown checklists, Linear issues, Jira tasks, or structured CSV spreadsheets with a single click."
  },
  {
    question: "How does STAGE protect client privacy and staging environment security?",
    answer: "All review sessions are protected by tokenized URLs, secure TLS encryption, and scoped session identifiers. Sensitive authentication tokens, cookies, and private staging secrets are never exposed to public reviewers."
  },
  {
    question: "How can I contact Entrext Labs engineering for custom integrations?",
    answer: "You can contact Saumya Patel and the Entrext Labs core team directly at saumya@entrext.com or connect via our LinkedIn company page (linkedin.com/company/entrext) and X (@Stage0fficial) for custom workspace setups, developer APIs, and enterprise support."
  }
];
