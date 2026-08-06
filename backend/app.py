from __future__ import annotations

import modal

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_IMAGE_DIMENSION = 4096
MAX_IMAGE_PIXELS = 16_777_216
ALLOWED_IMAGE_TYPES = frozenset({"image/jpeg", "image/png", "image/webp"})

app = modal.App("notion-iconiser-birefnet")
base_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install_from_requirements("backend/requirements.txt")
)


def download_model() -> None:
    """Bake the model and its remote code into the image to shorten cold starts."""
    from transformers import AutoModelForImageSegmentation

    AutoModelForImageSegmentation.from_pretrained(
        "ZhengPeng7/BiRefNet",
        trust_remote_code=True,
    )


runtime_image = (
    base_image
    .run_function(download_model)
    .add_local_file("backend/model.py", remote_path="/root/model.py")
)


@app.function(
    image=runtime_image,
    gpu="L4",
    timeout=300,
    scaledown_window=300,
    secrets=[modal.Secret.from_name("notion-iconiser-api")],
)
@modal.concurrent(max_inputs=4)
@modal.asgi_app()
def api():
    import os
    import secrets
    from contextlib import asynccontextmanager
    from io import BytesIO

    from fastapi import FastAPI, Header, HTTPException, UploadFile
    from fastapi.responses import Response
    from PIL import Image, UnidentifiedImageError

    from model import BiRefNetBackgroundRemover

    remover: BiRefNetBackgroundRemover | None = None

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        nonlocal remover
        remover = BiRefNetBackgroundRemover()
        yield
        remover = None

    web_app = FastAPI(title="Notion Iconiser BiRefNet API", lifespan=lifespan)

    @web_app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @web_app.post("/remove-background")
    async def remove_background(
        image: UploadFile,
        x_api_key: str = Header(default=""),
    ) -> Response:
        expected_key = os.environ["API_SECRET"]
        if not secrets.compare_digest(x_api_key, expected_key):
            raise HTTPException(status_code=401, detail="Unauthorised.")

        if image.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(status_code=415, detail="Upload a JPEG, PNG, or WebP image.")

        image_bytes = await image.read(MAX_UPLOAD_BYTES + 1)
        if len(image_bytes) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="The image must be 10 MB or smaller.")

        try:
            with Image.open(BytesIO(image_bytes)) as uploaded_image:
                width, height = uploaded_image.size
                uploaded_image.verify()
        except (UnidentifiedImageError, OSError):
            raise HTTPException(status_code=400, detail="The uploaded image is invalid.") from None

        if (
            width > MAX_IMAGE_DIMENSION
            or height > MAX_IMAGE_DIMENSION
            or width * height > MAX_IMAGE_PIXELS
        ):
            raise HTTPException(
                status_code=413,
                detail="The image dimensions must not exceed 4096 × 4096 pixels.",
            )

        if remover is None:
            raise HTTPException(status_code=503, detail="The model is not ready.")

        try:
            result = remover.remove_background(image_bytes)
        except Exception as error:
            raise HTTPException(status_code=500, detail="Background removal failed.") from error

        return Response(
            content=result,
            media_type="image/png",
            headers={"Cache-Control": "no-store"},
        )

    return web_app
