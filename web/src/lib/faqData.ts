export interface FAQItem {
  question: string;
  answer: string;
  category?: 'about' | 'how-it-works' | 'comparisons' | 'access-privacy';
}

export const faqs: FAQItem[] = [
  {
    category: 'about',
    question: "What is STAGE?",
    answer: "STAGE is a tool for getting feedback on a live website. You share a review link. Clients and teammates click the page to comment. Your developer sees the exact element and a screenshot."
  },
  {
    category: 'about',
    question: "Do my clients need an account?",
    answer: "No. Clients open the link, enter their name and comment. They install nothing."
  },
  {
    category: 'about',
    question: "Does it work on staging sites?",
    answer: "Yes, on any staging or live page at a public address. It does not work on localhost or private networks. Password-protected staging is not supported yet."
  },
  {
    category: 'about',
    question: "Can I change the website address of a project?",
    answer: "No. Create a new project to review a different site."
  },
  {
    category: 'how-it-works',
    question: "Will my site work inside STAGE?",
    answer: "Most public sites do. If a page cannot open, STAGE tells you. Pages that are not built for phones may look cut off in phone view."
  },
  {
    category: 'how-it-works',
    question: "Does it work with 3D sites?",
    answer: "Yes. You can place comments on 3D pages as well as on standard pages."
  },
  {
    category: 'how-it-works',
    question: "Can I send comments to GitHub?",
    answer: "Yes. Turn a comment into a GitHub issue."
  },
  {
    category: 'comparisons',
    question: "Is it a project management tool?",
    answer: "No. STAGE is for reviewing websites. Keep using your task tool for tasks."
  },
  {
    category: 'comparisons',
    question: "Does it replace Figma?",
    answer: "No. Use Figma to design. Use STAGE after the page is built, to review the real website."
  },
  {
    category: 'access-privacy',
    question: "Who can see my site and comments?",
    answer: "Only people with your review link. You can add a password to any link."
  },
  {
    category: 'access-privacy',
    question: "How long do you keep my projects?",
    answer: "Projects with no activity for 10 days are deleted after a warning."
  },
  {
    category: 'about',
    question: "How much does it cost?",
    answer: "Free for one project. See Pricing for paid plans."
  }
];
