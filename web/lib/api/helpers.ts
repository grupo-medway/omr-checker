type AuthParams = {
  user: string;
  token?: string | null;
};

export function buildAuditHeaders({ user, token }: AuthParams) {
  const headers: Record<string, string> = {
    "X-Audit-User": user,
  };

  if (token) {
    headers["X-Audit-Token"] = token;
  }

  return headers;
}
