// Centralized Error Handling Middleware
function errorHandler(err, req, res, next) {
    console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);

    let statusCode = err.statusCode || 500;
    let message = err.message || 'An unexpected internal server error occurred.';

    // MySQL Specific error mapping for clean client feedback
    if (err.code === 'ER_DUP_ENTRY') {
        statusCode = 409;
        message = 'A record with this information already exists (Duplicate Entry).';
    } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        statusCode = 400;
        message = 'Invalid reference: referenced customer, employee, or product does not exist.';
    } else if (err.code === 'ER_ROW_IS_REFERENCED_2') {
        statusCode = 400;
        message = 'Cannot delete or update this record as it is referenced by existing orders.';
    } else if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
        statusCode = 400;
        message = 'Validation constraint violated (e.g., negative price, stock, or quantity).';
    }

    res.status(statusCode).json({
        success: false,
        error: message,
        code: err.code || 'APP_ERROR'
    });
}

module.exports = errorHandler;
