export type SeoPageBody = {
  h1: string;
  intro: string[];
  sections: { h2: string; paragraphs: string[] }[];
  faq?: { question: string; answer: string }[];
};
