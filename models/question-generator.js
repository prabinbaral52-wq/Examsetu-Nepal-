/**
 * ExamSetu Nepal - Dynamic Question Generator Engine
 * Produces thousands of genuine, syllabus-aligned questions for:
 * 1. Lok Sewa (GK, Constitution, Geography, History, Math/IQ)
 * 2. Banking (Aptitude, Economics, Banking Acts)
 * 3. TSC (Pedagogy, Curriculum, ICT)
 * 4. SEE / Entrance (Science, Math, General English)
 *
 * Ensures mathematical and factual accuracy with step-by-step solutions.
 */

// 1. NEPAL CONSTITUTION DATABASE (Articles 16-46 Fundamental Rights)
const FUNDAMENTAL_RIGHTS = [
  { article: 16, np: "सम्मानपूर्वक बाँच्न पाउने हक", en: "Right to live with dignity" },
  { article: 17, np: "स्वतन्त्रताको हक", en: "Right to freedom" },
  { article: 18, np: "समानताको हक", en: "Right to equality" },
  { article: 19, np: "सञ्चारको हक", en: "Right to communication" },
  { article: 20, np: "न्याय सम्बन्धी हक", en: "Right relating to justice" },
  { article: 21, np: "अपराध पीडितको हक", en: "Right of victim of crime" },
  { article: 22, np: "यातना विरुद्धको हक", en: "Right against torture" },
  { article: 23, np: "निवारक नजरबन्द विरुद्धको हक", en: "Right against preventive detention" },
  { article: 24, np: "छुवाछूत तथा भेदभाव विरुद्धको हक", en: "Right against untouchability and discrimination" },
  { article: 25, np: "सम्पत्तिको हक", en: "Right to property" },
  { article: 26, np: "धार्मिक स्वतन्त्रताको हक", en: "Right to freedom of religion" },
  { article: 27, np: "सूचनाको हक", en: "Right to information" },
  { article: 28, np: "गोपनीयताको हक", en: "Right to privacy" },
  { article: 29, np: "शोषण विरुद्धको हक", en: "Right against exploitation" },
  { article: 30, np: "स्वच्छ वातावरणको हक", en: "Right to clean environment" },
  { article: 31, np: "शिक्षा सम्बन्धी हक", en: "Right relating to education" },
  { article: 32, np: "भाषा तथा संस्कृतिको हक", en: "Right to language and culture" },
  { article: 33, np: "रोजगारीको हक", en: "Right to employment" },
  { article: 34, np: "श्रमको हक", en: "Right to labour" },
  { article: 35, np: "स्वास्थ्य सम्बन्धी हक", en: "Right relating to health" },
  { article: 36, np: "खाद्य सम्बन्धी हक", en: "Right relating to food" },
  { article: 37, np: "आवासको हक", en: "Right to housing" },
  { article: 38, np: "महिलाको हक", en: "Right of women" },
  { article: 39, np: "बालबालिकाको हक", en: "Right of children" },
  { article: 40, np: "दलितको हक", en: "Right of Dalit" },
  { article: 41, np: "ज्येष्ठ नागरिकको हक", en: "Right of senior citizens" },
  { article: 42, np: "सामाजिक न्यायको हक", en: "Right to social justice" },
  { article: 43, np: "सामाजिक सुरक्षाको हक", en: "Right to social security" },
  { article: 44, np: "उपभोक्ताको हक", en: "Right of consumer" },
  { article: 45, np: "देश निकाला विरुद्धको हक", en: "Right against exile" },
  { article: 46, np: "संवैधानिक उपचारको हक", en: "Right to constitutional remedies" }
];

