const asyncHandler = (requestHandler) => async (req, res, next) => {
    try {
        await requestHandler(req, res, next);
    } catch (error) {
        const status = error?.statusCode || 500;
        const message = error?.message || "Internal Server Error";
        const errors = error?.errors || null;
        const data = error?.data || null;

        return res.status(status).json({
            success: false,
            message,
            errors,
            data,
        });
    }
};

export { asyncHandler };