import { ghGraphQL, hasConnectionShape, isRecord, type Connection } from "./graphql.js";

export type Maybe<T> = T | null | undefined;
export type User = { login: string };

export type IssueComment = {
  id: string;
  databaseId: number | null;
  author: User | null;
  body: string | null;
  createdAt: string;
  updatedAt: string;
  url: string;
};

export type ReviewComment = {
  id: string;
  databaseId: number | null;
  author: User | null;
  body: string | null;
  createdAt: string;
  updatedAt: string;
  path: string | null;
  line: number | null;
  originalLine: number | null;
  startLine: number | null;
  originalStartLine: number | null;
  diffHunk: string | null;
  url: string;
  replyTo: { id: string; databaseId: number | null; url: string } | null;
};

export type PullRequestReview = {
  id: string;
  databaseId: number | null;
  state: string;
  body: string | null;
  author: User | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  url: string;
  commit: { oid: string } | null;
  comments: Connection<ReviewComment>;
};

export type ThreadComment = ReviewComment & {
  pullRequestReview: Pick<PullRequestReview, "id" | "databaseId" | "state" | "body" | "author" | "submittedAt" | "url"> | null;
};

export type ReviewThread = {
  id: string;
  isResolved: boolean;
  isOutdated: boolean;
  isCollapsed: boolean;
  path: string | null;
  line: number | null;
  startLine: number | null;
  originalLine: number | null;
  originalStartLine: number | null;
  diffSide: string | null;
  startDiffSide: string | null;
  subjectType: string | null;
  resolvedBy: User | null;
  comments: Connection<ThreadComment>;
};

export type PullRequest = {
  number: number;
  title: string;
  url: string;
  state: string;
  author: User | null;
  comments: Connection<IssueComment>;
  reviews: Connection<PullRequestReview>;
  reviewThreads: Connection<ReviewThread>;
};

export type PullRequestReviewData = {
  repository?: { pullRequest?: PullRequest | null } | null;
};

export type FlatComment = {
  kind: "pr-comment" | "review" | "review-comment" | "review-thread-comment";
  id: string;
  databaseId: number | null;
  author: string;
  body: string;
  bodyPreview: string;
  url: string;
  createdAt?: string | null;
  submittedAt?: string | null;
  path?: string | null;
  line?: number | null;
  originalLine?: number | null;
  startLine?: number | null;
  originalStartLine?: number | null;
  isReply?: boolean;
  replyToDatabaseId?: number | null;
  replyToId?: string | null;
  reviewDatabaseId?: number | null;
  reviewState?: string | null;
  threadId?: string | null;
  threadResolved?: boolean;
  threadOutdated?: boolean;
};

export type ReviewCounts = {
  generalPrComments: number;
  reviews: number;
  reviewCommentsViaReviews: number;
  reviewThreads: number;
  threadCommentsAndReplies: number;
  replies: number;
  flattenedSearchItems: number;
};

export const REVIEW_COMMENTS_QUERY = /* GraphQL */ `
query($owner:String!, $repo:String!, $number:Int!) {
  repository(owner:$owner, name:$repo) {
    pullRequest(number:$number) {
      number
      title
      url
      state
      author { login }
      comments(first:100) {
        totalCount
        pageInfo { hasNextPage endCursor }
        nodes { id databaseId author { login } body createdAt updatedAt url }
      }
      reviews(first:100) {
        totalCount
        pageInfo { hasNextPage endCursor }
        nodes {
          id databaseId state body author { login } submittedAt createdAt updatedAt url commit { oid }
          comments(first:100) {
            totalCount
            pageInfo { hasNextPage endCursor }
            nodes {
              id databaseId author { login } body createdAt updatedAt
              path line originalLine startLine originalStartLine diffHunk url
              replyTo { id databaseId url }
            }
          }
        }
      }
      reviewThreads(first:100) {
        totalCount
        pageInfo { hasNextPage endCursor }
        nodes {
          id isResolved isOutdated isCollapsed path line startLine originalLine originalStartLine
          diffSide startDiffSide subjectType resolvedBy { login }
          comments(first:100) {
            totalCount
            pageInfo { hasNextPage endCursor }
            nodes {
              id databaseId author { login } body createdAt updatedAt
              path line originalLine startLine originalStartLine diffHunk url
              replyTo { id databaseId url }
              pullRequestReview { id databaseId state body author { login } submittedAt url }
            }
          }
        }
      }
    }
  }
}
`;

export function fetchPullRequestReviewData(owner: string, repo: string, prNumber: number): PullRequest {
  const response = ghGraphQL<PullRequestReviewData>({ owner, repo, number: prNumber }, REVIEW_COMMENTS_QUERY);
  const pr = response.data?.repository?.pullRequest;
  if (!pr) throw new Error(`GraphQL response did not include pullRequest:\n${JSON.stringify(response, null, 2)}`);
  assertPullRequestShape(pr);
  return pr;
}

export function assertPullRequestShape(value: unknown): asserts value is PullRequest {
  if (!isRecord(value)
    || typeof value.number !== "number"
    || typeof value.title !== "string"
    || typeof value.url !== "string"
    || !hasConnectionShape(value.comments)
    || !hasConnectionShape(value.reviews)
    || !hasConnectionShape(value.reviewThreads)) {
    throw new Error("GraphQL response pullRequest is missing expected review/comment connections");
  }
}

