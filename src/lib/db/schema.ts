import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { geometry } from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

export const surfaceEnum = pgEnum("surface", [
  "hard",
  "clay",
  "grass",
  "carpet",
]);

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const importStatusEnum = pgEnum("import_status", ["draft", "complete"]);

export const courtSourceEnum = pgEnum("court_source", [
  "manual",
  "osm",
  "google",
]);

export const feedbackTypeEnum = pgEnum("feedback_type", ["bug", "suggestion"]);

export const feedbackStatusEnum = pgEnum("feedback_status", [
  "open",
  "resolved",
]);

export const learnResourceKindEnum = pgEnum("learn_resource_kind", [
  "channel",
  "video",
]);

export const learnVideoCategoryEnum = pgEnum("learn_video_category", [
  "serve",
  "forehand",
  "backhand",
  "volley",
  "return",
  "footwork",
  "strategy",
  "mental",
  "fitness",
  "doubles",
  "other",
]);

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  role: userRoleEnum("role").notNull().default("user"),
});

export type UserRole = (typeof userRoleEnum.enumValues)[number];

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => [
    primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  ],
);

export const courts = pgTable(
  "courts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    address: text("address").notNull(),
    city: text("city").notNull(),
    region: text("region"),
    country: text("country").notNull().default("US"),
    location: geometry("location", {
      type: "point",
      mode: "xy",
      srid: 4326,
    }).notNull(),
    // Null means unknown (imported drafts); manual creates still set values.
    surface: surfaceEnum("surface"),
    courtCount: integer("court_count"),
    hasLights: boolean("has_lights"),
    isIndoor: boolean("is_indoor"),
    isFree: boolean("is_free"),
    feeNotes: text("fee_notes"),
    hasHittingWall: boolean("has_hitting_wall"),
    hasRestrooms: boolean("has_restrooms"),
    importStatus: importStatusEnum("import_status")
      .notNull()
      .default("complete"),
    source: courtSourceEnum("source").notNull().default("manual"),
    sourceId: text("source_id").unique(),
    sourceUrl: text("source_url"),
    createdBy: text("created_by").references(() => users.id),
    ratingAvg: real("rating_avg").notNull().default(0),
    ratingCount: integer("rating_count").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("courts_location_idx").using("gist", t.location)],
);

export type ImportStatus = (typeof importStatusEnum.enumValues)[number];
export type CourtSource = (typeof courtSourceEnum.enumValues)[number];

export const courtPhotos = pgTable("court_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  courtId: uuid("court_id")
    .notNull()
    .references(() => courts.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  width: integer("width"),
  height: integer("height"),
  sortOrder: integer("sort_order").notNull().default(0),
  uploadedBy: text("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const ratings = pgTable(
  "ratings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courtId: uuid("court_id")
      .notNull()
      .references(() => courts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stars: integer("stars").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("ratings_court_user_idx").on(t.courtId, t.userId),
  ],
);

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  courtId: uuid("court_id")
    .notNull()
    .references(() => courts.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  parentId: uuid("parent_id"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: feedbackTypeEnum("type").notNull(),
    status: feedbackStatusEnum("status").notNull().default("open"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    pageUrl: text("page_url"),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("feedback_created_at_idx").on(t.createdAt)],
);

export type FeedbackType = (typeof feedbackTypeEnum.enumValues)[number];
export type FeedbackStatus = (typeof feedbackStatusEnum.enumValues)[number];

export const learnResources = pgTable(
  "learn_resources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: learnResourceKindEnum("kind").notNull().default("channel"),
    category: learnVideoCategoryEnum("category"),
    title: text("title").notNull(),
    url: text("url").notNull(),
    description: text("description"),
    thumbnailUrl: text("thumbnail_url"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("learn_resources_sort_idx").on(t.sortOrder, t.createdAt),
    index("learn_resources_kind_category_idx").on(
      t.kind,
      t.category,
      t.sortOrder,
    ),
  ],
);

export type Court = typeof courts.$inferSelect;
export type CourtPhoto = typeof courtPhotos.$inferSelect;
export type Rating = typeof ratings.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type User = typeof users.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
export type LearnResource = typeof learnResources.$inferSelect;
export type LearnResourceKind = (typeof learnResourceKindEnum.enumValues)[number];
export type LearnVideoCategory =
  (typeof learnVideoCategoryEnum.enumValues)[number];
