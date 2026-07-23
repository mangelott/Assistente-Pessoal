import { extractEmailFromWebsite } from "./emailExtractor";

export type CompanySearchResult = {
  name: string;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  sourcePlaceId: string | null;
  source: string;
};

const MAX_RESULTS = 15;

const MOCK_COMPANIES: Omit<CompanySearchResult, "email">[] = [
  {
    name: "Norte Digital Marketing",
    website: "https://www.exemplo-norte-digital.pt",
    phone: "+351 220 000 001",
    address: "Porto, Portugal",
    sourcePlaceId: null,
    source: "mock",
  },
  {
    name: "Agência Lumen",
    website: "https://www.exemplo-lumen.pt",
    phone: "+351 220 000 002",
    address: "Lisboa, Portugal",
    sourcePlaceId: null,
    source: "mock",
  },
  {
    name: "Bússola Marketing Digital",
    website: "https://www.exemplo-bussola.pt",
    phone: "+351 220 000 003",
    address: "Braga, Portugal",
    sourcePlaceId: null,
    source: "mock",
  },
];

async function searchWithGooglePlaces(query: string, apiKey: string): Promise<CompanySearchResult[]> {
  const searchUrl = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  searchUrl.searchParams.set("query", query);
  searchUrl.searchParams.set("key", apiKey);

  const searchRes = await fetch(searchUrl.toString());
  if (!searchRes.ok) {
    throw new Error(`Google Places falhou: ${searchRes.status}`);
  }
  const searchJson = (await searchRes.json()) as {
    results?: Array<{ place_id: string; name: string; formatted_address?: string }>;
    status: string;
  };

  if (searchJson.status !== "OK" && searchJson.status !== "ZERO_RESULTS") {
    throw new Error(`Google Places devolveu estado: ${searchJson.status}`);
  }

  const candidates = (searchJson.results ?? []).slice(0, MAX_RESULTS);

  const results: CompanySearchResult[] = [];
  for (const candidate of candidates) {
    const detailsUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    detailsUrl.searchParams.set("place_id", candidate.place_id);
    detailsUrl.searchParams.set(
      "fields",
      "formatted_phone_number,international_phone_number,website,formatted_address",
    );
    detailsUrl.searchParams.set("key", apiKey);

    let phone: string | null = null;
    let website: string | null = null;
    let address = candidate.formatted_address ?? null;

    try {
      const detailsRes = await fetch(detailsUrl.toString());
      if (detailsRes.ok) {
        const detailsJson = (await detailsRes.json()) as {
          result?: {
            formatted_phone_number?: string;
            international_phone_number?: string;
            website?: string;
            formatted_address?: string;
          };
        };
        phone =
          detailsJson.result?.formatted_phone_number ??
          detailsJson.result?.international_phone_number ??
          null;
        website = detailsJson.result?.website ?? null;
        address = detailsJson.result?.formatted_address ?? address;
      }
    } catch {
      // segue sem detalhes se a chamada falhar
    }

    let email: string | null = null;
    if (website) {
      email = await extractEmailFromWebsite(website);
    }

    results.push({
      name: candidate.name,
      website,
      phone,
      email,
      address,
      sourcePlaceId: candidate.place_id,
      source: "google_places",
    });
  }

  return results;
}

/** Pesquisa empresas para uma query em linguagem natural (ex: "empresas de marketing em Lisboa"). */
export async function searchCompanies(query: string): Promise<{
  results: CompanySearchResult[];
  usedMockData: boolean;
}> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return {
      usedMockData: true,
      results: MOCK_COMPANIES.map((c) => ({ ...c, email: `geral@${new URL(c.website!).host.replace(/^www\./, "")}` })),
    };
  }

  const results = await searchWithGooglePlaces(query, apiKey);
  return { results, usedMockData: false };
}
