// Offline unit tests for the matching text utilities: TF-IDF vectorizer and
// scorer, skill taxonomy mapper, and skill/field/location normalizers.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TFIDFVectorizer } from "../app/lib/matching/tfidf-vectorizer";
import { TFIDFScorer } from "../app/lib/matching/tfidf-scorer";
import {
  SkillTaxonomyMapper,
  VAGUE_SKILL_PENALTY,
  skillMapper,
  type TaxonomyGroup,
} from "../app/lib/matching/skill-taxonomy-mapper";
import {
  getLogisticsZone,
  jaroWinklerSimilarity,
  normalizeField,
  normalizeSchool,
  normalizeSkill,
  tokenSetSimilarity,
} from "../app/lib/matching/skill-normalizer";

const CORPUS = [
  "forklift operation warehouse inventory",
  "fish processing food safety sanitation",
  "warehouse inventory forklift loading",
  "food safety fish canning sanitation",
  "customer service cashiering sales",
  "sales customer service retail",
];

describe("TFIDFVectorizer", () => {
  it("rejects transform before fit", () => {
    assert.throws(() => new TFIDFVectorizer().transform("forklift"), /call fit\(\) before transform\(\)/);
  });

  it("keeps terms within minDf/maxDf, drops stop words, and builds bigrams", () => {
    const v = new TFIDFVectorizer().fit(CORPUS);
    assert.equal(v.corpusSize, CORPUS.length);
    assert.ok(v.vocabulary.has("forklift"));
    assert.ok(v.vocabulary.has("customer service"));
    assert.ok(!v.vocabulary.has("loading"), "df 1 < minDf 2");
    assert.equal(v.vocabularySize, v.terms.length);

    const stop = new TFIDFVectorizer({ minDf: 1 }).fit(["the forklift and the warehouse"]);
    assert.ok(!stop.vocabulary.has("the"));
    assert.ok(!stop.vocabulary.has("and"));
  });

  it("produces unit-length vectors and cosine similarity in [0, 1]", () => {
    const v = new TFIDFVectorizer();
    const [a, b, c] = v.fitTransform(CORPUS);
    const norm = Math.sqrt(Array.from(a!.dense).reduce((s, x) => s + x * x, 0));
    assert.ok(Math.abs(norm - 1) < 1e-5);
    assert.ok(Math.abs(TFIDFVectorizer.cosineSimilarity(a!, a!) - 1) < 1e-5);
    assert.ok(TFIDFVectorizer.cosineSimilarity(a!, c!) > TFIDFVectorizer.cosineSimilarity(a!, b!));
    const empty = v.transform("zzz qqq");
    assert.equal(empty.nnz, 0);
    assert.equal(TFIDFVectorizer.cosineSimilarity(a!, empty), 0);
  });

  it("supports raw term frequency, absolute maxDf and topTerms", () => {
    const v = new TFIDFVectorizer({ sublinearTf: false, minDf: 1, maxDf: 10, ngramRange: [1, 1] }).fit(CORPUS);
    const vec = v.transform("forklift forklift warehouse");
    const top = TFIDFVectorizer.topTerms(vec, 1);
    assert.equal(top.length, 1);
    assert.equal(top[0]!.term, "forklift");
  });

  it("round-trips through serialize/deserialize", () => {
    const v = new TFIDFVectorizer().fit(CORPUS);
    const copy = TFIDFVectorizer.deserialize(v.serialize());
    assert.equal(copy.vocabularySize, v.vocabularySize);
    assert.equal(copy.corpusSize, v.corpusSize);
    const doc = "fish processing sanitation";
    assert.deepEqual(Array.from(copy.transform(doc).dense), Array.from(v.transform(doc).dense));
  });
});

