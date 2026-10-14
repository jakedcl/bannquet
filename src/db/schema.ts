import { sql } from 'drizzle-orm';
import {
  boolean,
  customType,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { ACTIVITIES } from '../lib/activities';

/**
 * PostGIS geography columns. The first migration enables the postgis extension.
 * Point values are written as `ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography`.
 */
export const geographyPoint = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'geography(Point,4326)';
  },
});

export const geographyLine = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'geography(LineString,4326)';
  },
});

const createdAt = timestamp('created_at', { withTimezone: true }).defaultNow().notNull();

export const userRoleEnum = pgEnum('user_role', ['member', 'admin', 'pending']);
export const activityEnum = pgEnum('activity', ACTIVITIES);
export const tripStatusEnum = pgEnum('trip_status', ['planned', 'done', 'cancelled']);
export const rsvpEnum = pgEnum('rsvp', ['going', 'maybe', 'no']);
export const tripMemberRoleEnum = pgEnum('trip_member_role', ['organizer', 'member']);
export const pinKindEnum = pgEnum('pin_kind', [
  'summit',
  'trailhead',
  'camp',
  'water',
  'view',
  'hazard',
  'put_in',
  'crag',
  'other',
]);
export const trackSourceEnum = pgEnum('track_source', ['strava', 'gpx']);
export const pointSourceEnum = pgEnum('point_source', ['exif', 'manual']);
export const conditionCategoryEnum = pgEnum('condition_category', [
  'ice',
  'mud',
  'snow',
  'blowdown',
  'water',
  'closure',
  'other',
]);
export const peakListEnum = pgEnum('peak_list', ['adk46', 'nh48']);

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique(),
  handle: text('handle').unique(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  homeRegion: text('home_region'),
  bio: text('bio'),
  favoriteActivities: text('favorite_activities').array().notNull().default(sql`ARRAY[]::text[]`),
  role: userRoleEnum('role').notNull().default('member'),
  createdAt,
});

export const passwordResetLinks = pgTable('password_reset_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  tokenHash: text('token_hash').notNull().unique(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  emailed: boolean('emailed').notNull().default(false),
  createdAt,
});

export const invites = pgTable('invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  email: text('email'),
  invitedBy: text('invited_by').references(() => users.id, { onDelete: 'set null' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedBy: text('used_by').references(() => users.id, { onDelete: 'set null' }),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt,
});

export const trips = pgTable(
  'trips',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    activity: activityEnum('activity').notNull(),
    startAt: timestamp('start_at', { withTimezone: true }),
    endAt: timestamp('end_at', { withTimezone: true }),
    trailheadPoint: geographyPoint('trailhead_point'),
    trailheadName: text('trailhead_name'),
    routePlan: text('route_plan'),
    status: tripStatusEnum('status').notNull().default('planned'),
    createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt,
  },
  (table) => [
    index('trips_trailhead_point_idx').using('gist', table.trailheadPoint),
    index('trips_created_by_idx').on(table.createdBy),
  ],
);

export const tripMembers = pgTable(
  'trip_members',
  {
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    rsvp: rsvpEnum('rsvp').notNull().default('maybe'),
    role: tripMemberRoleEnum('role').notNull().default('member'),
  },
  (table) => [
    primaryKey({ columns: [table.tripId, table.userId] }),
    index('trip_members_trip_idx').on(table.tripId),
  ],
);

export const carpools = pgTable(
  'carpools',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    driverId: text('driver_id').references(() => users.id, { onDelete: 'set null' }),
    seats: integer('seats').notNull().default(3),
    departFrom: text('depart_from'),
    departAt: timestamp('depart_at', { withTimezone: true }),
    notes: text('notes'),
  },
  (table) => [index('carpools_trip_idx').on(table.tripId)],
);

