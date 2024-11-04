import { AppBskyFeedDefs, AppBskyFeedPost } from "@atproto/api";
import { z } from "astro/zod";

export interface PostView extends AppBskyFeedDefs.PostView {
  // `PostView` currently types `record` as `unknown` as a way to encourage
  // clients to validate this themselves, we'll be checking for this.
  record: AppBskyFeedPost.Record;
}

export const PostViewSchema = z
  .unknown()
  .superRefine((view: any, ctx): view is PostView => {
    const viewResult = AppBskyFeedDefs.validatePostView(view);
    if (!viewResult.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Error validating view: ${viewResult.error.message}`,
      });

      return z.NEVER;
    }

    const recordResult = AppBskyFeedPost.validateRecord(view.record);
    if (!recordResult.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Error validating record: ${recordResult.error.message}`,
      });
    }

    return z.NEVER;
  });
