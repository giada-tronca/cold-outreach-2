"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = void 0;
const zod_1 = require("zod");
const errors_1 = require("../utils/errors");
const validateRequest = (schema) => {
    return async (req, res, next) => {
        try {
            await schema.parseAsync(req.body);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const errors = error.errors.map(err => err.message);
                next(new errors_1.ValidationError('Invalid request data', errors));
            }
            else {
                next(new errors_1.ValidationError('Invalid request data', ['Validation failed']));
            }
        }
    };
};
exports.validateRequest = validateRequest;