export const carpoolRiders = pgTable(
  'carpool_riders',
  {
    carpoolId: uuid('carpool_id')
      .notNull()
      .references(() => carpools.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.carpoolId, table.userId] }),
    index('carpool_riders_carpool_idx').on(table.carpoolId),
  ],
);

export const tripReports = pgTable(
  'trip_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id').references(() => trips.id, { onDelete: 'set null' }),
    authorId: text('author_id').references(() => users.id, { onDelete: 'set null' }),
    legacyAuthorName: text('legacy_author_name'),
    legacyAuthorEmail: text('legacy_author_email'),
    title: text('title').notNull(),
    body: text('body').notNull().default(''),
    tripDate: date('trip_date'),
    activity: activityEnum('activity'),
    taggedUserIds: text('tagged_user_ids')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    point: geographyPoint('point'),
    tags: text('tags')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    legacySanityId: text('legacy_sanity_id'),
    published: boolean('published').notNull().default(false),
    createdAt,
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('trip_reports_legacy_sanity_id_unique').on(table.legacySanityId),
    index('trip_reports_point_idx').using('gist', table.point),
    index('trip_reports_trip_idx').on(table.tripId),
    index('trip_reports_published_idx').on(table.published),
  ],
);

export const pins = pgTable(
  'pins',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kind: pinKindEnum('kind').notNull().default('other'),
    activity: activityEnum('activity'),
    point: geographyPoint('point').notNull(),
    title: text('title').notNull(),
    note: text('note'),
    tripId: uuid('trip_id').references(() => trips.id, { onDelete: 'set null' }),
    tripReportId: uuid('trip_report_id').references(() => tripReports.id, { onDelete: 'cascade' }),
    createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt,
  },
  (table) => [
    index('pins_point_idx').using('gist', table.point),
    index('pins_trip_idx').on(table.tripId),
    index('pins_trip_report_idx').on(table.tripReportId),
  ],
);

export const tracks = pgTable(
  'tracks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    tripId: uuid('trip_id').references(() => trips.id, { onDelete: 'set null' }),
    tripReportId: uuid('trip_report_id').references(() => tripReports.id, { onDelete: 'cascade' }),
    source: trackSourceEnum('source').notNull(),
    externalId: text('external_id'),
    name: text('name').notNull(),
    activity: activityEnum('activity').notNull(),
    line: geographyLine('line').notNull(),
    distanceM: integer('distance_m'),
    elevGainM: integer('elev_gain_m'),
    movingS: integer('moving_s'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    createdAt,
  },
  (table) => [
    index('tracks_line_idx').using('gist', table.line),
    index('tracks_trip_idx').on(table.tripId),
    index('tracks_trip_report_idx').on(table.tripReportId),
    index('tracks_user_idx').on(table.userId),
    uniqueIndex('tracks_source_external_unique').on(table.source, table.externalId),
  ],
);

export const albums = pgTable(
  'albums',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id').references(() => trips.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt,
  },
  (table) => [index('albums_trip_idx').on(table.tripId)],
);

export const photos = pgTable(
  'photos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    albumId: uuid('album_id').references(() => albums.id, { onDelete: 'set null' }),
    tripReportId: uuid('trip_report_id').references(() => tripReports.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    blobUrl: text('blob_url').notNull(),
    width: integer('width'),
    height: integer('height'),
    takenAt: timestamp('taken_at', { withTimezone: true }),
    point: geographyPoint('point'),
    pointSource: pointSourceEnum('point_source'),
    caption: text('caption'),
    alt: text('alt'),
    pinId: uuid('pin_id').references(() => pins.id, { onDelete: 'set null' }),
    legacySanityAssetId: text('legacy_sanity_asset_id'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt,
  },
  (table) => [
    index('photos_point_idx').using('gist', table.point),
    index('photos_album_idx').on(table.albumId),
    index('photos_trip_report_idx').on(table.tripReportId),
    uniqueIndex('photos_report_asset_unique').on(table.tripReportId, table.legacySanityAssetId),
  ],
);

export const conditionReports = pgTable(
  'condition_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    point: geographyPoint('point').notNull(),
    peakSlug: text('peak_slug'),
    category: conditionCategoryEnum('category').notNull(),
    body: text('body').notNull(),
    observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    photoId: uuid('photo_id').references(() => photos.id, { onDelete: 'set null' }),
    createdAt,
  },
  (table) => [
    index('condition_reports_point_idx').using('gist', table.point),
    index('condition_reports_expires_idx').on(table.expiresAt),
  ],
);

