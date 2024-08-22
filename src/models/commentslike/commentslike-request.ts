import z from "zod";

export const zodCommentslikeRequest = z.object({
    userName: z.string(),
    commentId: z.string(),
    isLike: z.boolean(),
})

export type CommentslikeRequest = z.infer<typeof zodCommentslikeRequest>