describe("TFIDFScorer", () => {
  const scorer = new TFIDFScorer(new TFIDFVectorizer().fit(CORPUS));

  it("explains a match with contributions, gaps and confidence", () => {
    const match = scorer.score("forklift operation warehouse", "warehouse inventory forklift");
    assert.ok(match.rawScore > 0 && match.rawScore <= 1);
    assert.equal(match.proficiencyMultiplier, 0.8, "default multiplier without proficiency");
    assert.ok(match.topContributors.length > 0);
    const pctSum = match.breakdown.reduce((s, b) => s + b.contributionPct, 0);
    assert.ok(Math.abs(pctSum - 100) < 1e-6);
    assert.ok(match.gapTerms.some((g) => g.term.includes("inventory")));
    assert.ok(["low", "medium", "high"].includes(match.confidenceLabel));
  });

  it("applies proficiency multipliers and caps the adjusted score at 1", () => {
    const expert = scorer.score("forklift warehouse", "forklift warehouse", "Expert");
    const beginner = scorer.score("forklift warehouse", "forklift warehouse", "Beginner");
    assert.equal(expert.proficiencyMultiplier, 1.2);
    assert.equal(beginner.proficiencyMultiplier, 0.6);
    assert.ok(expert.adjustedScore <= 1);
    assert.ok(expert.adjustedScore > beginner.adjustedScore);
  });

  it("returns zero and no contributors for unrelated text", () => {
    const match = scorer.score("customer service sales", "fish processing sanitation");
    assert.equal(match.rawScore, 0);
    assert.equal(match.topContributors.length, 0);
  });

  it("ranks jobs and seekers by adjusted score", () => {
    const jobs = scorer.rankJobs("fish processing food safety", [
      { id: "retail", text: "sales customer service retail" },
      { id: "cannery", text: "fish canning food safety sanitation" },
    ]);
    assert.equal(jobs[0]!.jobId, "cannery");

    const seekers = scorer.rankSeekers("warehouse inventory forklift", [
      { id: "cashier", text: "cashiering sales" },
      { id: "operator", text: "forklift operation warehouse", proficiency: "Advanced" },
    ]);
    assert.equal(seekers[0]!.seekerId, "operator");
    assert.ok(scorer.vocabularySize > 0);
  });

  it("formats a readable breakdown with gaps", () => {
    const text = TFIDFScorer.formatBreakdown(scorer.score("forklift operation", "forklift warehouse inventory"));
    assert.match(text, /TF-IDF Skill Match Score: \d+\.\d%/);
    assert.match(text, /Top contributing skills:/);
    assert.match(text, /Skill gaps/);
  });
});

const TAXONOMY: TaxonomyGroup[] = [
  {
    group: "welding",
    label: "Welding",
    vague_triggers: ["metal work"],
    skills: [
      { canonical: "SMAW", aliases: ["stick welding", "arc welding"], esco_uri: "esco:smaw", tesda_nc_level: "NC II", category: "trade" },
      { canonical: "GMAW", aliases: ["mig welding"], esco_uri: null, tesda_nc_level: null, category: "trade" },
    ],
  },
];

describe("SkillTaxonomyMapper (custom taxonomy)", () => {
  const mapper = new SkillTaxonomyMapper(TAXONOMY);

  it("resolves aliases case-insensitively and reports standards", () => {
    assert.equal(mapper.resolve("Stick Welding"), "SMAW");
    assert.equal(mapper.resolve("unknown"), null);
    assert.deepEqual(mapper.getStandardsInfo("arc welding"), { esco_uri: "esco:smaw", tesda_nc_level: "NC II", canonical: "SMAW" });
    assert.deepEqual(mapper.getStandardsInfo("nothing"), { esco_uri: null, tesda_nc_level: null, canonical: null });
  });

  it("expands vague skills with a penalty and leaves unknown skills unchanged", () => {
    assert.equal(mapper.isVagueSkill("Metal Work"), true);
    assert.equal(mapper.isVagueSkill("mig welding"), false);

    const vague = mapper.expandSkill("metal work");
    assert.equal(vague.wasVague, true);
    assert.equal(vague.scoreMultiplier, VAGUE_SKILL_PENALTY);
    assert.deepEqual(vague.expanded, ["SMAW", "GMAW"]);

    const known = mapper.expandSkill("mig welding");
    assert.deepEqual(known.expanded, ["GMAW"]);
    assert.equal(known.group, "welding");

    const unknown = mapper.expandSkill("baking");
    assert.deepEqual(unknown.expanded, ["baking"]);
    assert.equal(unknown.group, null);
  });

  it("expands a skill list and returns related skills, suggestions and TESDA levels", () => {
    const all = mapper.expandAllSkills(["metal work", "baking"]);
    assert.equal(all.hasVagueSkills, true);
    assert.equal(all.minMultiplier, VAGUE_SKILL_PENALTY);
    assert.deepEqual(all.expandedSkills.sort(), ["GMAW", "SMAW", "baking"]);

    assert.deepEqual(mapper.suggestSpecificSkills("metal work", 1), ["SMAW"]);
    assert.deepEqual(mapper.suggestSpecificSkills("mig welding"), []);
    assert.deepEqual(mapper.getRelatedSkills("stick welding"), ["GMAW"]);
    assert.deepEqual(mapper.getRelatedSkills("baking"), []);
    assert.deepEqual(mapper.getTesdaRecommendations(["arc welding", "mig welding"]), [
      { skill: "arc welding", nc_level: "NC II", canonical: "SMAW" },
    ]);
    assert.equal(mapper.totalGroups, 1);
    assert.equal(mapper.totalSkills, 2);
    assert.ok(mapper.totalAliases >= 5);
  });

  it("loads the bundled taxonomy by default", () => {
    assert.ok(skillMapper.totalGroups > 0);
    assert.ok(skillMapper.totalSkills > 0);
  });
});

