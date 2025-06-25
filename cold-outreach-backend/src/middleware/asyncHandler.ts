import { Request, Response, NextFunction } from 'express';

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

/**
 * Wraps an async request handler to catch any errors and pass them to the error handling middleware
 * @param fn The async request handler function to wrap
 * @returns A wrapped request handler that catches errors
 */
export const asyncHandler = (fn: AsyncRequestHandler) => (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler; 