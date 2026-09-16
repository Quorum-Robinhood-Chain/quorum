import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.source.upsert({
    where: { name: "BeInCrypto" },
    update: {},
    create: {
      name: "BeInCrypto",
      url: "https://beincrypto.com",
      type: "news",
      feedUrl: process.env.BEINCRYPTO_FEED_URL || null,
      pollingIntervalMinutes: 20,
      tosNotes: "Confirm robots.txt + ToS before enabling (dev-brief §7.1, §17).",
    },
  });

  await prisma.source.upsert({
    where: { name: "Coinfomania" },
    update: {},
    create: {
      name: "Coinfomania",
      url: "https://coinfomania.com",
      type: "news",
      feedUrl: process.env.COINFOMANIA_FEED_URL || null,
      pollingIntervalMinutes: 20,
      tosNotes: "Confirm robots.txt + ToS before enabling (dev-brief §7.1, §17). Filter for 'Robinhood' mentions.",
    },
  });

  const tokens: Array<{ symbol: string; name: string; dex: string; category: "stock_token" | "defi" | "meme" }> = [
    { symbol: "AAPLx", name: "Apple Stock Token", dex: "Chainlink feed", category: "stock_token" },
    { symbol: "NVDAx", name: "Nvidia Stock Token", dex: "Chainlink feed", category: "stock_token" },
    { symbol: "USDG", name: "USDG (Morpho lending)", dex: "Morpho", category: "defi" },
    { symbol: "ARC", name: "Arcus", dex: "Arcus", category: "defi" },
    { symbol: "CASHCAT", name: "CashCat", dex: "Uniswap", category: "meme" },
    { symbol: "DADDY", name: "Daddy Coin", dex: "1inch", category: "meme" },
  ];

  for (const t of tokens) {
    const existing = await prisma.token.findFirst({ where: { symbol: t.symbol } });
    if (!existing) {
      await prisma.token.create({ data: { symbol: t.symbol, name: t.name, dex: t.dex, category: t.category } });
    }
  }

  await prisma.editor.upsert({
    where: { username: process.env.ADMIN_USERNAME || "admin" },
    update: {},
    create: { username: process.env.ADMIN_USERNAME || "admin", name: "Admin", role: "editor" },
  });

  console.log("Seed complete: 2 sources, 6 tokens, 1 editor.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
