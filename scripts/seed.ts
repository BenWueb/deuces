import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";

config({ path: ".env.local" });
config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required in .env.local");
  process.exit(1);
}

const db = drizzle({ client: neon(connectionString) });

const seedUsers = [
  { id: "seed-user-alex", name: "Alex Morgan", email: "alex@seed.deuces.app" },
  { id: "seed-user-jordan", name: "Jordan Lee", email: "jordan@seed.deuces.app" },
  { id: "seed-user-sam", name: "Sam Rivera", email: "sam@seed.deuces.app" },
];

// Photos are added through the app rather than seeded, so courts start
// with the placeholder artwork until someone uploads a real picture.
const courts = [
  {
    slug: "central-park-tennis",
    name: "Central Park Tennis Center",
    description:
      "Public hard courts in the heart of Central Park. First-come, first-served with a waitlist system during peak hours.",
    address: "Central Park, New York, NY",
    city: "New York",
    region: "NY",
    country: "US",
    lng: -73.9654,
    lat: 40.769,
    surface: "hard",
    courtCount: 26,
    hasLights: false,
    isIndoor: false,
    isFree: false,
    feeNotes: "Permit required, $15/hour off-peak",
    hasHittingWall: false,
    hasRestrooms: true,
    ratings: [
      { userId: "seed-user-alex", stars: 4 },
      { userId: "seed-user-jordan", stars: 5 },
    ],
    comments: [
      {
        userId: "seed-user-alex",
        body: "Great courts but the waitlist on weekends is brutal. Get here before 7am if you want a spot.",
      },
      {
        userId: "seed-user-sam",
        body: "Surface is well maintained. Pro shop nearby has decent stringing.",
      },
    ],
  },
  {
    slug: "piedmont-park-tennis",
    name: "Piedmont Park Tennis Center",
    description:
      "Well-maintained hard courts with mountain views. Popular with local league players.",
    address: "400 Park Dr NE, Atlanta, GA",
    city: "Atlanta",
    region: "GA",
    country: "US",
    lng: -84.3733,
    lat: 33.7869,
    surface: "hard",
    courtCount: 12,
    hasLights: true,
    isIndoor: false,
    isFree: false,
    feeNotes: "$8/hour, lights extra",
    hasHittingWall: true,
    hasRestrooms: true,
    ratings: [
      { userId: "seed-user-jordan", stars: 4 },
      { userId: "seed-user-sam", stars: 4 },
    ],
    comments: [
      {
        userId: "seed-user-jordan",
        body: "Night sessions under the lights are perfect in summer. Hitting wall is a nice bonus.",
      },
    ],
  },
  {
    slug: "roland-garros-public",
    name: "Stade Roland Garros (Public Courts)",
    description:
      "Iconic clay courts open to the public outside of tournament season. A bucket-list destination for tennis fans.",
    address: "2 Av. Gordon Bennett, Paris",
    city: "Paris",
    region: "Île-de-France",
    country: "France",
    lng: 2.2488,
    lat: 48.8468,
    surface: "clay",
    courtCount: 8,
    hasLights: true,
    isIndoor: false,
    isFree: false,
    feeNotes: "€20/hour, book online",
    hasHittingWall: false,
    hasRestrooms: true,
    ratings: [
      { userId: "seed-user-alex", stars: 5 },
      { userId: "seed-user-sam", stars: 5 },
    ],
    comments: [
      {
        userId: "seed-user-sam",
        body: "Playing on clay here is unreal. Book at least a week ahead in spring.",
      },
    ],
  },
  {
    slug: "venice-beach-tennis",
    name: "Venice Beach Public Courts",
    description:
      "Legendary public courts steps from the beach. Great atmosphere, competitive pickup games on weekends.",
    address: "1800 Ocean Front Walk, Venice, CA",
    city: "Los Angeles",
    region: "CA",
    country: "US",
    lng: -118.4695,
    lat: 33.985,
    surface: "hard",
    courtCount: 6,
    hasLights: false,
    isIndoor: false,
    isFree: true,
    feeNotes: null,
    hasHittingWall: false,
    hasRestrooms: true,
    ratings: [
      { userId: "seed-user-alex", stars: 5 },
      { userId: "seed-user-jordan", stars: 3 },
    ],
    comments: [
      {
        userId: "seed-user-alex",
        body: "Free and fun but the vibe can get intense on Saturday mornings. Bring your A game.",
      },
    ],
  },
  {
    slug: "wimbledon-park",
    name: "Wimbledon Park Tennis Courts",
    description:
      "Community courts near the All England Club. Mix of hard and artificial grass surfaces.",
    address: "Home Park Rd, Wimbledon, London",
    city: "London",
    region: "England",
    country: "UK",
    lng: -0.2144,
    lat: 51.4344,
    surface: "grass",
    courtCount: 10,
    hasLights: true,
    isIndoor: false,
    isFree: false,
    feeNotes: "£12/hour, membership available",
    hasHittingWall: true,
    hasRestrooms: true,
    ratings: [{ userId: "seed-user-jordan", stars: 4 }],
    comments: [],
  },
  {
    slug: "millennium-park-tennis",
    name: "Millennium Park Tennis Courts",
    description:
      "Downtown Chicago public courts with skyline views. Wind can be a factor on gusty days.",
    address: "337 E Randolph St, Chicago, IL",
    city: "Chicago",
    region: "IL",
    country: "US",
    lng: -87.6214,
    lat: 41.8826,
    surface: "hard",
    courtCount: 4,
    hasLights: true,
    isIndoor: false,
    isFree: true,
    feeNotes: null,
    hasHittingWall: false,
    hasRestrooms: true,
    ratings: [{ userId: "seed-user-sam", stars: 4 }],
    comments: [
      {
        userId: "seed-user-sam",
        body: "Can't beat free tennis with the skyline behind you. Courts fill up fast after work.",
      },
    ],
  },
  {
    slug: "crandon-park-tennis",
    name: "Crandon Park Tennis Center",
    description:
      "Premier Miami facility on Key Biscayne. Hard courts with ocean breezes and excellent maintenance.",
    address: "6747 Crandon Blvd, Key Biscayne, FL",
    city: "Miami",
    region: "FL",
    country: "US",
    lng: -80.1558,
    lat: 25.6943,
    surface: "hard",
    courtCount: 13,
    hasLights: true,
    isIndoor: false,
    isFree: false,
    feeNotes: "$12/hour, reservations recommended",
    hasHittingWall: true,
    hasRestrooms: true,
    ratings: [
      { userId: "seed-user-alex", stars: 5 },
      { userId: "seed-user-sam", stars: 4 },
    ],
    comments: [
      {
        userId: "seed-user-alex",
        body: "Best public courts in Miami. Pro tip: book the early morning slots before it gets too hot.",
      },
    ],
  },
  {
    slug: "seattle-center-tennis",
    name: "Seattle Center Tennis Courts",
    description:
      "Indoor and outdoor courts near the Space Needle. Rain backup with covered hard courts.",
    address: "305 Harrison St, Seattle, WA",
    city: "Seattle",
    region: "WA",
    country: "US",
    lng: -122.3509,
    lat: 47.6205,
    surface: "hard",
    courtCount: 8,
    hasLights: true,
    isIndoor: true,
    isFree: false,
    feeNotes: "$10/hour indoor, $6 outdoor",
    hasHittingWall: false,
    hasRestrooms: true,
    ratings: [{ userId: "seed-user-jordan", stars: 4 }],
    comments: [
      {
        userId: "seed-user-jordan",
        body: "Indoor courts saved my winter. Booking online is easy.",
      },
    ],
  },

  // Twin Cities east metro, clustered around Woodbury for local testing.
  {
    slug: "ojibway-park-woodbury",
    name: "Ojibway Park",
    description:
      "Six lighted hard courts next to the ball fields. Busiest right after work on weeknights.",
    address: "2695 Ojibway Dr, Woodbury, MN",
    city: "Woodbury",
    region: "MN",
    country: "US",
    lng: -92.9435,
    lat: 44.9297,
    surface: "hard",
    courtCount: 6,
    hasLights: true,
    isIndoor: false,
    isFree: true,
    feeNotes: null,
    hasHittingWall: true,
    hasRestrooms: true,
    ratings: [
      { userId: "seed-user-alex", stars: 5 },
      { userId: "seed-user-jordan", stars: 4 },
    ],
    comments: [
      {
        userId: "seed-user-alex",
        body: "The go-to public courts in Woodbury. Nets are in good shape and the backboard is great for solo practice.",
      },
    ],
  },
  {
    slug: "bielenberg-sports-center",
    name: "Bielenberg Sports Center Courts",
    description:
      "Hard courts at the main Woodbury sports complex. Plenty of parking and restrooms on site.",
    address: "4125 Radio Dr, Woodbury, MN",
    city: "Woodbury",
    region: "MN",
    country: "US",
    lng: -92.9433,
    lat: 44.9008,
    surface: "hard",
    courtCount: 8,
    hasLights: true,
    isIndoor: false,
    isFree: true,
    feeNotes: null,
    hasHittingWall: false,
    hasRestrooms: true,
    ratings: [
      { userId: "seed-user-sam", stars: 4 },
      { userId: "seed-user-jordan", stars: 5 },
    ],
    comments: [
      {
        userId: "seed-user-sam",
        body: "Never had trouble finding an open court here, even on weekends.",
      },
    ],
  },
  {
    slug: "carver-lake-park",
    name: "Carver Lake Park Courts",
    description:
      "Quiet hard courts by the beach and trail system. No lights, so plan around sunset.",
    address: "3175 Century Ave S, Woodbury, MN",
    city: "Woodbury",
    region: "MN",
    country: "US",
    lng: -92.9218,
    lat: 44.8905,
    surface: "hard",
    courtCount: 4,
    hasLights: false,
    isIndoor: false,
    isFree: true,
    feeNotes: null,
    hasHittingWall: false,
    hasRestrooms: true,
    ratings: [{ userId: "seed-user-alex", stars: 4 }],
    comments: [
      {
        userId: "seed-user-alex",
        body: "Nice setting next to the lake. Gets windy in the afternoon.",
      },
    ],
  },
  {
    slug: "colby-lake-park",
    name: "Colby Lake Park Courts",
    description:
      "Two neighborhood hard courts. Rarely crowded, good for a casual hit.",
    address: "9280 Cottage Grove Dr, Woodbury, MN",
    city: "Woodbury",
    region: "MN",
    country: "US",
    lng: -92.901,
    lat: 44.9105,
    surface: "hard",
    courtCount: 2,
    hasLights: false,
    isIndoor: false,
    isFree: true,
    feeNotes: null,
    hasHittingWall: false,
    hasRestrooms: false,
    ratings: [{ userId: "seed-user-jordan", stars: 3 }],
    comments: [],
  },
  {
    slug: "lake-elmo-park-reserve",
    name: "Lake Elmo Park Reserve Courts",
    description:
      "Hard courts inside the park reserve. Vehicle entry permit required for the park itself.",
    address: "1515 Keats Ave N, Lake Elmo, MN",
    city: "Lake Elmo",
    region: "MN",
    country: "US",
    lng: -92.888,
    lat: 44.98,
    surface: "hard",
    courtCount: 2,
    hasLights: false,
    isIndoor: false,
    isFree: false,
    feeNotes: "$7 daily vehicle permit for the park reserve",
    hasHittingWall: false,
    hasRestrooms: true,
    ratings: [{ userId: "seed-user-sam", stars: 4 }],
    comments: [
      {
        userId: "seed-user-sam",
        body: "Worth the park fee if you want to make a morning of it. Trails right there.",
      },
    ],
  },
  {
    slug: "walton-park-oakdale",
    name: "Walton Park Courts",
    description:
      "Lighted hard courts in Oakdale. Popular with the high school team in spring.",
    address: "Walton Park, Oakdale, MN",
    city: "Oakdale",
    region: "MN",
    country: "US",
    lng: -92.965,
    lat: 44.963,
    surface: "hard",
    courtCount: 4,
    hasLights: true,
    isIndoor: false,
    isFree: true,
    feeNotes: null,
    hasHittingWall: false,
    hasRestrooms: true,
    ratings: [{ userId: "seed-user-jordan", stars: 4 }],
    comments: [],
  },
  {
    slug: "hamlet-park-cottage-grove",
    name: "Hamlet Park Courts",
    description:
      "Six hard courts with lights and a practice wall. The main tennis hub in Cottage Grove.",
    address: "8790 Hamlet Ave S, Cottage Grove, MN",
    city: "Cottage Grove",
    region: "MN",
    country: "US",
    lng: -92.943,
    lat: 44.828,
    surface: "hard",
    courtCount: 6,
    hasLights: true,
    isIndoor: false,
    isFree: true,
    feeNotes: null,
    hasHittingWall: true,
    hasRestrooms: true,
    ratings: [
      { userId: "seed-user-alex", stars: 4 },
      { userId: "seed-user-sam", stars: 5 },
    ],
    comments: [
      {
        userId: "seed-user-sam",
        body: "Best setup south of the river. Lights stay on until 10pm in summer.",
      },
    ],
  },
  {
    slug: "phalen-park-st-paul",
    name: "Phalen Park Courts",
    description:
      "Public hard courts by Lake Phalen with a golf course and trails next door.",
    address: "1615 Phalen Dr, St Paul, MN",
    city: "Saint Paul",
    region: "MN",
    country: "US",
    lng: -93.053,
    lat: 44.98,
    surface: "hard",
    courtCount: 6,
    hasLights: false,
    isIndoor: false,
    isFree: true,
    feeNotes: null,
    hasHittingWall: false,
    hasRestrooms: true,
    ratings: [{ userId: "seed-user-alex", stars: 4 }],
    comments: [
      {
        userId: "seed-user-alex",
        body: "Solid free courts with a great view of the lake. Surface is showing some age.",
      },
    ],
  },
  {
    slug: "woodbury-indoor-tennis",
    name: "Woodbury Indoor Tennis Club",
    description:
      "Year-round indoor hard courts. Court time is reservation only and books up fast in winter.",
    address: "Radio Dr, Woodbury, MN",
    city: "Woodbury",
    region: "MN",
    country: "US",
    lng: -92.9367,
    lat: 44.9235,
    surface: "hard",
    courtCount: 6,
    hasLights: true,
    isIndoor: true,
    isFree: false,
    feeNotes: "$28/hour peak, $18/hour off-peak",
    hasHittingWall: false,
    hasRestrooms: true,
    ratings: [
      { userId: "seed-user-jordan", stars: 5 },
      { userId: "seed-user-sam", stars: 4 },
    ],
    comments: [
      {
        userId: "seed-user-jordan",
        body: "The only way to keep playing in January. Reserve a week ahead.",
      },
    ],
  },
];

