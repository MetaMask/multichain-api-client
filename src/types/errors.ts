export class MultichainApiError extends Error {
  constructor(error: { message?: string; code?: number; stack?: string }) {
    super(error.message);
    this.name = this.constructor.name;
    this.cause = error;
    Object.setPrototypeOf(this, this.constructor.prototype);
  }
}

export class TransportError extends Error {
  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.cause = originalError;
    Object.setPrototypeOf(this, this.constructor.prototype);
  }
}

export class TransportTimeoutError extends TransportError {
  constructor(message = 'Transport request timed out', originalError?: unknown) {
    super(message, originalError);
  }
}