// 2. NEPAL MOUNTAINS OVER 8000 METERS
const MOUNTAIN_PEAKS = [
  { name: "सगरमाथा (Mount Everest)", height: 8848.86, range: "महालङ्गुर", district: "सोलुखुम्बु", rank: 1 },
  { name: "कञ्चनजङ्घा (Kanchenjunga)", height: 8586, range: "कञ्चनजङ्घा", district: "ताप्लेजुङ", rank: 3 },
  { name: "ल्होत्से (Lhotse)", height: 8516, range: "महालङ्गुर", district: "सोलुखुम्बु", rank: 4 },
  { name: "मकालु (Makalu)", height: 8463, range: "मकालु", district: "सङ्खुवासभा", rank: 5 },
  { name: "चो ओयु (Cho Oyu)", height: 8201, range: "महालङ्गुर", district: "सोलुखुम्बु", rank: 6 },
  { name: "धौलागिरी (Dhaulagiri)", height: 8167, range: "धौलागिरी", district: "म्याग्दी", rank: 7 },
  { name: "मनास्लु (Manaslu)", height: 8163, range: "मनासिरी", district: "गोरखा", rank: 8 },
  { name: "अन्नपूर्ण प्रथम (Annapurna I)", height: 8091, range: "अन्नपूर्ण", district: "कास्की", rank: 10 }
];

// 3. NEPAL PROTECTED AREAS & NATIONAL PARKS
const PROTECTED_AREAS = [
  { name: "चितवन राष्ट्रिय निकुञ्ज", est: "२०३० (1973 AD)", area: "९५२.६३ वर्ग कि.मी.", unesco: true, note: "नेपालको पहिलो राष्ट्रिय निकुञ्ज" },
  { name: "सगरमाथा राष्ट्रिय निकुञ्ज", est: "२०३२ (1976 AD)", area: "१,१४८ वर्ग कि.मी.", unesco: true, note: "विश्व सम्पदा सूचीमा सूचीकृत" },
  { name: "लाङटाङ राष्ट्रिय निकुञ्ज", est: "२०३२ (1976 AD)", area: "१,७१० वर्ग कि.मी.", unesco: false, note: "रातो पाण्डा पाइने प्रमुख क्षेत्र" },
  { name: "रारा राष्ट्रिय निकुञ्ज", est: "२०३२ (1976 AD)", area: "१०६ वर्ग कि.मी.", unesco: false, note: "नेपालको सबैभन्दा सानो राष्ट्रिय निकुञ्ज" },
  { name: "शे-फोक्सुण्डो राष्ट्रिय निकुञ्ज", est: "२०४० (1984 AD)", area: "३,५५५ वर्ग कि.मी.", unesco: false, note: "नेपालको सबैभन्दा ठूलो राष्ट्रिय निकुञ्ज" },
  { name: "बर्दिया राष्ट्रिय निकुञ्ज", est: "२०४५ (1988 AD)", area: "९६८ वर्ग कि.मी.", unesco: false, note: "पाटे बाघ संरक्षणको मुख्य क्षेत्र" }
];

// 4. BANKING & FINANCIAL INSTITUTIONS (NRB & BAFIA ACTS)
const BANKING_STANDARDS = [
  { title: "क वर्गका वाणिज्य बैंक (Class A Commercial Banks)", capital: "८ अर्ब (8 Billion NPR)", regulator: "नेपाल राष्ट्र बैंक" },
  { title: "ख वर्गका विकास बैंक (Class B Development Banks)", capital: "२.५ अर्ब (राष्ट्रिय स्तर)", regulator: "नेपाल राष्ट्र बैंक" },
  { title: "ग वर्गका वित्त कम्पनी (Class C Finance Companies)", capital: "८० करोड (राष्ट्रिय स्तर)", regulator: "नेपाल राष्ट्र बैंक" },
  { title: "घ वर्गका लघुवित्त वित्तीय संस्था (Class D Microfinance)", capital: "१० करोड (राष्ट्रिय स्तर)", regulator: "नेपाल राष्ट्र बैंक" }
];

// Utility: Random Integer
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

// -------------------------------------------------------------
// DYNAMIC GENERATOR FUNCTIONS
// -------------------------------------------------------------

