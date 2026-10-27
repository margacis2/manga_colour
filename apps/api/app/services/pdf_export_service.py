import io
from typing import List, Tuple, Optional
from PIL import Image, ImageOps, ImageDraw, ImageFont
import pypdf

class PDFExportService:
    @staticmethod
    def normalize_image(img: Image.Image, quality_preset: str = "balanced") -> Image.Image:
        """
        Normalizes EXIF orientation, handles transparency over white background,
        converts to RGB, and scales according to quality preset.
        """
        # 1. Correct EXIF orientation
        try:
            img = ImageOps.exif_transpose(img)
        except Exception:
            pass

        # 2. Handle transparency and color spaces (RGBA, LA, P, CMYK, etc.)
        if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
            rgba = img.convert("RGBA")
            background = Image.new("RGB", rgba.size, (255, 255, 255))
            background.paste(rgba, mask=rgba.split()[3])
            img = background
        elif img.mode != "RGB":
            img = img.convert("RGB")

        # 3. Scale based on quality preset
        w, h = img.size
        if quality_preset == "small":
            max_dim = 1200
            if max(w, h) > max_dim:
                ratio = max_dim / max(w, h)
                img = img.resize((int(w * ratio), int(h * ratio)), Image.Resampling.LANCZOS)
        elif quality_preset == "balanced":
            max_dim = 1800
            if max(w, h) > max_dim:
                ratio = max_dim / max(w, h)
                img = img.resize((int(w * ratio), int(h * ratio)), Image.Resampling.LANCZOS)
        # "original" keeps full resolution

        return img

    @classmethod
    def generate_standard_pdf(
        cls,
        image_bytes_list: List[bytes],
        quality_preset: str = "balanced",
        include_page_numbers: bool = False
    ) -> bytes:
        """
        Mode B: Standard paginated manga PDF.
        Each page is rendered on an individual PDF page with optional page numbers.
        """
        if not image_bytes_list:
            raise ValueError("No images provided for PDF export")

        pdf_pages: List[Image.Image] = []
        total_pages = len(image_bytes_list)

        for idx, img_bytes in enumerate(image_bytes_list):
            raw_img = Image.open(io.BytesIO(img_bytes))
            norm_img = cls.normalize_image(raw_img, quality_preset)

            if include_page_numbers:
                # Add bottom banner with page number
                w, h = norm_img.size
                banner_h = max(28, int(h * 0.035))
                page_canvas = Image.new("RGB", (w, h + banner_h), (255, 255, 255))
                page_canvas.paste(norm_img, (0, 0))

                draw = ImageDraw.Draw(page_canvas)
                page_str = f"- {idx + 1} / {total_pages} -"
                # Draw text centered in the banner
                font_size = max(12, int(banner_h * 0.5))
                try:
                    font = ImageFont.load_default()
                except Exception:
                    font = None
                
                # Estimate text width
                bbox = draw.textbbox((0, 0), page_str, font=font)
                text_w = bbox[2] - bbox[0]
                text_x = max(10, (w - text_w) // 2)
                text_y = h + (banner_h - (bbox[3] - bbox[1])) // 2
                draw.text((text_x, text_y), page_str, fill=(100, 100, 100), font=font)
                pdf_pages.append(page_canvas)
            else:
                pdf_pages.append(norm_img)

        # Build PDF in memory
        pdf_buffer = io.BytesIO()
        first_page = pdf_pages[0]
        first_page.save(
            pdf_buffer,
            format="PDF",
            save_all=True,
            append_images=pdf_pages[1:],
            resolution=100.0
        )
        pdf_bytes = pdf_buffer.getvalue()

        # Validate with pypdf
        cls.validate_pdf(pdf_bytes, expected_min_pages=1)
        return pdf_bytes

    @classmethod
    def generate_webtoon_pdf(
        cls,
        image_bytes_list: List[bytes],
        quality_preset: str = "balanced",
        webtoon_gap: int = 0
    ) -> bytes:
        """
        Mode A: Webtoon Continuous Vertical PDF.
        Pages are stacked vertically with uniform width and seamless strips (max ~8000px height per strip)
        for fluid vertical scrolling.
        """
        if not image_bytes_list:
            raise ValueError("No images provided for Webtoon PDF export")

        # 1. Normalize all images
        norm_images: List[Image.Image] = []
        for img_bytes in image_bytes_list:
            raw_img = Image.open(io.BytesIO(img_bytes))
            norm_images.append(cls.normalize_image(raw_img, quality_preset))

        # 2. Determine target width for all strips
        target_width = 1000
        if quality_preset == "small":
            target_width = 800
        elif quality_preset == "original":
            # Use max width of all input images, clamped between 800 and 1600
            target_width = max(800, min(1600, max(img.width for img in norm_images)))

        # 3. Resize all images to target_width preserving aspect ratio
        scaled_images: List[Image.Image] = []
        for img in norm_images:
            if img.width == target_width:
                scaled_images.append(img)
            else:
                scale = target_width / img.width
                new_h = max(1, int(img.height * scale))
                scaled = img.resize((target_width, new_h), Image.Resampling.LANCZOS)
                scaled_images.append(scaled)

        # 4. Chunk into vertical strips (max height ~8000px per PDF page to keep within safe PDF rendering specs)
        max_strip_height = 8000
        strip_canvas_list: List[Image.Image] = []

        current_strip_images: List[Tuple[Image.Image, int]] = [] # (img, y_pos)
        current_y = 0

        for img in scaled_images:
            # If adding this image exceeds max_strip_height and current strip is not empty, flush current strip
            if current_strip_images and (current_y + img.height + webtoon_gap > max_strip_height):
                # Build strip
                strip = Image.new("RGB", (target_width, current_y), (255, 255, 255))
                for s_img, y in current_strip_images:
                    strip.paste(s_img, (0, y))
                strip_canvas_list.append(strip)
                current_strip_images = []
                current_y = 0

            current_strip_images.append((img, current_y))
            current_y += img.height + webtoon_gap

        # Flush final strip
        if current_strip_images:
            strip = Image.new("RGB", (target_width, current_y), (255, 255, 255))
            for s_img, y in current_strip_images:
                strip.paste(s_img, (0, y))
            strip_canvas_list.append(strip)

        # 5. Build PDF from vertical strips
        pdf_buffer = io.BytesIO()
        first_strip = strip_canvas_list[0]
        first_strip.save(
            pdf_buffer,
            format="PDF",
            save_all=True,
            append_images=strip_canvas_list[1:],
            resolution=100.0
        )
        pdf_bytes = pdf_buffer.getvalue()

        # Validate with pypdf
        cls.validate_pdf(pdf_bytes, expected_min_pages=1)
        return pdf_bytes

    @staticmethod
    def validate_pdf(pdf_bytes: bytes, expected_min_pages: int = 1) -> pypdf.PdfReader:
        """
        Validates generated PDF bytes using pypdf.
        Raises ValueError if the PDF is corrupt or has insufficient pages.
        """
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        num_pages = len(reader.pages)
        if num_pages < expected_min_pages:
            raise ValueError(f"Generated PDF contains {num_pages} pages, expected at least {expected_min_pages}")
        return reader
