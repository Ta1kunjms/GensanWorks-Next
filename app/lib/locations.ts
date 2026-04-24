export type BarangayOption = { code: string; name: string };
export type MunicipalityOption = { code: string; name: string; barangays: BarangayOption[] };
export type ProvinceOption = { code: string; name: string; municipalities: MunicipalityOption[] };

// System-wide default location (requested prefill)
export const DEFAULT_PROVINCE = "South Cotabato";
export const DEFAULT_MUNICIPALITY = "General Santos City";

// Minimal but relevant fallback data for Region XII + GenSan so the UI keeps working offline
const fallbackLocations: ProvinceOption[] = [
  {
    code: "PH-12-SC",
    name: "South Cotabato",
    municipalities: [
      {
        code: "SC-GSC",
        name: "General Santos City",
        barangays: [
          "Apopong",
          "Baluan",
          "Buayan",
          "Bula",
          "Calumpang",
          "City Heights",
          "Conel",
          "Dadiangas East",
          "Dadiangas North",
          "Dadiangas South",
          "Dadiangas West",
          "Fatima",
          "Katangawan",
          "Labangal",
          "Lagao (1st)",
          "Ligaya",
          "Mabuhay",
          "Olympog",
          "San Isidro (Lagao)",
          "San Jose",
          "Sinawal",
          "Tambler",
          "Tinagacan",
          "Upper Labay",
        ].map((name, idx) => ({ code: `SC-GSC-${idx + 1}`, name })),
      },
      {
        code: "SC-KOR",
        name: "Koronadal City",
        barangays: ["Assumption", "Cabalitan", "Carpenter Hill", "Zone III", "Zone IV"].map((name, idx) => ({
          code: `SC-KOR-${idx + 1}`,
          name,
        })),
      },
      {
        code: "SC-POLO",
        name: "Polomolok",
        barangays: ["Cannery Site", "Poblacion", "Silway 7", "Silway 8"].map((name, idx) => ({ code: `SC-POLO-${idx + 1}`, name })),
      },
      {
        code: "SC-TUPI",
        name: "Tupi",
        barangays: ["Poblacion", "Kablon", "Palian", "Bunao"].map((name, idx) => ({ code: `SC-TUPI-${idx + 1}`, name })),
      },
    ],
  },
  {
    code: "PH-12-SAR",
    name: "Sarangani",
    municipalities: [
      {
        code: "SAR-ALABEL",
        name: "Alabel",
        barangays: ["Alegria", "Bagacay", "Pag-asa", "Poblacion"].map((name, idx) => ({ code: `SAR-ALABEL-${idx + 1}`, name })),
      },
      {
        code: "SAR-MAASIM",
        name: "Maasim",
        barangays: ["Amsipit", "Bati-an", "Kanalo", "Poblacion"].map((name, idx) => ({ code: `SAR-MAASIM-${idx + 1}`, name })),
      },
      {
        code: "SAR-MALUNGON",
        name: "Malungon",
        barangays: ["Alabel", "Banahao", "Poblacion", "Upper Mainit"].map((name, idx) => ({ code: `SAR-MALUNGON-${idx + 1}`, name })),
      },
    ],
  },
];

// Public PSGC-derived datasets often expose barangay rows with province/municipality fields.
const REMOTE_DATA_URL =
  "https://raw.githubusercontent.com/psgc-data/psgc-data/main/barangays.json";

type RemoteBarangayRow = {
  code?: string;
  brgyCode?: string;
  barangayCode?: string;
  name?: string;
  barangayName?: string;
  brgyName?: string;
  cityMunCode?: string;
  municipalityCode?: string;
  cityCode?: string;
  cityMunicipalityName?: string;
  municipalityName?: string;
  cityName?: string;
  provCode?: string;
  provinceCode?: string;
  provinceName?: string;
  regionCode?: string;
};

const pick = (row: RemoteBarangayRow, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = (row as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
};

const buildLocationsFromRemote = (rows: RemoteBarangayRow[]): ProvinceOption[] => {
  const provinceMap = new Map<string, { code: string; name: string; municipalities: Map<string, MunicipalityOption> }>();

  rows.forEach((row) => {
    const provinceName = pick(row, ["provinceName", "provName", "province"]);
    const provinceCode = pick(row, ["provinceCode", "provCode"]) || provinceName;
    const municipalityName =
      pick(row, ["cityMunicipalityName", "municipalityName", "cityName", "municipality"]) || "";
    const municipalityCode = pick(row, ["cityMunCode", "municipalityCode", "cityCode"]) || municipalityName;
    const barangayName = pick(row, ["barangayName", "brgyName", "name", "barangay"]);
    const barangayCode = pick(row, ["barangayCode", "brgyCode", "code"]) || barangayName;

    if (!provinceName || !municipalityName || !barangayName) return;

    if (!provinceMap.has(provinceCode || provinceName)) {
      provinceMap.set(provinceCode || provinceName, {
        code: provinceCode || provinceName,
        name: provinceName,
        municipalities: new Map(),
      });
    }

    const provinceEntry = provinceMap.get(provinceCode || provinceName)!;
    if (!provinceEntry.municipalities.has(municipalityCode)) {
      provinceEntry.municipalities.set(municipalityCode, {
        code: municipalityCode,
        name: municipalityName,
        barangays: [],
      });
    }

    const municipalityEntry = provinceEntry.municipalities.get(municipalityCode)!;
    municipalityEntry.barangays.push({ code: barangayCode || barangayName, name: barangayName });
  });

  return Array.from(provinceMap.values()).map((province) => ({
    code: province.code,
    name: province.name,
    municipalities: Array.from(province.municipalities.values()).map((muni) => ({
      ...muni,
      barangays: muni.barangays.sort((a, b) => a.name.localeCompare(b.name)),
    })),
  }));
};

export const fetchPhilippineLocations = async (): Promise<ProvinceOption[]> => {
  try {
    const response = await fetch(REMOTE_DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Remote dataset returned ${response.status}`);
    const rows = (await response.json()) as RemoteBarangayRow[];
    if (!Array.isArray(rows)) throw new Error("Unexpected dataset shape");
    const provinces = buildLocationsFromRemote(rows);
    if (provinces.length) return provinces;
  } catch (error) {
    console.warn("Falling back to built-in PH locations", error);
  }
  return fallbackLocations;
};
