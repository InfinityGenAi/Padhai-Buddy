/**
 * Conservative subject → topic keyword matching for Padhai Buddy quiz questions.
 * 
 * No AI, no external API, no new dependency. Pure deterministic keyword matching.
 * If no reliable topic is found, returns "General". Never invents a topic.
 */

// Keywords that map to specific topics within each subject.
// Only well-established school topics are included; easily extensible.
const topicMap: Record<string, Record<string, string[]>> = {
  Maths: {
    algebra: ["algebra", "equation", "variable", "x", "solve", "linear", "quadratic", "factor"],
    geometry: ["geometry", "angle", "triangle", "area", "perimeter", "circle", "shape"],
    calculus: ["calculus", "derivative", "integral", "limit", "rate", "slope"],
    statistics: ["statistics", "mean", "median", "mode", "average", "probability"],
  },
  Science: {
    physics: ["physics", "force", "motion", "energy", "work", "power", "velocity", "acceleration"],
    chemistry: ["chemistry", "atom", "molecule", "reaction", "element", "compound", "ph", "balance"],
    biology: ["biology", "cell", "dna", "evolution", "ecosystem", "photosynthesis"],
  },
};

// Normalize a string for matching: lowercase, trim, remove punctuation
function normalize(text: string) {
  return text.toLowerCase().replace(/[^\w\s]/g, "").trim();
}

// Infer a topic from a quiz question using simple keyword matching.
// Returns "General" when no reliable keyword match exists.
export function inferTopic(subject: string, question: string): string {
  const subj = normalize(subject);
  const q = normalize(question);

  // Check each known subject's topics for a keyword match
  if (topicMap[subj]) {
    const topicEntries = Object.entries(topicMap[subj]);
    for (const [topicName, keywordArray] of topicEntries) {
      for (const keyword of keywordArray) {
        if (q.includes(keyword)) {
          return topicName;
        }
      }
    }
  }

  // No reliable topic found — return "General" per spec
  return "General";
}