async function seedUsers_() {
  console.log("Seeding users...");
  for (const user of seedUsers) {
    await db.execute(sql`
      INSERT INTO "user" (id, name, email)
      VALUES (${user.id}, ${user.name}, ${user.email})
      ON CONFLICT (id) DO NOTHING
    `);
  }
}

async function seedCourts() {
  console.log("Seeding courts...");
  for (const court of courts) {
    const result = await db.execute<{ id: string }>(sql`
      INSERT INTO courts (
        slug, name, description, address, city, region, country,
        location, surface, court_count, has_lights, is_indoor, is_free,
        fee_notes, has_hitting_wall, has_restrooms
      ) VALUES (
        ${court.slug},
        ${court.name},
        ${court.description},
        ${court.address},
        ${court.city},
        ${court.region},
        ${court.country},
        ST_SetSRID(ST_MakePoint(${court.lng}, ${court.lat}), 4326),
        ${court.surface}::surface,
        ${court.courtCount},
        ${court.hasLights},
        ${court.isIndoor},
        ${court.isFree},
        ${court.feeNotes},
        ${court.hasHittingWall},
        ${court.hasRestrooms}
      )
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        updated_at = now()
      RETURNING id
    `);

    const courtId = result.rows[0]?.id;
    if (!courtId) continue;

    for (const rating of court.ratings) {
      await db.execute(sql`
        INSERT INTO ratings (court_id, user_id, stars)
        VALUES (${courtId}, ${rating.userId}, ${rating.stars})
        ON CONFLICT (court_id, user_id) DO UPDATE SET stars = EXCLUDED.stars
      `);
    }

    await db.execute(sql`
      UPDATE courts SET
        rating_avg = (SELECT COALESCE(AVG(stars), 0) FROM ratings WHERE court_id = ${courtId}),
        rating_count = (SELECT COUNT(*) FROM ratings WHERE court_id = ${courtId})
      WHERE id = ${courtId}
    `);

    // Insert only missing seed comments so real user comments survive re-seeding.
    for (const comment of court.comments) {
      await db.execute(sql`
        INSERT INTO comments (court_id, user_id, body)
        SELECT ${courtId}, ${comment.userId}, ${comment.body}
        WHERE NOT EXISTS (
          SELECT 1 FROM comments
          WHERE court_id = ${courtId}
            AND user_id = ${comment.userId}
            AND body = ${comment.body}
        )
      `);
    }

    console.log(`  ✓ ${court.name}`);
  }
}

async function seed() {
  await seedUsers_();
  await seedCourts();
  console.log("Done! Refresh the app to see courts.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