export function login(node: Maybe<{ author?: Maybe<User> }>): string {
  return node?.author?.login ?? "unknown";
}

export function bodyPreview(body: Maybe<string>): string {
  const firstLine = (body ?? "").split(/\r?\n/).find((line) => line.trim().length > 0)?.trim() ?? "";
  return firstLine.length > 180 ? `${firstLine.slice(0, 177)}...` : firstLine;
}

export function paginationGaps(pr: PullRequest): string[] {
  const gaps: string[] = [];
  if (pr.comments.pageInfo.hasNextPage) gaps.push("pullRequest.comments (general PR conversation comments) > 100");
  if (pr.reviews.pageInfo.hasNextPage) gaps.push("pullRequest.reviews > 100");
  if (pr.reviewThreads.pageInfo.hasNextPage) gaps.push("pullRequest.reviewThreads > 100");
  pr.reviews.nodes.forEach((review, index) => {
    if (review.comments.pageInfo.hasNextPage) gaps.push(`review ${review.databaseId ?? review.id ?? index + 1} comments > 100`);
  });
  pr.reviewThreads.nodes.forEach((thread, index) => {
    if (thread.comments.pageInfo.hasNextPage) gaps.push(`review thread ${thread.id ?? index + 1} comments/replies > 100`);
  });
  return gaps;
}

export function flattenComments(pr: PullRequest): FlatComment[] {
  const flat = new Map<string, FlatComment>();

  for (const comment of pr.comments.nodes) {
    flat.set(comment.id, {
      kind: "pr-comment",
      id: comment.id,
      databaseId: comment.databaseId,
      author: login(comment),
      body: comment.body ?? "",
      bodyPreview: bodyPreview(comment.body),
      url: comment.url,
      createdAt: comment.createdAt,
    });
  }

  for (const review of pr.reviews.nodes) {
    flat.set(review.id, {
      kind: "review",
      id: review.id,
      databaseId: review.databaseId,
      author: login(review),
      body: review.body ?? "",
      bodyPreview: bodyPreview(review.body),
      url: review.url,
      createdAt: review.createdAt,
      submittedAt: review.submittedAt,
      reviewDatabaseId: review.databaseId,
      reviewState: review.state,
    });

    for (const comment of review.comments.nodes) {
      flat.set(comment.id, {
        kind: "review-comment",
        id: comment.id,
        databaseId: comment.databaseId,
        author: login(comment),
        body: comment.body ?? "",
        bodyPreview: bodyPreview(comment.body),
        url: comment.url,
        createdAt: comment.createdAt,
        path: comment.path,
        line: comment.line,
        originalLine: comment.originalLine,
        startLine: comment.startLine,
        originalStartLine: comment.originalStartLine,
        isReply: Boolean(comment.replyTo),
        replyToDatabaseId: comment.replyTo?.databaseId ?? null,
        replyToId: comment.replyTo?.id ?? null,
        reviewDatabaseId: review.databaseId,
        reviewState: review.state,
      });
    }
  }

  for (const thread of pr.reviewThreads.nodes) {
    for (const comment of thread.comments.nodes) {
      flat.set(comment.id, {
        kind: "review-thread-comment",
        id: comment.id,
        databaseId: comment.databaseId,
        author: login(comment),
        body: comment.body ?? "",
        bodyPreview: bodyPreview(comment.body),
        url: comment.url,
        createdAt: comment.createdAt,
        path: comment.path ?? thread.path,
        line: comment.line ?? thread.line,
        originalLine: comment.originalLine ?? thread.originalLine,
        startLine: comment.startLine ?? thread.startLine,
        originalStartLine: comment.originalStartLine ?? thread.originalStartLine,
        isReply: Boolean(comment.replyTo),
        replyToDatabaseId: comment.replyTo?.databaseId ?? null,
        replyToId: comment.replyTo?.id ?? null,
        reviewDatabaseId: comment.pullRequestReview?.databaseId ?? null,
        reviewState: comment.pullRequestReview?.state ?? null,
        threadId: thread.id,
        threadResolved: thread.isResolved,
        threadOutdated: thread.isOutdated,
      });
    }
  }

  return [...flat.values()];
}

export function countReviewComments(pr: PullRequest): number {
  return pr.reviews.nodes.reduce((sum, review) => sum + review.comments.totalCount, 0);
}

export function countThreadComments(pr: PullRequest): number {
  return pr.reviewThreads.nodes.reduce((sum, thread) => sum + thread.comments.totalCount, 0);
}

export function countReplies(pr: PullRequest): number {
  return pr.reviewThreads.nodes.reduce((sum, thread) => sum + thread.comments.nodes.filter((comment) => comment.replyTo).length, 0);
}

export function reviewCounts(pr: PullRequest, flatComments: FlatComment[]): ReviewCounts {
  return {
    generalPrComments: pr.comments.totalCount,
    reviews: pr.reviews.totalCount,
    reviewCommentsViaReviews: countReviewComments(pr),
    reviewThreads: pr.reviewThreads.totalCount,
    threadCommentsAndReplies: countThreadComments(pr),
    replies: countReplies(pr),
    flattenedSearchItems: flatComments.length,
  };
}
