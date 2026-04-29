import taxonomy from "../../../data/skills-taxonomy.json";

const taxonomyMap = taxonomy as Record<string, string[]>;

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const canonicalIndex = new Map<string, string>();

for (const [canonical, aliases] of Object.entries(taxonomyMap)) {
  const normalizedCanonical = normalizeText(canonical);
  canonicalIndex.set(normalizedCanonical, normalizedCanonical);

  for (const alias of aliases) {
    canonicalIndex.set(normalizeText(alias), normalizedCanonical);
  }
}

export function normalizeSkill(raw: string): string {
  const normalized = normalizeText(raw ?? "");
  return canonicalIndex.get(normalized) ?? normalized;
}

export function jaroWinklerSimilarity(left: string, right: string): number {
  const s1 = normalizeText(left);
  const s2 = normalizeText(right);

  if (s1 === s2) return 1;
  if (!s1.length || !s2.length) return 0;

  const matchDistance = Math.max(Math.floor(Math.max(s1.length, s2.length) / 2) - 1, 0);
  const leftMatches = new Array<boolean>(s1.length).fill(false);
  const rightMatches = new Array<boolean>(s2.length).fill(false);

  let matches = 0;
  for (let i = 0; i < s1.length; i += 1) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, s2.length);

    for (let j = start; j < end; j += 1) {
      if (rightMatches[j]) continue;
      if (s1[i] !== s2[j]) continue;
      leftMatches[i] = true;
      rightMatches[j] = true;
      matches += 1;
      break;
    }
  }

  if (matches === 0) return 0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < s1.length; i += 1) {
    if (!leftMatches[i]) continue;
    while (!rightMatches[k]) k += 1;
    if (s1[i] !== s2[k]) transpositions += 1;
    k += 1;
  }

  const m = matches;
  const jaro = (m / s1.length + m / s2.length + (m - transpositions / 2) / m) / 3;
  const prefixLimit = 4;
  let prefix = 0;
  while (prefix < Math.min(prefixLimit, s1.length, s2.length) && s1[prefix] === s2[prefix]) {
    prefix += 1;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

export function normalizeField(field: string | null | undefined): string {
  const normalized = normalizeText(field ?? "");
  if (!normalized) return "general studies";
  if (/(computer|information system|information technology|it|programming|software)/.test(normalized)) return "technology";
  if (/(nursing|medicine|medical|health)/.test(normalized)) return "health sciences";
  if (/(account|finance|business|management|marketing)/.test(normalized)) return "business";
  if (/engine/.test(normalized)) return "engineering";
  if (/educ/.test(normalized)) return "education";
  return normalized;
}

export function normalizeSchool(school: string | null | undefined): string {
  const normalized = normalizeText(school ?? "");
  if (!normalized) return "private institution";
  if (/(state university|suc|polytechnic)/.test(normalized)) return "state university";
  if (/community college/.test(normalized)) return "community college";
  if (/institute of technology/.test(normalized)) return "technical institute";
  if (/tesda/.test(normalized)) return "tesda accredited center";
  return "private institution";
}

export function getLogisticsZone(city: string | null | undefined, province?: string | null | undefined): string {
  const sCity = normalizeText(city ?? "");
  const sProvince = normalizeText(province ?? "");

  if (!sCity && !sProvince) return "unknown";

  const soccsksargen = [
    "general santos",
    "gensan",
    "koronadal",
    "tacurong",
    "kidapawan",
    "south cotabato",
    "cotabato",
    "sultan kudarat",
    "sarangani"
  ];

  if (sCity && sProvince && sCity === sProvince) return "same city";
  if (soccsksargen.some((term) => sCity.includes(term) || sProvince.includes(term))) return "same region";
  return "different region";
}
