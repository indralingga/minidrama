import { PrismaClient, Category } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding providers...");

  const providers = [
    {
      name: "NetShort",
      slug: "netshort",
      category: Category.SHORT,
      iconUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&h=128&fit=crop",
      apiBaseUrl: "https://www.cutad.web.id/api/public/netshort",
      isActive: true,
      sortOrder: 1,
    },
    {
      name: "ReelShort",
      slug: "reelshort",
      category: Category.SHORT,
      iconUrl: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=128&h=128&fit=crop",
      apiBaseUrl: "https://www.cutad.web.id/api/public/reelshort",
      isActive: true,
      sortOrder: 2,
    },
    {
      name: "DramaBox",
      slug: "dramabox",
      category: Category.DRAMA,
      iconUrl: "https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=128&h=128&fit=crop",
      apiBaseUrl: "https://www.cutad.web.id/api/public/dramabox",
      isActive: true,
      sortOrder: 3,
    },
    {
      name: "ShortMax",
      slug: "shortmax",
      category: Category.SHORT,
      iconUrl: "https://images.unsplash.com/photo-1618005198143-d3782b5752f6?w=128&h=128&fit=crop",
      apiBaseUrl: "https://www.cutad.web.id/api/public/shortmax",
      isActive: true,
      sortOrder: 4,
    },
  ];

  for (const provider of providers) {
    await prisma.provider.upsert({
      where: { slug: provider.slug },
      update: provider,
      create: provider,
    });
  }

  console.log("Providers seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
