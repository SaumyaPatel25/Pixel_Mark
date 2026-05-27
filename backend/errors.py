from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from logger import logger
import traceback

class AppError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400):
        self.code = code
        self.message = message
        self.status_code = status_code

# Internal helper to ensure CORS headers are present on error responses
def get_error_headers(request: Request):
    origin = request.headers.get("origin")
    return {
        "Access-Control-Allow-Origin": origin if origin else "*",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*"
    }

async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.status_code,
        headers=get_error_headers(request),
        content={"error": exc.code, "message": exc.message}
    )

async def validation_error_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        loc = " -> ".join([str(l) for l in err["loc"] if l != "body"])
        errors.append({"field": loc or "payload", "issue": err["msg"]})
    
    return JSONResponse(
        status_code=422,
        headers=get_error_headers(request),
        content={
            "error": "VALIDATION_FAILED",
            "message": "The provided data is invalid.",
            "fields": errors
        }
    )

async def unhandled_exception_handler(request: Request, exc: Exception):
    # Log the full traceback internally for debugging
    logger.error(f"Unhandled Exception: {str(exc)}\n{traceback.format_exc()}")
    
    # Return a generic error to the client with explicit CORS headers
    return JSONResponse(
        status_code=500,
        headers=get_error_headers(request),
        content={
            "error": "INTERNAL_ERROR",
            "message": "An unexpected server error occurred."
        }
    )
