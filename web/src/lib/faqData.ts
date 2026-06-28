export interface FAQItem {
  question: string;
  answer: string;
}

export const faqs: FAQItem[] = [
  {
    question: "What does PixelMark do?",
    answer: "PixelMark is a visual feedback and website review platform that lets you drop precise feedback pins directly onto any webpage. It records the exact HTML element, CSS selector, computed styles, and browser diagnostics so developers can debug visual issues instantly without needing to reproduce them."
  },
  {
    question: "Who built PixelMark and why does it exist?",
    answer: "PixelMark was designed and engineered by Saumya Patel and the Entrext Labs team. We built it to end the frustrating cycle of vague 'it looks broken' bug reports. PixelMark bridges the communication gap between designers, clients, QA teams, and developers by translating clicks into actionable code contexts."
  },
  {
    question: "How do PixelMark review links work?",
    answer: "When you create a project in the PixelMark dashboard, it generates a secure review link. You can share this link with clients or stakeholders. Reviewers do not need to create an account or sign in—they can open the link and start pinning feedback immediately."
  },
  {
    question: "How are feedback pins captured?",
    answer: "When a reviewer clicks on a webpage, the PixelMark agent captures the exact element's tag name, CSS selector path, and computed styles. It also logs browser metadata, viewport dimensions, console errors, and network logs. This is packaged alongside a high-fidelity viewport screenshot."
  },
  {
    question: "What happens after a website is reviewed using PixelMark?",
    answer: "All feedback pins are synced in real-time via WebSockets to the developer's PixelMark Review Inbox. From there, you can inspect the technical metadata, mark issues as resolved, export reviews to structured Markdown/JSON, or push them directly to GitHub Issues or Linear in a single click."
  },
  {
    question: "Does PixelMark work with modern web architectures like SPAs, shadow trees, Canvas, and WebGL?",
    answer: "Yes. PixelMark is built for the modern web. Our secure runtime engine resolves relative assets and script origins across Single Page Applications (SPAs). It penetrates encapsulated shadow trees and includes specialized context mapping for Canvas and WebGL (with native Three.js raycasting support) to track 3D object clicks."
  },
  {
    question: "Is a Chrome Extension or extra software required to use PixelMark?",
    answer: "None at all. PixelMark injects its lightweight client-side agent directly via the secure runtime. This eliminates extension installation barriers, allowing reviewers to submit feedback from any modern desktop or mobile browser."
  },
  {
    question: "How can I contact the PixelMark team or owner?",
    answer: "You can reach out directly to Saumya Patel and the Entrext Labs engineering team at team@pixelmark.dev or via our LinkedIn company page. We are always active and ready to assist with custom workspace integrations and feedback reviews."
  }
];