export const gearItems = pgTable('gear_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  category: text('category'),
  weightG: integer('weight_g'),
  isConsumable: boolean('is_consumable').notNull().default(false),
  isWorn: boolean('is_worn').notNull().default(false),
  createdAt,
});

export const packingTemplates = pgTable('packing_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: text('owner_id').references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  activity: activityEnum('activity'),
  season: text('season'),
  createdAt,
});

export const packingTemplateItems = pgTable(
  'packing_template_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    templateId: uuid('template_id')
      .notNull()
      .references(() => packingTemplates.id, { onDelete: 'cascade' }),
    gearItemId: uuid('gear_item_id').references(() => gearItems.id, { onDelete: 'set null' }),
    label: text('label').notNull(),
    qty: integer('qty').notNull().default(1),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [index('packing_template_items_template_idx').on(table.templateId)],
);

export const packingLists = pgTable(
  'packing_lists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    createdAt,
  },
  (table) => [index('packing_lists_trip_idx').on(table.tripId)],
);

export const packingListItems = pgTable(
  'packing_list_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listId: uuid('list_id')
      .notNull()
      .references(() => packingLists.id, { onDelete: 'cascade' }),
    gearItemId: uuid('gear_item_id').references(() => gearItems.id, { onDelete: 'set null' }),
    label: text('label').notNull(),
    qty: integer('qty').notNull().default(1),
    weightG: integer('weight_g'),
    assignedTo: text('assigned_to').references(() => users.id, { onDelete: 'set null' }),
    packed: boolean('packed').notNull().default(false),
    shared: boolean('shared').notNull().default(false),
  },
  (table) => [index('packing_list_items_list_idx').on(table.listId)],
);

export const peaks = pgTable(
  'peaks',
  {
    slug: text('slug').primaryKey(),
    name: text('name').notNull(),
    list: peakListEnum('list').notNull(),
    elevationFt: integer('elevation_ft').notNull(),
    point: geographyPoint('point').notNull(),
    info: text('info'),
  },
  (table) => [index('peaks_point_idx').using('gist', table.point)],
);

export const guides = pgTable('guides', {
  slug: text('slug').primaryKey(),
  title: text('title').notNull(),
  body: text('body').notNull().default(''),
  updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const summits = pgTable(
  'summits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    peakSlug: text('peak_slug')
      .notNull()
      .references(() => peaks.slug, { onDelete: 'cascade' }),
    summitedAt: timestamp('summited_at', { withTimezone: true }).notNull(),
    trackId: uuid('track_id').references(() => tracks.id, { onDelete: 'set null' }),
    photoId: uuid('photo_id').references(() => photos.id, { onDelete: 'set null' }),
    verified: boolean('verified').notNull().default(false),
    createdAt,
  },
  (table) => [
    index('summits_user_peak_idx').on(table.userId, table.peakSlug),
  ],
);

export const badges = pgTable('badges', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  activity: activityEnum('activity'),
});

export const userBadges = pgTable(
  'user_badges',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    badgeId: uuid('badge_id')
      .notNull()
      .references(() => badges.id, { onDelete: 'cascade' }),
    earnedAt: timestamp('earned_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.badgeId] })],
);

/**
 * Tokens are plain text in this scaffold. Encrypt them before anyone connects Strava.
 */
export const stravaAccounts = pgTable('strava_accounts', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  athleteId: text('athlete_id').notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
});
