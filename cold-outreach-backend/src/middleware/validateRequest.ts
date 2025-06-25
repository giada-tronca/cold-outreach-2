import { Request, Response, NextFunction } from 'express';
import { Schema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

export const validateRequest = (schema: Schema) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await schema.parseAsync(req.body);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const errors = error.errors.map(err => err.message);
                next(new ValidationError('Invalid request data', errors));
            } else {
                next(new ValidationError('Invalid request data', ['Validation failed']));
            }
        }
    };
}; 