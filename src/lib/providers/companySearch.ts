import { extractEmailFromWebsite } from "./emailExtractor";

export type CompanySearchResult = {
  name: string;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  rating: number | null;
  userRatingsTotal: number | null;
  sourcePlaceId: string | null;
  source: string;
};

const DEFAULT_RESULT_LIMIT = 20;
const MAX_RESULT_LIMIT = 45; // 3 páginas da Text Search API (20 por página, no máximo)

const MOCK_COMPANIES: Omit<CompanySearchResult, "email">[] = [
  {
    name: "Norte Digital Marketing",
    website: "https://www.exemplo-norte-digital.pt",
    phone: "+351 220 000 001",
    address: "Porto, Portugal",
    rating: 4.7,
    userRatingsTotal: 32,
    sourcePlaceId: null,
    source: "mock",
  },
  {
    name: "Agência Lumen",
    website: "https://www.exemplo-lumen.pt",
    phone: "+351 220 000 002",
    address: "Lisboa, Portugal",
    rating: 4.5,
    userRatingsTotal: 18,
    sourcePlaceId: null,
    source: "mock",
  },
  {
    name: "Bússola Marketing Digital",
    website: "https://www.exemplo-bussola.pt",
    phone: "+351 220 000 003",
    address: "Braga, Portugal",
    rating: 4.2,
    userRatingsTotal: 9,
    sourcePlaceId: null,
    source: "mock",
  },
];

type TextSearchCandidate = { place_id: string; name: string; formatted_address?: string };

type TextSearchPage = {
  results?: TextSearchCandidate[];
  next_page_token?: string;
  status: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchTextSearchPage(
  query: string,
  apiKey: string,
  pageToken?: string,
): Promise<TextSearchPage> {
  const searchUrl = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  if (pageToken) {
    searchUrl.searchParams.set("pagetoken", pageToken);
  } else {
    searchUrl.searchParams.set("query", query);
  }
  searchUrl.searchParams.set("key", apiKey);

  const res = await fetch(searchUrl.toString());
  if (!res.ok) {
    throw new Error(`Google Places falhou: ${res.status}`);
  }
  return (await res.json()) as TextSearchPage;
}

/** Percorre até 3 páginas da Text Search API (limite da própria Google) até juntar `limit` candidatos. */
async function collectTextSearchCandidates(
  query: string,
  apiKey: string,
  limit: number,
): Promise<TextSearchCandidate[]> {
  const candidates: TextSearchCandidate[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < 3 && candidates.length < limit; page++) {
    if (pageToken) {
      // a Google só aceita o pagetoken depois de um pequeno atraso
      await sleep(2000);
    }

    const json = await fetchTextSearchPage(query, apiKey, pageToken);

    if (json.status !== "OK" && json.status !== "ZERO_RESULTS") {
      if (page === 0) {
        throw new Error(`Google Places devolveu estado: ${json.status}`);
      }
      break;
    }

    candidates.push(...(json.results ?? []));
    pageToken = json.next_page_token;
    if (!pageToken) break;
  }

  return candidates.slice(0, limit);
}

async function fetchPlaceDetails(placeId: string, apiKey: string) {
  const detailsUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  detailsUrl.searchParams.set("place_id", placeId);
  detailsUrl.searchParams.set(
    "fields",
    "formatted_phone_number,international_phone_number,website,formatted_address,rating,user_ratings_total",
  );
  detailsUrl.searchParams.set("key", apiKey);

  const res = await fetch(detailsUrl.toString());
  if (!res.ok) return null;
  const json = (await res.json()) as {
    result?: {
      formatted_phone_number?: string;
      international_phone_number?: string;
      website?: string;
      formatted_address?: string;
      rating?: number;
      user_ratings_total?: number;
    };
  };
  return json.result ?? null;
}

async function searchWithGooglePlaces(
  query: string,
  apiKey: string,
  limit: number,
): Promise<CompanySearchResult[]> {
  const candidates = await collectTextSearchCandidates(query, apiKey, limit);

  const results: CompanySearchResult[] = [];
  for (const candidate of candidates) {
    const details = await fetchPlaceDetails(candidate.place_id, apiKey);

    const phone = details?.formatted_phone_number ?? details?.international_phone_number ?? null;
    const website = details?.website ?? null;
    const address = details?.formatted_address ?? candidate.formatted_address ?? null;
    const rating = details?.rating ?? null;
    const userRatingsTotal = details?.user_ratings_total ?? null;

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
      rating,
      userRatingsTotal,
      sourcePlaceId: candidate.place_id,
      source: "google_places",
    });
  }

  // melhor avaliação primeiro; sem avaliação fica no fim
  results.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));

  return results;
}

/** Pesquisa empresas para uma query em linguagem natural (ex: "empresas de marketing em Lisboa"). */
export async function searchCompanies(
  query: string,
  limit: number = DEFAULT_RESULT_LIMIT,
): Promise<{
  results: CompanySearchResult[];
  usedMockData: boolean;
}> {
  const cappedLimit = Math.min(Math.max(limit, 1), MAX_RESULT_LIMIT);
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return {
      usedMockData: true,
      results: MOCK_COMPANIES.map((c) => ({ ...c, email: `geral@${new URL(c.website!).host.replace(/^www\./, "")}` })),
    };
  }

  const results = await searchWithGooglePlaces(query, apiKey, cappedLimit);
  return { results, usedMockData: false };
}