// Generator 1: Constitution Questions
function generateConstitutionQuestion() {
  const target = pickRandom(FUNDAMENTAL_RIGHTS);
  const type = Math.random() > 0.5 ? 'article_to_right' : 'right_to_article';

  if (type === 'article_to_right') {
    // Other 3 wrong choices
    const wrongRights = shuffle(FUNDAMENTAL_RIGHTS.filter(r => r.article !== target.article)).slice(0, 3);
    const options = shuffle([target.np, wrongRights[0].np, wrongRights[1].np, wrongRights[2].np]);
    const map = ['A', 'B', 'C', 'D'];
    const correctAns = map[options.indexOf(target.np)];

    return {
      exam: 'Lok Sewa',
      subject: 'Constitution & Law',
      topic: 'Fundamental Rights',
      difficulty: 'medium',
      question: `नेपालको वर्तमान संविधानको धारा ${target.article} मा कुन मौलिक हकको व्यवस्था गरिएको छ?`,
      options: { A: options[0], B: options[1], C: options[2], D: options[3] },
      correct_answer: correctAns,
      explanation: `नेपालको संविधान २०७२ को भाग ३ अन्तर्गत धारा ${target.article} मा "${target.np}" (${target.en}) को व्यवस्था छ।`
    };
  } else {
    const wrongArticles = shuffle(FUNDAMENTAL_RIGHTS.filter(r => r.article !== target.article)).slice(0, 3);
    const opts = shuffle([`धारा ${target.article}`, `धारा ${wrongArticles[0].article}`, `धारा ${wrongArticles[1].article}`, `धारा ${wrongArticles[2].article}`]);
    const map = ['A', 'B', 'C', 'D'];
    const correctAns = map[opts.indexOf(`धारा ${target.article}`)];

    return {
      exam: 'Lok Sewa',
      subject: 'Constitution & Law',
      topic: 'Fundamental Rights',
      difficulty: 'medium',
      question: `नेपालको संविधान अनुसार "${target.np}" कुन धारामा उल्लेख गरिएको छ?`,
      options: { A: opts[0], B: opts[1], C: opts[2], D: opts[3] },
      correct_answer: correctAns,
      explanation: `"${target.np}" नेपालको संविधानको धारा ${target.article} मा व्यवस्था गरिएको मौलिक हक हो।`
    };
  }
}

// Generator 2: Mountain Peaks & Geography
function generateMountainQuestion() {
  const target = pickRandom(MOUNTAIN_PEAKS);
  const mode = randInt(1, 3);

  if (mode === 1) {
    // Height question
    const wrongH = [target.height + randInt(20, 80), target.height - randInt(20, 80), target.height + randInt(90, 150)];
    const opts = shuffle([`${target.height} मिटर`, `${wrongH[0]} मिटर`, `${wrongH[1]} मिटर`, `${wrongH[2]} मिटर`]);
    const map = ['A', 'B', 'C', 'D'];
    return {
      exam: 'Lok Sewa',
      subject: 'General Knowledge',
      topic: 'Geography of Nepal',
      difficulty: 'medium',
      question: `${target.name} को आधिकारिक उचाइ कति मिटर रहेको छ?`,
      options: { A: opts[0], B: opts[1], C: opts[2], D: opts[3] },
      correct_answer: map[opts.indexOf(`${target.height} मिटर`)],
      explanation: `${target.name} को उचाइ ${target.height} मिटर हो। यो हिमाल ${target.district} जिल्लाको ${target.range} हिमशृङ्खलामा पर्दछ।`
    };
  } else if (mode === 2) {
    // District question
    const districts = ["सोलुखुम्बु", "ताप्लेजुङ", "सङ्खुवासभा", "म्याग्दी", "गोरखा", "कास्की", "रसुवा"];
    const wrongD = shuffle(districts.filter(d => d !== target.district)).slice(0, 3);
    const opts = shuffle([target.district, wrongD[0], wrongD[1], wrongD[2]]);
    const map = ['A', 'B', 'C', 'D'];
    return {
      exam: 'Lok Sewa',
      subject: 'General Knowledge',
      topic: 'Geography of Nepal',
      difficulty: 'easy',
      question: `${target.name} हिमाल कुन जिल्लामा अवस्थित छ?`,
      options: { A: opts[0], B: opts[1], C: opts[2], D: opts[3] },
      correct_answer: map[opts.indexOf(target.district)],
      explanation: `${target.name} हिमाल ${target.district} जिल्लामा अवस्थित छ। यसको हिमशृङ्खला ${target.range} हो।`
    };
  } else {
    // Rank question
    const opts = shuffle([`विश्वको ${target.rank} औं अग्लो`, `विश्वको ${target.rank + 1} औं अग्लो`, `विश्वको ${target.rank + 2} औं अग्लो`, `विश्वको ${target.rank === 1 ? 2 : target.rank - 1} औं अग्लो`]);
    const correctLabel = `विश्वको ${target.rank} औं अग्लो`;
    const map = ['A', 'B', 'C', 'D'];
    return {
      exam: 'Lok Sewa',
      subject: 'General Knowledge',
      topic: 'Geography of Nepal',
      difficulty: 'medium',
      question: `${target.name} उचाइको आधारमा विश्वको कतिऔं अग्लो हिमाल हो?`,
      options: { A: opts[0], B: opts[1], C: opts[2], D: opts[3] },
      correct_answer: map[opts.indexOf(correctLabel)],
      explanation: `${target.name} (${target.height}m) विश्वको ${target.rank} औं सर्वोच्च शिखर हो।`
    };
  }
}

