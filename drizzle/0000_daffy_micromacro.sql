CREATE EXTENSION IF NOT EXISTS postgis;
--> statement-breakpoint
CREATE TYPE "public"."activity" AS ENUM('hike', 'walk', 'run', 'trail_run', 'bike', 'ski', 'snowboard');--> statement-breakpoint
CREATE TYPE "public"."condition_category" AS ENUM('ice', 'mud', 'snow', 'blowdown', 'water', 'closure', 'other');--> statement-breakpoint
CREATE TYPE "public"."peak_list" AS ENUM('adk46', 'nh48');--> statement-breakpoint
CREATE TYPE "public"."pin_kind" AS ENUM('summit', 'trailhead', 'camp', 'water', 'view', 'hazard', 'put_in', 'crag', 'other');--> statement-breakpoint
CREATE TYPE "public"."point_source" AS ENUM('exif', 'manual');--> statement-breakpoint
CREATE TYPE "public"."rsvp" AS ENUM('going', 'maybe', 'no');--> statement-breakpoint
CREATE TYPE "public"."track_source" AS ENUM('strava', 'gpx');--> statement-breakpoint
CREATE TYPE "public"."trip_member_role" AS ENUM('organizer', 'member');--> statement-breakpoint
CREATE TYPE "public"."trip_status" AS ENUM('planned', 'done', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('member', 'admin');--> statement-breakpoint
CREATE TABLE "albums" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid,
	"title" text NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"activity" "activity",
	CONSTRAINT "badges_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "carpool_riders" (
	"carpool_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "carpool_riders_carpool_id_user_id_pk" PRIMARY KEY("carpool_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "carpools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"driver_id" text,
	"seats" integer DEFAULT 3 NOT NULL,
	"depart_from" text,
	"depart_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "condition_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"point" geography(Point,4326) NOT NULL,
	"peak_slug" text,
	"category" "condition_category" NOT NULL,
	"body" text NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"photo_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gear_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"category" text,
	"weight_g" integer,
	"is_consumable" boolean DEFAULT false NOT NULL,
	"is_worn" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guides" (
	"slug" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"email" text,
	"invited_by" text,
	"expires_at" timestamp with time zone NOT NULL,
	"used_by" text,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invites_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "packing_list_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"gear_item_id" uuid,
	"label" text NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"weight_g" integer,
	"assigned_to" text,
	"packed" boolean DEFAULT false NOT NULL,
	"shared" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packing_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packing_template_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"gear_item_id" uuid,
	"label" text NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packing_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text,
	"name" text NOT NULL,
	"activity" "activity",
	"season" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "peaks" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"list" "peak_list" NOT NULL,
	"elevation_ft" integer NOT NULL,
	"point" geography(Point,4326) NOT NULL,
	"info" text
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"album_id" uuid,
	"trip_report_id" uuid,
	"user_id" text,
	"blob_url" text NOT NULL,
	"width" integer,
	"height" integer,
	"taken_at" timestamp with time zone,
	"point" geography(Point,4326),
	"point_source" "point_source",
	"caption" text,
	"alt" text,
	"pin_id" uuid,
	"legacy_sanity_asset_id" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "pin_kind" DEFAULT 'other' NOT NULL,
	"activity" "activity",
	"point" geography(Point,4326) NOT NULL,
	"title" text NOT NULL,
	"note" text,
	"trip_id" uuid,
	"trip_report_id" uuid,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strava_accounts" (
	"user_id" text PRIMARY KEY NOT NULL,
	"athlete_id" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_synced_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "summits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"peak_slug" text NOT NULL,
	"summited_at" timestamp with time zone NOT NULL,
	"track_id" uuid,
	"photo_id" uuid,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"trip_id" uuid,
	"source" "track_source" NOT NULL,
	"external_id" text,
	"name" text NOT NULL,
	"activity" "activity" NOT NULL,
	"line" geography(LineString,4326) NOT NULL,
	"distance_m" integer,
	"elev_gain_m" integer,
	"moving_s" integer,
	"started_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_members" (
	"trip_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"rsvp" "rsvp" DEFAULT 'maybe' NOT NULL,
	"role" "trip_member_role" DEFAULT 'member' NOT NULL,
	CONSTRAINT "trip_members_trip_id_user_id_pk" PRIMARY KEY("trip_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "trip_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid,
	"author_id" text,
	"legacy_author_name" text,
	"legacy_author_email" text,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"trip_date" date,
	"point" geography(Point,4326),
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"legacy_sanity_id" text,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"activity" "activity" NOT NULL,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"trailhead_point" geography(Point,4326),
	"trailhead_name" text,
	"route_plan" text,
	"status" "trip_status" DEFAULT 'planned' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trips_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"user_id" text NOT NULL,
	"badge_id" uuid NOT NULL,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_badges_user_id_badge_id_pk" PRIMARY KEY("user_id","badge_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"handle" text,
	"display_name" text,
	"avatar_url" text,
	"home_region" text,
	"bio" text,
	"role" "user_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
ALTER TABLE "albums" ADD CONSTRAINT "albums_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "albums" ADD CONSTRAINT "albums_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carpool_riders" ADD CONSTRAINT "carpool_riders_carpool_id_carpools_id_fk" FOREIGN KEY ("carpool_id") REFERENCES "public"."carpools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carpool_riders" ADD CONSTRAINT "carpool_riders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carpools" ADD CONSTRAINT "carpools_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carpools" ADD CONSTRAINT "carpools_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condition_reports" ADD CONSTRAINT "condition_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condition_reports" ADD CONSTRAINT "condition_reports_photo_id_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gear_items" ADD CONSTRAINT "gear_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guides" ADD CONSTRAINT "guides_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_used_by_users_id_fk" FOREIGN KEY ("used_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packing_list_items" ADD CONSTRAINT "packing_list_items_list_id_packing_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."packing_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packing_list_items" ADD CONSTRAINT "packing_list_items_gear_item_id_gear_items_id_fk" FOREIGN KEY ("gear_item_id") REFERENCES "public"."gear_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packing_list_items" ADD CONSTRAINT "packing_list_items_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packing_lists" ADD CONSTRAINT "packing_lists_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packing_template_items" ADD CONSTRAINT "packing_template_items_template_id_packing_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."packing_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packing_template_items" ADD CONSTRAINT "packing_template_items_gear_item_id_gear_items_id_fk" FOREIGN KEY ("gear_item_id") REFERENCES "public"."gear_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packing_templates" ADD CONSTRAINT "packing_templates_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_album_id_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_trip_report_id_trip_reports_id_fk" FOREIGN KEY ("trip_report_id") REFERENCES "public"."trip_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_pin_id_pins_id_fk" FOREIGN KEY ("pin_id") REFERENCES "public"."pins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pins" ADD CONSTRAINT "pins_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pins" ADD CONSTRAINT "pins_trip_report_id_trip_reports_id_fk" FOREIGN KEY ("trip_report_id") REFERENCES "public"."trip_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pins" ADD CONSTRAINT "pins_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strava_accounts" ADD CONSTRAINT "strava_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "summits" ADD CONSTRAINT "summits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "summits" ADD CONSTRAINT "summits_peak_slug_peaks_slug_fk" FOREIGN KEY ("peak_slug") REFERENCES "public"."peaks"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "summits" ADD CONSTRAINT "summits_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "summits" ADD CONSTRAINT "summits_photo_id_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_members" ADD CONSTRAINT "trip_members_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_members" ADD CONSTRAINT "trip_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_reports" ADD CONSTRAINT "trip_reports_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_reports" ADD CONSTRAINT "trip_reports_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "albums_trip_idx" ON "albums" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "carpool_riders_carpool_idx" ON "carpool_riders" USING btree ("carpool_id");--> statement-breakpoint
CREATE INDEX "carpools_trip_idx" ON "carpools" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "condition_reports_point_idx" ON "condition_reports" USING gist ("point");--> statement-breakpoint
CREATE INDEX "condition_reports_expires_idx" ON "condition_reports" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "packing_list_items_list_idx" ON "packing_list_items" USING btree ("list_id");--> statement-breakpoint
CREATE INDEX "packing_lists_trip_idx" ON "packing_lists" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "packing_template_items_template_idx" ON "packing_template_items" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "peaks_point_idx" ON "peaks" USING gist ("point");--> statement-breakpoint
CREATE INDEX "photos_point_idx" ON "photos" USING gist ("point");--> statement-breakpoint
CREATE INDEX "photos_album_idx" ON "photos" USING btree ("album_id");--> statement-breakpoint
CREATE INDEX "photos_trip_report_idx" ON "photos" USING btree ("trip_report_id");--> statement-breakpoint
CREATE UNIQUE INDEX "photos_report_asset_unique" ON "photos" USING btree ("trip_report_id","legacy_sanity_asset_id");--> statement-breakpoint
CREATE INDEX "pins_point_idx" ON "pins" USING gist ("point");--> statement-breakpoint
CREATE INDEX "pins_trip_idx" ON "pins" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "pins_trip_report_idx" ON "pins" USING btree ("trip_report_id");--> statement-breakpoint
CREATE INDEX "summits_user_peak_idx" ON "summits" USING btree ("user_id","peak_slug");--> statement-breakpoint
CREATE INDEX "tracks_line_idx" ON "tracks" USING gist ("line");--> statement-breakpoint
CREATE INDEX "tracks_trip_idx" ON "tracks" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "tracks_user_idx" ON "tracks" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tracks_source_external_unique" ON "tracks" USING btree ("source","external_id");--> statement-breakpoint
CREATE INDEX "trip_members_trip_idx" ON "trip_members" USING btree ("trip_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trip_reports_legacy_sanity_id_unique" ON "trip_reports" USING btree ("legacy_sanity_id");--> statement-breakpoint
CREATE INDEX "trip_reports_point_idx" ON "trip_reports" USING gist ("point");--> statement-breakpoint
CREATE INDEX "trip_reports_trip_idx" ON "trip_reports" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "trip_reports_published_idx" ON "trip_reports" USING btree ("published");--> statement-breakpoint
CREATE INDEX "trips_trailhead_point_idx" ON "trips" USING gist ("trailhead_point");--> statement-breakpoint
CREATE INDEX "trips_created_by_idx" ON "trips" USING btree ("created_by");