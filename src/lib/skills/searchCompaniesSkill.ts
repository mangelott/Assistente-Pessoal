import { prisma } from "@/lib/prisma";
import { searchCompanies } from "@/lib/providers/companySearch";

export type SearchCompaniesInput = {
  query: string;
  limit?: number;
};

export async function runSearchCompaniesSkill({ query, limit }: SearchCompaniesInput) {
  const { results, usedMockData } = await searchCompanies(query, limit);

  const searchSession = await prisma.searchSession.create({
    data: {
      query,
      companies: {
        create: results.map((r) => ({
          name: r.name,
          website: r.website,
          phone: r.phone,
          email: r.email,
          address: r.address,
          rating: r.rating,
          userRatingsTotal: r.userRatingsTotal,
          source: r.source,
          sourcePlaceId: r.sourcePlaceId,
        })),
      },
    },
    include: { companies: true },
  });

  const withEmail = searchSession.companies.filter((c) => c.email);

  return {
    searchSessionId: searchSession.id,
    query,
    usedMockData,
    totalFound: searchSession.companies.length,
    totalWithEmail: withEmail.length,
    companies: searchSession.companies.map((c) => ({
      name: c.name,
      phone: c.phone,
      email: c.email,
      website: c.website,
      rating: c.rating,
      userRatingsTotal: c.userRatingsTotal,
    })),
  };
}