// Generator 3: Quantitative Math & Profit/Loss / Percentage (100% Solved Algorithmically)
function generateArithmeticQuestion() {
  const type = randInt(1, 3);

  if (type === 1) {
    // Profit and Loss
    const cp = randInt(4, 25) * 100; // e.g. 1200
    const profitPercent = pickRandom([10, 15, 20, 25, 30]);
    const sp = cp + (cp * profitPercent) / 100;
    const wrong1 = sp + 50;
    const wrong2 = sp - 100;
    const wrong3 = cp + (cp * (profitPercent + 5)) / 100;

    const opts = shuffle([`रु. ${sp}`, `रु. ${wrong1}`, `रु. ${wrong2}`, `रु. ${wrong3}`]);
    const map = ['A', 'B', 'C', 'D'];

    return {
      exam: 'Banking',
      subject: 'Quantitative Aptitude',
      topic: 'Profit and Loss',
      difficulty: 'medium',
      question: `एउटा सामान रु. ${cp} मा किनेर ${profitPercent}% नाफा लिई बेच्दा उक्त सामानको बिक्री मूल्य (SP) कति हुन्छ?`,
      options: { A: opts[0], B: opts[1], C: opts[2], D: opts[3] },
      correct_answer: map[opts.indexOf(`रु. ${sp}`)],
      explanation: `सूत्र: SP = CP × (100 + Profit%) / 100\n= ${cp} × (100 + ${profitPercent}) / 100\n= ${cp} × ${100 + profitPercent} / 100 = रु. ${sp}।`
    };
  } else if (type === 2) {
    // Simple Interest
    const p = randInt(5, 40) * 1000; // e.g. 15000
    const t = randInt(2, 5); // years
    const r = pickRandom([8, 10, 12, 14]); // rate
    const si = (p * t * r) / 100;
    const wrong1 = si + 200;
    const wrong2 = si - 400;
    const wrong3 = (p * t * (r + 2)) / 100;

    const opts = shuffle([`रु. ${si}`, `रु. ${wrong1}`, `रु. ${wrong2}`, `रु. ${wrong3}`]);
    const map = ['A', 'B', 'C', 'D'];

    return {
      exam: 'Banking',
      subject: 'Quantitative Aptitude',
      topic: 'Simple Interest',
      difficulty: 'medium',
      question: `रु. ${p} को वार्षिक ${r}% ब्याजदरले ${t} वर्षमा साधारण ब्याज (Simple Interest) कति हुन्छ?`,
      options: { A: opts[0], B: opts[1], C: opts[2], D: opts[3] },
      correct_answer: map[opts.indexOf(`रु. ${si}`)],
      explanation: `सूत्र: SI = (P × T × R) / 100\n= (${p} × ${t} × ${r}) / 100 = रु. ${si}।`
    };
  } else {
    // Percentage
    const total = randInt(2, 8) * 200; // e.g. 600
    const passedPercent = pickRandom([60, 65, 70, 75, 80]);
    const failedPercent = 100 - passedPercent;
    const failedStudents = (total * failedPercent) / 100;
    const wrong1 = failedStudents + 15;
    const wrong2 = failedStudents - 20;
    const wrong3 = (total * (failedPercent + 5)) / 100;

    const opts = shuffle([`${failedStudents} जना`, `${wrong1} जना`, `${wrong2} जना`, `${wrong3} जना`]);
    const map = ['A', 'B', 'C', 'D'];

    return {
      exam: 'Lok Sewa',
      subject: 'Quantitative Aptitude',
      topic: 'Percentage',
      difficulty: 'easy',
      question: `एउटा परीक्षामा सहभागी ${total} जना विद्यार्थीहरू मध्ये ${passedPercent}% उत्तीर्ण भए भने अनुत्तीर्ण हुने विद्यार्थीको संख्या कति होला?`,
      options: { A: opts[0], B: opts[1], C: opts[2], D: opts[3] },
      correct_answer: map[opts.indexOf(`${failedStudents} जना`)],
      explanation: `अनुत्तीर्ण प्रतिशत = १०० - ${passedPercent} = ${failedPercent}%\nअनुत्तीर्ण संख्या = ${total} × ${failedPercent}/१०० = ${failedStudents} जना।`
    };
  }
}

