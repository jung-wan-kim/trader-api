const errorHandler = require('../../src/middleware/errorHandler');

describe('Error Handler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  it('should handle 400 validation error', () => {
    const error = new Error('Validation failed');
    error.status = 400;

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation failed',
      details: undefined
    });
  });

  it('should handle 401 unauthorized error', () => {
    const error = new Error('Unauthorized');
    error.status = 401;

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Unauthorized',
      details: undefined
    });
  });

  it('should handle 404 not found error', () => {
    const error = new Error('Not Found');
    error.status = 404;

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Not Found',
      details: undefined
    });
  });

  it('should handle 500 server error', () => {
    const error = new Error('Something went wrong');
    // No status means 500

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Internal server error',
      details: undefined
    });
  });

  it('should include details if provided', () => {
    const error = new Error('Bad Request');
    error.status = 400;
    error.details = { field: 'email', message: 'Invalid format' };

    errorHandler(error, req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      error: 'Bad Request',
      details: { field: 'email', message: 'Invalid format' }
    });
  });

  it('should include stack trace in development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const error = new Error('Dev Error');
    error.stack = 'Error: Dev Error\n    at test.js:10:5';

    errorHandler(error, req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      error: 'Internal server error',
      details: undefined,
      stack: error.stack
    });

    process.env.NODE_ENV = originalEnv;
  });

  it('should handle error without message', () => {
    const error = new Error();
    error.status = 403;

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Forbidden',
      details: undefined
    });
  });

  it('should handle non-Error objects', () => {
    const error = { message: 'Custom error', code: 'CUSTOM_ERROR' };

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Internal server error',
      details: undefined
    });
  });
});