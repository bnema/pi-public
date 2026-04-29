import { fencedOrFallback, fenceFor } from "./markdown-common.js";
import { countReplies, countReviewComments, countThreadComments, login, type PullRequest } from "./review-comments.js";

function quotedBody(body: string | null | undefined, fallback = "_(empty)_"): string[] {
  return fencedOrFallback(body, "markdown", fallback);
}

export function renderReviewCommentsMarkdown(ownerRepo: string, pr: PullRequest, gaps: string[]): string {
  const out: string[] = [];
  out.push(`# PR review comments: ${ownerRepo}#${pr.number}`, "");
  out.push(`- Title: ${pr.title}`);
  out.push(`- URL: ${pr.url}`);
  out.push(`- State: ${pr.state}`);
  out.push(`- Author: ${pr.author?.login ?? "unknown"}`);
  out.push(`- General PR conversation comments: ${pr.comments.totalCount}`);
  out.push(`- Reviews: ${pr.reviews.totalCount}`);
  out.push(`- Review comments via reviews.comments: ${countReviewComments(pr)}`);
  out.push(`- Review threads: ${pr.reviewThreads.totalCount}`);
  out.push(`- Thread comments/replies via reviewThreads.comments: ${countThreadComments(pr)} (${countReplies(pr)} replies)`);
  out.push(`- Completeness: ${gaps.length > 0 ? "PARTIAL - pagination required" : "complete in one GraphQL response"}`);

  if (gaps.length > 0) out.push("", "## Pagination gaps", ...gaps.map((gap) => `- ${gap}`));

  out.push("", "## General PR conversation comments");
  if (pr.comments.nodes.length === 0) out.push("No general PR comments.");
  for (const comment of pr.comments.nodes) {
    out.push("", `### Issue comment ${comment.databaseId ?? comment.id} by ${login(comment)} at ${comment.createdAt}`);
    out.push(`URL: ${comment.url}`, "", ...quotedBody(comment.body));
  }

  out.push("", "## Reviews (summary/body + inline counts)");
  if (pr.reviews.nodes.length === 0) out.push("No reviews.");
  for (const review of pr.reviews.nodes) {
    out.push("", `### Review ${review.databaseId ?? review.id} — ${review.state} by ${login(review)} at ${review.submittedAt ?? review.createdAt}`);
    out.push(`URL: ${review.url}`);
    if (review.commit) out.push(`Commit: \`${review.commit.oid}\``);
    out.push(`Inline comments in this review: ${review.comments.totalCount}`, "", ...quotedBody(review.body, "_(empty review body)_"));
  }

  out.push("", "## Review threads (canonical inline comments and replies)");
  if (pr.reviewThreads.nodes.length === 0) out.push("No review threads.");
  pr.reviewThreads.nodes.forEach((thread, index) => {
    const location = [thread.path ?? "unknown path"];
    if (thread.line !== null) location.push(`line ${thread.line}`);
    else if (thread.originalLine !== null) location.push(`original line ${thread.originalLine}`);

    out.push("", `### Thread ${index + 1}: ${location.join(" ")}`);
    out.push(`- Thread ID: \`${thread.id}\``);
    out.push(`- Resolved: ${thread.isResolved} | Outdated: ${thread.isOutdated} | Collapsed: ${thread.isCollapsed}`);
    if (thread.resolvedBy) out.push(`- Resolved by: ${thread.resolvedBy.login}`);
    out.push(`- Comments/replies in thread: ${thread.comments.totalCount}`);

    for (const comment of thread.comments.nodes) {
      const review = comment.pullRequestReview;
      out.push("", `#### ${comment.replyTo ? "Reply" : "Comment"} ${comment.databaseId ?? comment.id} by ${login(comment)} at ${comment.createdAt}`);
      out.push(`URL: ${comment.url}`);
      if (comment.replyTo) out.push(`In reply to: \`${comment.replyTo.databaseId ?? comment.replyTo.id}\``);
      if (review) out.push(`Review: ${review.databaseId ?? review.id} (${review.state}) by ${login(review)}`);
      if (comment.diffHunk) out.push("", ...fenceFor(comment.diffHunk, "diff"));
      out.push("", ...quotedBody(comment.body));
    }
  });

  out.push("");
  return out.join("\n");
}
