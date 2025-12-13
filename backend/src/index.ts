import { ApolloServer } from 'apollo-server';
import { typeDefs } from './schema';
import { appConfig } from './config';
import { dbPool, ensureSchema, DealRow } from './db';
import { redis } from './redis';

type DealSort = 'NEWEST' | 'PRICE_ASC';

interface ActiveDealsArgs {
  destination?: string | null;
  maxPrice?: number | null;
  sortBy?: DealSort | null;
}

interface DealResult {
  id: string;
  destination: string;
  price: number;
  airline: string;
  createdAt: string;
}

function mapDeal(row: DealRow): DealResult {
  return {
    id: row.id,
    destination: row.destination,
    price: Number(row.price),
    airline: row.airline,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString(),
  };
}

function buildActiveDealsCacheKey(args: ActiveDealsArgs): string {
  if (!args.destination && (args.maxPrice === null || args.maxPrice === undefined)) {
    return 'cache:deals:active';
  }

  const destination = args.destination ?? 'any';
  const maxPrice = args.maxPrice ?? 'any';
  return `cache:deals:active:dest=${destination}:max=${maxPrice}`;
}

async function fetchActiveDeals(args: ActiveDealsArgs): Promise<DealResult[]> {
  const conditions: string[] = [];
  const values: Array<string | number> = [];

  if (args.destination) {
    conditions.push(`destination = $${conditions.length + 1}`);
    values.push(args.destination);
  }
  if (typeof args.maxPrice === 'number') {
    conditions.push(`price <= $${conditions.length + 1}`);
    values.push(args.maxPrice);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const sortBy: DealSort = args.sortBy ?? 'NEWEST';
  const orderClause =
    sortBy === 'PRICE_ASC'
      ? 'ORDER BY price ASC, created_at DESC'
      : 'ORDER BY created_at DESC';
  const query = `SELECT id, destination, price, airline, created_at FROM deals ${whereClause} ${orderClause} LIMIT 50`;

  const result = await dbPool.query<DealRow>(query, values);
  return result.rows.map(mapDeal);
}

async function getDealById(id: string): Promise<DealResult | null> {
  const result = await dbPool.query<DealRow>(
    'SELECT id, destination, price, airline, created_at FROM deals WHERE id = $1 LIMIT 1',
    [id]
  );
  const row = result.rows[0];
  return row ? mapDeal(row) : null;
}

const resolvers = {
  Query: {
    activeDeals: async (_parent: unknown, args: ActiveDealsArgs) => {
      const cacheKey = buildActiveDealsCacheKey(args);
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as DealResult[];
      }

      const deals = await fetchActiveDeals(args);
      if (deals.length > 0) {
        await redis.set(cacheKey, JSON.stringify(deals), 'EX', appConfig.activeDealsTtlSeconds);
      }
      return deals;
    },
    deal: async (_parent: unknown, args: { id: string }) => getDealById(args.id),
  },
  Mutation: {
    createAlertRule: async () => {
      // Placeholder implementation until alert rules are modeled
      return true;
    },
  },
};

async function bootstrap() {
  await ensureSchema();
  const server = new ApolloServer({ typeDefs, resolvers });

  try {
    const { url } = await server.listen({ port: appConfig.port });
    console.log(`🚀 Backend ready at ${url}`);
  } catch (error) {
    console.error('Failed to start backend server', error);
    process.exit(1);
  }
}

void bootstrap();
