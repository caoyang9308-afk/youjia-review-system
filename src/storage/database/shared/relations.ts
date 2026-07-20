import { relations } from "drizzle-orm/relations";
import { submissions, images, reviewItems, designTasks, installationTasks } from "./schema";

export const imagesRelations = relations(images, ({one, many}) => ({
	submission: one(submissions, {
		fields: [images.submission_id],
		references: [submissions.id]
	}),
	reviewItems: many(reviewItems),
}));

export const submissionsRelations = relations(submissions, ({many}) => ({
	images: many(images),
	reviewItems: many(reviewItems),
}));

export const reviewItemsRelations = relations(reviewItems, ({one, many}) => ({
	submission: one(submissions, {
		fields: [reviewItems.submission_id],
		references: [submissions.id]
	}),
	image: one(images, {
		fields: [reviewItems.image_id],
		references: [images.id]
	}),
	designTasks: many(designTasks),
}));

export const designTasksRelations = relations(designTasks, ({one, many}) => ({
	reviewItem: one(reviewItems, {
		fields: [designTasks.review_item_id],
		references: [reviewItems.id]
	}),
	installationTasks: many(installationTasks),
}));

export const installationTasksRelations = relations(installationTasks, ({one}) => ({
	designTask: one(designTasks, {
		fields: [installationTasks.design_task_id],
		references: [designTasks.id]
	}),
}));
