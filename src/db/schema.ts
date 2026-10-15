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
  homeScreenTipSeenAt: timestamp('home_screen_tip_seen_at', { withTimezone: true }),
  createdAt,
});

export const handleRedirects = pgTable('handle_redirects', {
  handle: text('handle').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
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
    notes: text('notes'),
    tripDate: date('trip_date'),
    legacyReportId: uuid('legacy_report_id'),
    status: tripStatusEnum('status').notNull().default('planned'),
    createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt,
  },
  (table) => [
    index('trips_trailhead_point_idx').using('gist', table.trailheadPoint),
    index('trips_created_by_idx').on(table.createdBy),
    uniqueIndex('trips_legacy_report_id_unique').on(table.legacyReportId),
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

export const pins = pgTable(
  'pins',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kind: pinKindEnum('kind').notNull().default('other'),
    activity: activityEnum('activity'),
    point: geographyPoint('point').notNull(),
    title: text('title').notNull(),
    note: text('note'),
    visitedOn: date('visited_on'),
    createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt,
  },
  (table) => [
    index('pins_point_idx').using('gist', table.point),
    index('pins_created_by_idx').on(table.createdBy),
  ],
);

export const tracks = pgTable(
  'tracks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    source: trackSourceEnum('source').notNull(),
    externalId: text('external_id'),
    name: text('name').notNull(),
    title: text('title'),
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
    index('tracks_user_idx').on(table.userId),
    uniqueIndex('tracks_source_external_unique').on(table.source, table.externalId),
  ],
);

export const photos = pgTable(
  'photos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
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
  ],
);

export const tripPins = pgTable(
  'trip_pins',
  {
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    pinId: uuid('pin_id')
      .notNull()
      .references(() => pins.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.tripId, table.pinId] })],
);

export const tripRoutes = pgTable(
  'trip_routes',
  {
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    trackId: uuid('track_id')
      .notNull()
      .references(() => tracks.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.tripId, table.trackId] })],
);

export const tripPhotos = pgTable(
  'trip_photos',
  {
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    photoId: uuid('photo_id')
      .notNull()
      .references(() => photos.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.tripId, table.photoId] })],
);

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    body: text('body').notNull().default(''),
    refKind: text('ref_kind'),
    refId: uuid('ref_id'),
    createdAt,
  },
  (table) => [index('chat_messages_created_idx').on(table.createdAt, table.id)],
);

export const communityGear = pgTable(
  'community_gear',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    category: text('category'),
    addedBy: text('added_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt,
  },
);

export const communityGearHolds = pgTable(
  'community_gear_holds',
  {
    gearId: uuid('gear_id')
      .notNull()
      .references(() => communityGear.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    qty: integer('qty').notNull(),
  },
  (table) => [primaryKey({ columns: [table.gearId, table.userId] })],
);

export const peaks = pgTable(
  'peaks',
  {
    slug: text('slug').primaryKey(),
    name: text('name').notNull(),
    list: text('list').notNull(),
    elevationFt: integer('elevation_ft').notNull(),
    point: geographyPoint('point').notNull(),
    info: text('info'),
  },
  (table) => [index('peaks_point_idx').using('gist', table.point)],
);

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
    summitedAt: timestamp('summited_at', { withTimezone: true }),
    trackId: uuid('track_id').references(() => tracks.id, { onDelete: 'set null' }),
    photoId: uuid('photo_id').references(() => photos.id, { onDelete: 'set null' }),
    verified: boolean('verified').notNull().default(false),
    createdAt,
  },
  (table) => [
    index('summits_user_peak_idx').on(table.userId, table.peakSlug),
  ],
);

