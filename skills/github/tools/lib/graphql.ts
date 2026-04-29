import { run } from "./command.js";

export type PageInfo = { hasNextPage: boolean; endCursor: string | null };
export type Connection<T> = { totalCount: number; pageInfo: PageInfo; nodes: T[] };

export type GraphQLResponse<T> = {
  data?: T | null;
  errors?: unknown[];
};

export function ghGraphQL<T>(variables: Record<string, string | number>, query: string): GraphQLResponse<T> {
  const args = ["api", "graphql"];
  for (const [key, value] of Object.entries(variables)) args.push("-F", `${key}=${value}`);
  args.push("-f", `query=${query}`);

  const raw = run("gh", args);
  let response: GraphQLResponse<T>;
  try {
    response = JSON.parse(raw) as GraphQLResponse<T>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`GitHub GraphQL response was not valid JSON: ${message}\n${raw.slice(0, 1000)}`);
  }

  if (response.errors?.length) throw new Error(`GitHub GraphQL returned errors:\n${JSON.stringify(response.errors, null, 2)}`);
  return response;
}

export type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

export function hasConnectionShape(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const pageInfo = value.pageInfo;
  return typeof value.totalCount === "number"
    && Array.isArray(value.nodes)
    && isRecord(pageInfo)
    && typeof pageInfo.hasNextPage === "boolean";
}
