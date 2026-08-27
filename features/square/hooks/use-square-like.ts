"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setPostLike, type MarketSquareFeedPage } from "@/lib/api/market-square";

type FeedCache = { pages: MarketSquareFeedPage[]; pageParams: unknown[] };

/**
 * Like a post from the Ark dashboard.
 *
 * Optimistic, because a heart that waits for a round trip feels broken — this
 * is the one interaction in the square integration that has to be instant. It
 * is safe to be optimistic here precisely because a like is reversible and
 * costs nothing; the same latitude would be wrong for the tip flow, which
 * never shows a receipt it has not been handed.
 *
 * On failure the previous cache is restored, so a like that did not land does
 * not leave a filled heart lying about what the server holds.
 */
export function useSquareLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, liked }: { postId: string; liked: boolean }) =>
      setPostLike(postId, liked),

    onMutate: async ({ postId, liked }) => {
      // Stop an in-flight feed refetch from landing on top of the optimistic
      // edit and flipping the heart back under the user's finger.
      await queryClient.cancelQueries({ queryKey: ["market-square", "feed"] });
      const snapshot = queryClient.getQueriesData({ queryKey: ["market-square", "feed"] });

      queryClient.setQueriesData<FeedCache>({ queryKey: ["market-square", "feed"] }, (data) =>
        !data
          ? data
          : {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                items: page.items.map((item) =>
                  item.post?.id === postId && item.post
                    ? {
                        ...item,
                        post: {
                          ...item.post,
                          likedByMe: liked,
                          // Clamped: a count the server has not confirmed must
                          // never render as -1 because of a double tap.
                          likeCount: Math.max(0, item.post.likeCount + (liked ? 1 : -1)),
                        },
                      }
                    : item
                ),
              })),
            }
      );
      return { snapshot };
    },

    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.snapshot ?? []) {
        queryClient.setQueryData(key, data);
      }
    },

    // Deliberately no invalidate on success: refetching the whole feed would
    // reorder posts under someone who just tapped a heart, and the optimistic
    // edit already matches what the server returned.
  });
}
