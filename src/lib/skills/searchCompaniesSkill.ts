import { prisma } from "@/lib/prisma";
import { searchCompanies } from "@/lib/providers/companySearch";

export type SearchCompaniesInput = {
  query: string;
};

export async function runSearchCompaniesSkill({ query }: SearchCompaniesInput) {
  const { results, usedMockData } = await searchCompanies(query);

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
    })),
  };
}