describe("skill-normalizer", () => {
  it("normalizes skills and compares strings", () => {
    assert.equal(normalizeSkill("  Food & Safety "), "foodandsafety");
    assert.equal(jaroWinklerSimilarity("forklift", "forklift"), 1);
    assert.equal(jaroWinklerSimilarity("", "abc"), 0);
    assert.equal(jaroWinklerSimilarity("abc", "xyz"), 0);
    const near = jaroWinklerSimilarity("welding", "weldin");
    assert.ok(near > 0.9 && near < 1);

    assert.equal(tokenSetSimilarity("Fish Processing", "fish processing"), 1);
    assert.equal(tokenSetSimilarity("", "x"), 0);
    assert.equal(tokenSetSimilarity("fish processing worker", "fish processing"), 0.95);
    const tokens = tokenSetSimilarity("forklift operator", "operater of trucks");
    assert.ok(tokens > 0.8 && tokens <= 0.95);
  });

  it("maps fields of study", () => {
    assert.equal(normalizeField(null), "general studies");
    assert.equal(normalizeField("Computer Science"), "technology");
    assert.equal(normalizeField("Nursing"), "health sciences");
    assert.equal(normalizeField("Accountancy"), "business");
    assert.equal(normalizeField("Civil Engineering"), "engineering");
    assert.equal(normalizeField("Secondary Education"), "education");
    assert.equal(normalizeField("Fisheries"), "fisheries");
    // Multi-word patterns and whole-word "it" (fixed 2026-10-27).
    assert.equal(normalizeField("BS Information System"), "technology");
    assert.equal(normalizeField("BS IT"), "technology");
    assert.equal(normalizeField("Hospitality Management"), "business");
    assert.equal(normalizeField("Criminology"), "criminology");
  });

  it("maps school types", () => {
    assert.equal(normalizeSchool(undefined), "private institution");
    assert.equal(normalizeSchool("Mindanao Polytechnic College"), "state university");
    assert.equal(normalizeSchool("TESDA Training Center"), "tesda accredited center");
    assert.equal(normalizeSchool("Notre Dame"), "private institution");
    assert.equal(normalizeSchool("Mindanao State University"), "state university");
    assert.equal(normalizeSchool("GenSan Community College"), "community college");
    assert.equal(normalizeSchool("Mindanao Institute of Technology"), "technical institute");
    assert.equal(normalizeSchool("Success Academy"), "private institution");
  });

  it("classifies logistics zones", () => {
    assert.equal(getLogisticsZone(null, null), "Unknown");
    assert.equal(getLogisticsZone("General Santos City", "South Cotabato"), "Same City");
    assert.equal(getLogisticsZone("Koronadal", "South Cotabato"), "Same Region");
    assert.equal(getLogisticsZone("Cebu City", "Cebu"), "Different Region");
  });
});
