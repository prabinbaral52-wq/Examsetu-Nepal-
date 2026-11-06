const fs = require('fs');
const path = require('path');

// Read existing questions
const existingPath = path.join(__dirname, '../data/questions.json');
let existingQuestions = [];
try {
  existingQuestions = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
} catch (e) {
  existingQuestions = [];
}

const newQuestions = [
  // --- GRADE 11 NEB SCIENCE: PHYSICS ---
  {
    exam: "NEB",
    grade: "11",
    stream: "Science",
    subject: "Physics",
    lesson: "Mechanics",
    topic: "Vectors & Projectile Motion",
    difficulty: "medium",
    question: "A projectile is fired at an angle θ with the horizontal with initial velocity u. The maximum horizontal range is achieved when the launch angle is:",
    options: {
      "A": "30°",
      "B": "45°",
      "C": "60°",
      "D": "90°"
    },
    correct_answer: "B",
    explanation: "Horizontal range R = (u² sin 2θ) / g. Range is maximum when sin 2θ = 1, which implies 2θ = 90°, so θ = 45°.",
    created_at: "2026-11-06"
  },
  {
    exam: "NEB",
    grade: "11",
    stream: "Science",
    subject: "Physics",
    lesson: "Heat & Thermodynamics",
    topic: "Carnot Engine & Second Law",
    difficulty: "medium",
    question: "A Carnot engine operates between source temperature T₁ = 500 K and sink temperature T₂ = 300 K. What is its theoretical thermal efficiency?",
    options: {
      "A": "40%",
      "B": "60%",
      "C": "20%",
      "D": "50%"
    },
    correct_answer: "A",
    explanation: "Carnot efficiency η = 1 - (T₂ / T₁) = 1 - (300 / 500) = 1 - 0.6 = 0.40, which corresponds to 40%.",
    created_at: "2026-11-06"
  },
  {
    exam: "NEB",
    grade: "11",
    stream: "Science",
    subject: "Physics",
    lesson: "Wave & Optics",
    topic: "Refraction through Prisms",
    difficulty: "hard",
    question: "For a thin prism of refractive index μ and small apex angle A, what is the angle of minimum deviation δ approximately equal to?",
    options: {
      "A": "δ = (μ - 1) A",
      "B": "δ = (μ + 1) A",
      "C": "δ = μ A",
      "D": "δ = A / (μ - 1)"
    },
    correct_answer: "A",
    explanation: "For small apex angle A, sin i ≈ i and sin r ≈ r. Using Snell's law, δ = (μ - 1) A.",
    created_at: "2026-11-06"
  },
  {
    exam: "NEB",
    grade: "11",
    stream: "Science",
    subject: "Physics",
    lesson: "Electricity & Magnetism",
    topic: "Electrostatics & Gauss Law",
    difficulty: "medium",
    question: "According to Gauss's Law in electrostatics, the net electric flux through any closed Gaussian surface enclosing charge q in vacuum is:",
    options: {
      "A": "q / ε₀",
      "B": "q · ε₀",
      "C": "4π ε₀ q",
      "D": "Zero"
    },
    correct_answer: "A",
    explanation: "Gauss's law states that total electric flux Φ_E = ∮ E · dA = q_enclosed / ε₀.",
    created_at: "2026-11-06"
  },

  // --- GRADE 11 NEB SCIENCE: CHEMISTRY ---
  {
    exam: "NEB",
    grade: "11",
    stream: "Science",
    subject: "Chemistry",
    lesson: "Physical Chemistry",
    topic: "Stoichiometry & Mole Concept",
    difficulty: "easy",
    question: "What is the total volume occupied by 44 grams of Carbon Dioxide (CO₂) gas at Standard Temperature and Pressure (STP)?",
    options: {
      "A": "11.2 Litres",
      "B": "22.4 Litres",
      "C": "44.8 Litres",
      "D": "1.0 Litre"
    },
    correct_answer: "B",
    explanation: "The molar mass of CO₂ is 12 + 2(16) = 44 g/mol. 44 grams equals 1 mole, which occupies 22.4 L at STP according to Avogadro's hypothesis.",
    created_at: "2026-11-06"
  },
  {
    exam: "NEB",
    grade: "11",
    stream: "Science",
    subject: "Chemistry",
    lesson: "Inorganic Chemistry",
    topic: "Periodic Classification & Periodicity",
    difficulty: "medium",
    question: "Which of the following elements has the highest electronegativity according to the Pauling scale?",
    options: {
      "A": "Chlorine (Cl)",
      "B": "Oxygen (O)",
      "C": "Fluorine (F)",
      "D": "Nitrogen (N)"
    },
    correct_answer: "C",
    explanation: "Fluorine is the most electronegative element with a Pauling value of 3.98 (approximately 4.0).",
    created_at: "2026-11-06"
  },
  {
    exam: "NEB",
    grade: "11",
    stream: "Science",
    subject: "Chemistry",
    lesson: "Organic Chemistry",
    topic: "IUPAC Nomenclature & Hydrocarbons",
    difficulty: "medium",
    question: "What is the systematic IUPAC name for the organic compound CH₃-CH(CH₃)-CH₂-CH₃?",
    options: {
      "A": "2-methylbutane (Isopentane)",
      "B": "3-methylbutane",
      "C": "Dimethylpropane",
      "D": "Pentane"
    },
    correct_answer: "A",
    explanation: "The longest continuous carbon chain has 4 carbons (butane). Numbering from the left gives the methyl group the lowest locant 2 (2-methylbutane).",
    created_at: "2026-11-06"
  },

  // --- GRADE 11 NEB SCIENCE: BIOLOGY ---
  {
    exam: "NEB",
    grade: "11",
    stream: "Science",
    subject: "Biology",
    lesson: "Cell Biology",
    topic: "Cell Organelles & Mitosis",
    difficulty: "easy",
    question: "Which cell organelle is known as the 'powerhouse of the cell' due to the synthesis of ATP through oxidative phosphorylation?",
    options: {
      "A": "Ribosome",
      "B": "Golgi Apparatus",
      "C": "Mitochondria",
      "D": "Endoplasmic Reticulum"
    },
    correct_answer: "C",
    explanation: "Mitochondria produce cellular adenosine triphosphate (ATP) via the Krebs cycle and electron transport chain, hence named powerhouse.",
    created_at: "2026-11-06"
  },
  {
    exam: "NEB",
    grade: "11",
    stream: "Science",
    subject: "Biology",
    lesson: "Plant Anatomy",
    topic: "Vascular Tissues & Transport",
    difficulty: "medium",
    question: "In vascular plants, which complex tissue is specifically responsible for the bidirectional translocation of organic solutes (photosynthates)?",
    options: {
      "A": "Xylem Tracheids",
      "B": "Phloem Sieve Tubes",
      "C": "Parenchyma Cortex",
      "D": "Sclerenchyma Fibers"
    },
    correct_answer: "B",
    explanation: "Phloem (specifically sieve tube elements and companion cells) transports dissolved sucrose and organic nutrients bidirectionally from source to sink.",
    created_at: "2026-11-06"
  },

  // --- GRADE 11 NEB SCIENCE: COMPUTER SCIENCE ---
  {
    exam: "NEB",
    grade: "11",
    stream: "Science",
    subject: "Computer Science",
    lesson: "Programming in C",
    topic: "Data Types & Control Structures",
    difficulty: "easy",
    question: "In C programming, what will be the output of `printf(\"%d\", 7 % 3);`?",
    options: {
      "A": "2",
      "B": "1",
      "C": "2.33",
      "D": "0"
    },
    correct_answer: "B",
    explanation: "The `%` modulo operator computes the remainder of integer division. 7 divided by 3 equals 2 with a remainder of 1.",
    created_at: "2026-11-06"
  },
  {
    exam: "NEB",
    grade: "11",
    stream: "Science",
    subject: "Computer Science",
    lesson: "Boolean Logic & Number Systems",
    topic: "Binary & Hexadecimal Conversion",
    difficulty: "medium",
    question: "What is the decimal equivalent of the binary number `(10110)₂`?",
    options: {
      "A": "18",
      "B": "22",
      "C": "26",
      "D": "30"
    },
    correct_answer: "B",
    explanation: "1*(2⁴) + 0*(2³) + 1*(2²) + 1*(2¹) + 0*(2⁰) = 16 + 0 + 4 + 2 + 0 = 22.",
    created_at: "2026-11-06"
  },

  // --- GRADE 11 NEB SCIENCE: MATHEMATICS ---
  {
    exam: "NEB",
    grade: "11",
    stream: "Science",
    subject: "Mathematics",
    lesson: "Calculus",
    topic: "Limits & Derivatives",
    difficulty: "medium",
    question: "What is the derivative of f(x) = sin(2x) with respect to x?",
    options: {
      "A": "cos(2x)",
      "B": "2 cos(2x)",
      "C": "-2 cos(2x)",
      "D": "2 sin(x)"
    },
    correct_answer: "B",
    explanation: "Using the chain rule, d/dx[sin(2x)] = cos(2x) * d/dx[2x] = 2 cos(2x).",
    created_at: "2026-11-06"
  },
  {
    exam: "NEB",
    grade: "11",
    stream: "Science",
    subject: "Mathematics",
    lesson: "Matrices & Determinants",
    topic: "Matrix Properties & Inversion",
    difficulty: "easy",
    question: "If matrix A is an invertible square matrix of order n, what is det(A⁻¹)?",
    options: {
      "A": "det(A)",
      "B": "1 / det(A)",
      "C": "-det(A)",
      "D": "0"
    },
    correct_answer: "B",
    explanation: "Since A · A⁻¹ = I and det(A · B) = det(A) det(B), det(A) det(A⁻¹) = det(I) = 1. Therefore det(A⁻¹) = 1 / det(A).",
    created_at: "2026-11-06"
  },

  // --- GRADE 11 NEB COMPULSORY: NEPALI ---
  {
    exam: "NEB",
    grade: "11",
    stream: "Compulsory",
    subject: "Nepali",
    lesson: "व्याकरण (Grammar)",
    topic: "शब्द वर्ग (Parts of Speech)",
    difficulty: "easy",
    question: "'विद्यार्थीहरू कक्षाकोठामा ध्यान दिएर पढ्दै छन्' वाक्यमा 'ध्यान दिएर' कुन शब्द वर्ग अन्तर्गत पर्दछ?",
    options: {
      "A": "नाम (Noun)",
      "B": "सर्वनाम (Pronoun)",
      "C": "क्रियायोगी (Adverb)",
      "D": "विशेषण (Adjective)"
    },
    correct_answer: "C",
    explanation: "'ध्यान दिएर' ले पढ्ने तरिका वा क्रियाको विशेषता बुझाएको हुनाले यो क्रियायोगी (क्रियाविशेषण) पद हो।",
    created_at: "2026-11-06"
  },

  // --- GRADE 11 NEB COMPULSORY: ENGLISH ---
  {
    exam: "NEB",
    grade: "11",
    stream: "Compulsory",
    subject: "English",
    lesson: "Grammar & Concord",
    topic: "Subject-Verb Agreement",
    difficulty: "easy",
    question: "Choose the grammatically correct option: 'Neither the teacher nor the students _______ present in the laboratory.'",
    options: {
      "A": "was",
      "B": "were",
      "C": "is",
      "D": "are being"
    },
    correct_answer: "B",
    explanation: "When subjects are joined by 'neither... nor', the verb agrees with the closer subject. Here 'students' is plural, so 'were' is correct in the past tense.",
    created_at: "2026-11-06"
  },

  // --- GRADE 10 SEE: COMPULSORY SCIENCE ---
  {
    exam: "SEE",
    grade: "10",
    stream: "General",
    subject: "Science",
    lesson: "Force & Gravity",
    topic: "Newton's Universal Gravitation",
    difficulty: "easy",
    question: "If the distance between two masses is doubled while their masses remain unchanged, how does the gravitational force between them change?",
    options: {
      "A": "Doubles (2 times)",
      "B": "Halves (1/2)",
      "C": "Becomes one-fourth (1/4)",
      "D": "Remains unchanged"
    },
    correct_answer: "C",
    explanation: "According to Newton's Law of Gravitation, F ∝ 1/d². If d becomes 2d, F becomes 1/(2d)² = 1/4 F.",
    created_at: "2026-11-06"
  },
  {
    exam: "SEE",
    grade: "10",
    stream: "General",
    subject: "Science",
    lesson: "Pressure",
    topic: "Pascal's Law & Hydraulic Machines",
    difficulty: "medium",
    question: "On which fundamental law of fluid mechanics is the hydraulic lift and hydraulic brakes based?",
    options: {
      "A": "Archimedes' Principle",
      "B": "Pascal's Law",
      "C": "Law of Flotation",
      "D": "Bernoulli's Principle"
    },
    correct_answer: "B",
    explanation: "Pascal's Law states that pressure applied to an enclosed liquid is transmitted equally and undiminished in all directions, which is utilized in hydraulic machines.",
    created_at: "2026-11-06"
  },
  {
    exam: "SEE",
    grade: "10",
    stream: "General",
    subject: "Science",
    lesson: "Metals & Non-metals",
    topic: "Iron & Blast Furnace",
    difficulty: "medium",
    question: "What is the principal ore from which iron is commercially extracted?",
    options: {
      "A": "Bauxite",
      "B": "Haematite (Fe₂O₃)",
      "C": "Calamine",
      "D": "Galena"
    },
    correct_answer: "B",
    explanation: "Haematite (Fe₂O₃) is the chief red ore of iron containing up to 70% iron, smelted in a blast furnace.",
    created_at: "2026-11-06"
  },

  // --- GRADE 10 SEE: COMPULSORY MATHEMATICS ---
  {
    exam: "SEE",
    grade: "10",
    stream: "General",
    subject: "Compulsory Mathematics",
    lesson: "Arithmetic & Commercial Math",
    topic: "Compound Interest & VAT",
    difficulty: "medium",
    question: "If a sum of NPR 10,000 is compounded annually at 10% per annum, what will be the compound amount after 2 years?",
    options: {
      "A": "NPR 12,000",
      "B": "NPR 12,100",
      "C": "NPR 11,500",
      "D": "NPR 13,000"
    },
    correct_answer: "B",
    explanation: "Compound Amount A = P(1 + R/100)ᵀ = 10,000 * (1.10)² = 10,000 * 1.21 = NPR 12,100.",
    created_at: "2026-11-06"
  },
  {
    exam: "SEE",
    grade: "10",
    stream: "General",
    subject: "Compulsory Mathematics",
    lesson: "Mensuration",
    topic: "Surface Area of Sphere",
    difficulty: "easy",
    question: "What is the total surface area of a solid sphere of radius r?",
    options: {
      "A": "2πr²",
      "B": "3πr²",
      "C": "4πr²",
      "D": "4/3 πr³"
    },
    correct_answer: "C",
    explanation: "The surface area of a sphere of radius r is 4πr².",
    created_at: "2026-11-06"
  },

  // --- GRADE 10 SEE: SOCIAL STUDIES ---
  {
    exam: "SEE",
    grade: "10",
    stream: "General",
    subject: "Social Studies",
    lesson: "Constitution & Governance",
    topic: "Federal Democratic Republic of Nepal",
    difficulty: "easy",
    question: "When was the Constitution of Nepal officially promulgated by the Constituent Assembly?",
    options: {
      "A": "2072 Ashwin 3 (20 Sept 2015)",
      "B": "2063 Magh 1",
      "C": "2070 Mangsir 4",
      "D": "2075 Chaitra 12"
    },
    correct_answer: "A",
    explanation: "The Constitution of Nepal was promulgated on 2072 Ashwin 3 (September 20, 2015) by the First President of Federal Nepal.",
    created_at: "2026-11-06"
  },

  // --- GRADE 10 SEE: OPTIONAL MATHEMATICS ---
  {
    exam: "SEE",
    grade: "10",
    stream: "General",
    subject: "Optional Mathematics",
    lesson: "Trigonometry",
    topic: "Compound & Multiple Angles",
    difficulty: "medium",
    question: "What is the trigonometric value of sin(2A) expressed strictly in terms of tan A?",
    options: {
      "A": "(2 tan A) / (1 + tan² A)",
      "B": "(2 tan A) / (1 - tan² A)",
      "C": "(1 - tan² A) / (1 + tan² A)",
      "D": "2 tan A"
    },
    correct_answer: "A",
    explanation: "sin(2A) = 2 sin A cos A = (2 sin A cos A) / (cos² A + sin² A). Dividing numerator and denominator by cos² A gives (2 tan A) / (1 + tan² A).",
    created_at: "2026-11-06"
  },

  // --- GRADE 12 NEB SCIENCE: MODERN PHYSICS ---
  {
    exam: "NEB",
    grade: "12",
    stream: "Science",
    subject: "Physics",
    lesson: "Modern Physics",
    topic: "Photoelectric Effect & Photons",
    difficulty: "medium",
    question: "According to Einstein's Photoelectric Equation, the maximum kinetic energy (KE_max) of photoelectrons is given by:",
    options: {
      "A": "KE_max = hν - Φ",
      "B": "KE_max = hν + Φ",
      "C": "KE_max = Φ / hν",
      "D": "KE_max = 1/2 hν"
    },
    correct_answer: "A",
    explanation: "Einstein's equation states hν = Φ + KE_max, so KE_max = hν - Φ, where hν is photon energy and Φ is work function.",
    created_at: "2026-11-06"
  },

  // --- GRADE 11/12 MANAGEMENT: ACCOUNTANCY ---
  {
    exam: "NEB",
    grade: "11",
    stream: "Management",
    subject: "Accountancy",
    lesson: "Financial Accounting",
    topic: "Accounting Principles & Trial Balance",
    difficulty: "easy",
    question: "Which accounting convention states that revenue should be recognized only when it is realized or earned?",
    options: {
      "A": "Realization Concept",
      "B": "Consistency Principle",
      "C": "Conservatism Principle",
      "D": "Materiality Concept"
    },
    correct_answer: "A",
    explanation: "The Realization (Revenue Recognition) concept dictates that revenue is recognized when goods/services are exchanged or legally obligated, not necessarily when cash is received.",
    created_at: "2026-11-06"
  }
];

// Combine without duplicates
let nextId = existingQuestions.length > 0 ? Math.max(...existingQuestions.map(q => q.id || 0)) + 1 : 1;
const questionsToAppend = newQuestions.map(q => ({
  id: nextId++,
  ...q
}));

const combined = [...existingQuestions, ...questionsToAppend];

// Write to both paths
const webDataPath = path.join(__dirname, '../app/src/main/assets/web/data/questions.json');
fs.writeFileSync(existingPath, JSON.stringify(combined, null, 2), 'utf8');
fs.writeFileSync(webDataPath, JSON.stringify(combined, null, 2), 'utf8');

console.log(`Successfully merged questions! Total questions now: ${combined.length}`);
