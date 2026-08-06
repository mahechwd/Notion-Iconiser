from __future__ import annotations

from io import BytesIO

import torch
from PIL import Image, ImageOps
from torchvision import transforms
from transformers import AutoModelForImageSegmentation

MODEL_ID = "ZhengPeng7/BiRefNet"
INFERENCE_SIZE = (1024, 1024)


class BiRefNetBackgroundRemover:
    """Load BiRefNet once and turn uploaded images into transparent PNGs."""

    def __init__(self) -> None:
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = AutoModelForImageSegmentation.from_pretrained(
            MODEL_ID,
            trust_remote_code=True,
        )
        self.model.to(self.device)
        self.model.eval()
        self.transform = transforms.Compose(
            [
                transforms.Resize(INFERENCE_SIZE),
                transforms.ToTensor(),
                transforms.Normalize(
                    mean=(0.485, 0.456, 0.406),
                    std=(0.229, 0.224, 0.225),
                ),
            ]
        )

    @torch.inference_mode()
    def remove_background(self, image_bytes: bytes) -> bytes:
        with Image.open(BytesIO(image_bytes)) as uploaded_image:
            source = ImageOps.exif_transpose(uploaded_image).convert("RGB")

        model_input = self.transform(source).unsqueeze(0).to(self.device)
        prediction = self.model(model_input)[-1].sigmoid().cpu()[0].squeeze()
        mask = transforms.ToPILImage()(prediction).resize(source.size, Image.Resampling.LANCZOS)

        result = source.copy()
        result.putalpha(mask)

        output = BytesIO()
        result.save(output, format="PNG", optimize=True)
        return output.getvalue()
