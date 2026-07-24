import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, date, index } from "drizzle-orm/pg-core";

export const healthCheck = pgTable("health_check", {
  id: require("drizzle-orm/pg-core").serial().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const submissions = pgTable(
  "submissions",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    area: text("area").notNull(),
    store_name: text("store_name").notNull(),
    store_type: text("store_type"),
    review_tags: text("review_tags"),
    remark: text("remark"),
    status: text("status").notNull().default("pending"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("submissions_area_idx").on(table.area),
    index("submissions_status_idx").on(table.status),
    index("submissions_store_type_idx").on(table.store_type),
    index("submissions_review_tags_idx").on(table.review_tags),
    index("submissions_created_at_idx").on(table.created_at),
  ]
);

export const images = pgTable(
  "images",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    submission_id: varchar("submission_id", { length: 36 }).notNull().references(() => submissions.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    image_url: text("image_url").notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("images_submission_id_idx").on(table.submission_id),
    index("images_category_idx").on(table.category),
  ]
);

export const reviewItems = pgTable(
  "review_items",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    submission_id: varchar("submission_id", { length: 36 }).notNull().references(() => submissions.id, { onDelete: "cascade" }),
    image_id: varchar("image_id", { length: 36 }).notNull().references(() => images.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    review_status: text("review_status").notNull().default("pending"),
    review_note: text("review_note"),
    review_tags: text("review_tags").array(),
    priority: text("priority").notNull().default("urgent"),
    reviewed_at: timestamp("reviewed_at", { withTimezone: true }),
  },
  (table) => [
    index("review_items_submission_id_idx").on(table.submission_id),
    index("review_items_image_id_idx").on(table.image_id),
    index("review_items_review_status_idx").on(table.review_status),
    index("review_items_category_idx").on(table.category),
  ]
);

export const designTasks = pgTable(
  "design_tasks",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    review_item_id: varchar("review_item_id", { length: 36 }).notNull().references(() => reviewItems.id, { onDelete: "cascade" }),
    design_status: text("design_status").notNull().default("pending"),
    design_url: text("design_url"),
    designer_note: text("designer_note"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("design_tasks_review_item_id_idx").on(table.review_item_id),
    index("design_tasks_design_status_idx").on(table.design_status),
  ]
);

export const installationTasks = pgTable(
  "installation_tasks",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    design_task_id: varchar("design_task_id", { length: 36 }).notNull().references(() => designTasks.id, { onDelete: "cascade" }),
    install_status: text("install_status").notNull().default("pending"),
    company_name: text("company_name"),
    dispatch_date: date("dispatch_date"),
    install_date: date("install_date"),
    return_photo_url: text("return_photo_url"),
    return_note: text("return_note"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("installation_tasks_design_task_id_idx").on(table.design_task_id),
    index("installation_tasks_install_status_idx").on(table.install_status),
  ]
);
