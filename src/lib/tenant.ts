import type { Session } from "next-auth";

export class AuthorizationError extends Error {
  statusCode = 403;
}

export function requireCollegeScope(session: Session): string {
  const collegeId = session.user?.collegeId;
  if (!collegeId) {
    throw new AuthorizationError("An active college is required for this resource.");
  }
  return collegeId;
}

export function assertCollegeScope(session: Session, requestedCollegeId: string): void {
  const sessionCollegeId = requireCollegeScope(session);
  if (sessionCollegeId !== requestedCollegeId) {
    throw new AuthorizationError("Cross-college access is not permitted.");
  }
}

export function canManageCollege(
  session: Session,
  collegeId: string,
): boolean {
  return (
    session.user?.role === "SUPER_ADMIN" ||
    (session.user?.role === "COLLEGE_ADMIN" && session.user.collegeId === collegeId)
  );
}
