import { AppError } from '../middleware/errorHandler';

//Validation error
export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, 'VALIDATION_ERROR', message);
  }
}

//Unauthorized error
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message);
  }
}

//notfound error
export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, 'NOT_FOUND', message);
  }
}

//external api error
export class ExternalAPIError extends AppError {
  constructor(message: string) {
    super(502, 'EXTERNAL_API_ERROR', message);
  }
}

//rate limiter error
export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(429, 'RATE_LIMIT_EXCEEDED', message);
  }
}
