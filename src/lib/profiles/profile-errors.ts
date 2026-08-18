export class ProfileRevisionConflictError extends Error {
  override readonly name = "ProfileRevisionConflictError";
}

export class ProfileIdentityConflictError extends Error {
  override readonly name = "ProfileIdentityConflictError";
}

export class ProfileWriteConflictError extends Error {
  override readonly name = "ProfileWriteConflictError";
}

export class ProfilePersistenceDataError extends Error {
  override readonly name = "ProfilePersistenceDataError";
}