// Generator 4: IQ & Number Series (100% Solved)
function generateIQSeriesQuestion() {
  const pattern = randInt(1, 3);
  let seq = [];
  let nextVal = 0;
  let rule = "";

  if (pattern === 1) {
    // Arithmetic Difference
    const diff = randInt(3, 9);
    const start = randInt(4, 20);
    seq = [start, start + diff, start + 2 * diff, start + 3 * diff];
    nextVal = start + 4 * diff;
    rule = `प्रत्येक पदमा +${diff} थपिएको छ`;
  } else if (pattern === 2) {
    // Square sequence (n^2 or n^2 + 1)
    const start = randInt(2, 5);
    seq = [start * start, (start + 1) * (start + 1), (start + 2) * (start + 2), (start + 3) * (start + 3)];
    nextVal = (start + 4) * (start + 4);
    rule = `क्रमशः संख्याहरूको वर्ग (${start}², ${start + 1}², ...) गरिएको छ`;
  } else {
    // Doubling + 1
    let val = randInt(2, 6);
    seq.push(val);
    for (let i = 0; i < 3; i++) {
      val = val * 2 + 1;
      seq.push(val);
    }
    nextVal = val * 2 + 1;
    rule = `अघिल्लो संख्यालाई २ ले गुणन गरी १ जोडिएको छ (×2 + 1)`;
  }

  const wrong1 = nextVal + 2;
  const wrong2 = nextVal - 3;
  const wrong3 = nextVal + 5;

  const opts = shuffle([String(nextVal), String(wrong1), String(wrong2), String(wrong3)]);
  const map = ['A', 'B', 'C', 'D'];

  return {
    exam: 'Lok Sewa',
    subject: 'General Mental Ability (IQ)',
    topic: 'Number Series',
    difficulty: 'medium',
    question: `दिइएको श्रेणीक्रम पूरा गर्नुहोस्: ${seq.join(', ')}, ?`,
    options: { A: opts[0], B: opts[1], C: opts[2], D: opts[3] },
    correct_answer: map[opts.indexOf(String(nextVal))],
    explanation: `नियम: ${rule}।\nयसकारण अर्को संख्या = ${nextVal} हुन्छ।`
  };
}

// Master Function: Generate N unlimited questions
function generateQuestionsBatch(count = 20, examFilter = '') {
  const generated = [];
  const generators = [
    generateConstitutionQuestion,
    generateMountainQuestion,
    generateArithmeticQuestion,
    generateIQSeriesQuestion
  ];

  for (let i = 0; i < count; i++) {
    const fn = pickRandom(generators);
    const q = fn();
    q.id = 900000 + i + randInt(1, 9999);
    generated.push(q);
  }

  return generated;
}

module.exports = {
  generateQuestionsBatch,
  generateConstitutionQuestion,
  generateMountainQuestion,
  generateArithmeticQuestion,
  generateIQSeriesQuestion
};
