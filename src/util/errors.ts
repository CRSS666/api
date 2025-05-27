import { ZodIssue } from 'zod';

export class ValidationError extends Error {
  public issues: ZodIssue[];

  constructor(issues: ZodIssue[]) {
    super('Body Validation Failed');

    this.name = 'ValidationError';
    this.issues = issues;
  }
}

export class InvalidToken extends Error {
  constructor() {
    super('Invalid Token');
  }
}
