"""
Centralized Manga Colorization Style System.

Provides authoritative configurations and high-fidelity, edge-aware,
luminance-preserving post-processing for manga colorization styles:
1. Anime Soft Watercolor (anime_soft_watercolor)
2. Vibrant Shonen Action (vibrant_shonen_action)
3. Dreamy Pastel Shojo (dreamy_pastel_shojo)
"""

from typing import Dict, Any, List, Optional
import cv2
import numpy as np

# Canonical Style Identifiers
STYLE_ANIME_SOFT = "anime_soft_watercolor"
STYLE_VIBRANT_SHONEN = "vibrant_shonen_action"
STYLE_PASTEL_SHOJO = "dreamy_pastel_shojo"

# Authoritative Style Registry
STYLE_CONFIGS: Dict[str, Dict[str, Any]] = {
    STYLE_ANIME_SOFT: {
        "id": STYLE_ANIME_SOFT,
        "name": "Anime Soft Watercolor",
        "tagline": "Romance & Slice-of-Life Aesthetics",
        "description": "Balanced pastel tones, gentle shading, and soft color transitions inspired by Blue Box.",
        "aliases": ["anime_soft", "watercolor", "default", "manga_color_v1", "anime_soft_v1"],
        "swatches": ["#FDE8E9", "#BEE3F8", "#C6F6D5", "#FEFCBF"],
        "params": {
            "saturation_scale": 1.08,
            "vibrancy_boost": 0.05,
            "contrast_factor": 1.02,
            "shadow_lift": 0.0,
            "highlight_soften": 0.98,
            "lab_a_shift": 1.5,
            "lab_b_shift": -0.5,
            "bloom_weight": 0.0,
            "skin_warmth": 1.05,
        }
    },
    STYLE_VIBRANT_SHONEN: {
        "id": STYLE_VIBRANT_SHONEN,
        "name": "Vibrant Shonen Action",
        "tagline": "High-Energy Dramatic Contrast",
        "description": "High saturation, dynamic contrast, punchy primary colors, and dramatic action lighting.",
        "aliases": ["vibrant_shonen", "shonen", "action", "vibrant_action"],
        "swatches": ["#E53E3E", "#3182CE", "#D69E2E", "#805AD5"],
        "params": {
            "saturation_scale": 1.45,
            "vibrancy_boost": 0.35,
            "contrast_factor": 1.25,
            "shadow_lift": -8.0,
            "highlight_soften": 1.08,
            "lab_a_shift": 3.0,
            "lab_b_shift": 2.0,
            "bloom_weight": 0.0,
            "skin_warmth": 1.15,
        }
    },
    STYLE_PASTEL_SHOJO: {
        "id": STYLE_PASTEL_SHOJO,
        "name": "Dreamy Pastel Shojo",
        "tagline": "Delicate Ethereal Atmosphere",
        "description": "Soft warm aesthetic, blush highlights, lifted luminous shadows, and dreamy emotional atmosphere.",
        "aliases": ["pastel_shojo", "shojo", "pastel", "dreamy_pastel", "dreamy"],
        "swatches": ["#FED7E2", "#E9D8FD", "#FEFCBF", "#C4F1F9"],
        "params": {
            "saturation_scale": 0.92,
            "vibrancy_boost": -0.05,
            "contrast_factor": 0.92,
            "shadow_lift": 18.0,
            "highlight_soften": 1.04,
            "lab_a_shift": 5.5,
            "lab_b_shift": -2.0,
            "bloom_weight": 0.16,
            "skin_warmth": 1.10,
        }
    }
}

# Alias Lookup Map
ALIAS_MAP: Dict[str, str] = {}
for canonical_id, config in STYLE_CONFIGS.items():
    ALIAS_MAP[canonical_id.lower()] = canonical_id
    for alias in config["aliases"]:
        ALIAS_MAP[alias.lower()] = canonical_id


def normalize_style_id(style_input: Optional[str]) -> str:
    """
    Normalizes any input style string (canonical ID or alias) to its canonical style ID.
    Defaults to STYLE_ANIME_SOFT if unknown or None.
    """
    if not style_input:
        return STYLE_ANIME_SOFT
    
    clean_id = str(style_input).strip().lower()
    return ALIAS_MAP.get(clean_id, STYLE_ANIME_SOFT)


def get_style_definition(style_input: Optional[str]) -> Dict[str, Any]:
    """Returns the full metadata and parameters for the requested style."""
    canonical_id = normalize_style_id(style_input)
    return STYLE_CONFIGS[canonical_id]


def get_all_styles() -> List[Dict[str, Any]]:
    """Returns all registered style configurations."""
    return list(STYLE_CONFIGS.values())


def _build_style_tone_curve(style_id: str) -> np.ndarray:
    """
    Builds a 256-element uint8 LUT for luminance transfer that shapes shadows,
    midtones, and highlights per style aesthetic while anchoring deep blacks and clean whites.
    """
    x = np.arange(256, dtype=np.float32)
    norm = x / 255.0
    
    if style_id == STYLE_VIBRANT_SHONEN:
        # Dynamic S-curve: pushes shadows darker, lifts highlights for punchy contrast
        # -0.16 * sin(2*pi*x) creates high dynamic contrast without crushing blacks (0 remains 0)
        curve = norm - 0.15 * np.sin(2.0 * np.pi * norm)
    elif style_id == STYLE_PASTEL_SHOJO:
        # Lifted luminous shadows: lifts darks and midtones (+15 to +25 points)
        # using a smooth Gaussian lift centered on lower midtones
        shadow_lift = 0.10 * np.exp(-((norm - 0.32) ** 2) / (2.0 * (0.20 ** 2)))
        curve = norm + shadow_lift
    else:  # STYLE_ANIME_SOFT
        # Balanced watercolor rolloff: subtle midtone lift, smooth shadow gradation
        curve = norm + 0.03 * np.sin(2.0 * np.pi * norm)
        
    lut = np.clip(curve * 255.0, 0.0, 255.0).astype(np.uint8)
    # Ensure boundary invariance: true black remains 0, paper white remains 255
    lut[0] = 0
    lut[255] = 255
    return lut


def _extract_skin_mask(rgb_image: np.ndarray) -> np.ndarray:
    """
    Computes a soft skin-tone probability mask in [0.0, 1.0] from an RGB image.
    Used to protect natural human skin tones from extreme color shifts or desaturation.
    """
    hsv = cv2.cvtColor(rgb_image, cv2.COLOR_RGB2HSV)
    h = hsv[:, :, 0]  # [0, 180]
    s = hsv[:, :, 1]  # [0, 255]
    v = hsv[:, :, 2]  # [0, 255]
    
    # Skin hues generally lie between 3 and 22 in OpenCV HSV
    h_skin = (h >= 3) & (h <= 22)
    s_skin = (s >= 25) & (s <= 180)
    v_skin = (v >= 70) & (v <= 250)
    
    binary_skin = (h_skin & s_skin & v_skin).astype(np.float32)
    # Soft blur to avoid hard boundary artifacts
    soft_skin = cv2.GaussianBlur(binary_skin, (9, 9), 3.0)
    return np.clip(soft_skin, 0.0, 1.0)


def apply_style_postprocessing(
    raw_color_rgb: np.ndarray,
    orig_gray: np.ndarray,
    style_input: str,
    palette_data: Optional[Dict[str, Any]] = None
) -> np.ndarray:
    """
    Applies authentic, color-space-aware, edge-preserving manga style processing:
    1. Shapes luminance tone curve per style (contrast, shadow lift, highlight rolloff).
    2. Adjusts chromaticity and saturation in CIELAB and HSV spaces.
    3. Protects character skin tones from unnatural discoloration.
    4. Applies ethereal bloom for Shojo where appropriate.
    5. Preserves paper whites (speech bubbles/margins) and pitch-black ink line art.
    """
    canonical_style = normalize_style_id(style_input)
    style_def = STYLE_CONFIGS[canonical_style]
    params = style_def["params"]
    
    orig_h, orig_w = orig_gray.shape[:2]
    if raw_color_rgb.shape[:2] != (orig_h, orig_w):
        raw_color_rgb = cv2.resize(raw_color_rgb, (orig_w, orig_h), interpolation=cv2.INTER_LANCZOS4)
        
    # 1. Compute line-art and paper-white masks from high-res scan
    # line_mask: 1.0 at pure black lines (<= 25), smoothly fading to 0.0 at 50
    line_mask = np.clip((50.0 - orig_gray.astype(np.float32)) / 25.0, 0.0, 1.0)
    # white_mask: 1.0 at pure white paper (>= 248), smoothly fading to 0.0 at 235
    white_mask = np.clip((orig_gray.astype(np.float32) - 235.0) / 13.0, 0.0, 1.0)
    
    # 2. Tone Curve Shaping on Luminance
    tone_lut = _build_style_tone_curve(canonical_style)
    shaped_lum = cv2.LUT(orig_gray, tone_lut)
    
    # 3. CIELAB Chrominance Transfer & Color Grading
    lab = cv2.cvtColor(raw_color_rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
    # Set Luminance from shaped tone curve
    lab[:, :, 0] = shaped_lum.astype(np.float32)
    
    # Chromatic shifts
    a_channel = lab[:, :, 1]
    b_channel = lab[:, :, 2]
    
    # Radial chroma expansion for action / compression for pastel
    chroma_a = a_channel - 128.0
    chroma_b = b_channel - 128.0
    
    if canonical_style == STYLE_VIBRANT_SHONEN:
        # Expand chromatic radius by 1.30x for rich vivid colors
        chroma_a *= 1.30
        chroma_b *= 1.30
        # Warm highlight and punchy primaries
        a_channel = 128.0 + chroma_a + params["lab_a_shift"]
        b_channel = 128.0 + chroma_b + params["lab_b_shift"]
    elif canonical_style == STYLE_PASTEL_SHOJO:
        # Delicate pastel chroma: gentle rose/peach tint in midtones, lavender in soft shadows
        chroma_a *= 0.95
        chroma_b *= 0.92
        # Add soft rose-blush (increase a*) and reduce harsh yellow (decrease b*)
        a_channel = 128.0 + chroma_a + params["lab_a_shift"]
        b_channel = 128.0 + chroma_b + params["lab_b_shift"]
    else:  # STYLE_ANIME_SOFT
        # Natural watercolor tones: subtle coral peach warmth in skin and sky tones
        a_channel = 128.0 + chroma_a + params["lab_a_shift"]
        b_channel = 128.0 + chroma_b + params["lab_b_shift"]
        
    lab[:, :, 1] = np.clip(a_channel, 0.0, 255.0)
    lab[:, :, 2] = np.clip(b_channel, 0.0, 255.0)
    
    graded_rgb = cv2.cvtColor(lab.astype(np.uint8), cv2.COLOR_LAB2RGB)
    
    # 4. Saturation and Vibrancy tuning in HSV
    hsv = cv2.cvtColor(graded_rgb, cv2.COLOR_RGB2HSV).astype(np.float32)
    sat = hsv[:, :, 1]
    val = hsv[:, :, 2]
    
    sat_scale = params["saturation_scale"]
    vibrancy = params["vibrancy_boost"]
    
    if canonical_style == STYLE_VIBRANT_SHONEN:
        # Non-linear vibrancy: boost already colorful pixels more than near-gray pixels
        sat_multiplier = sat_scale + vibrancy * (sat / 255.0)
        sat = np.clip(sat * sat_multiplier, 0.0, 255.0)
        
        # Primary color pop: boost reds, blues, and golds
        hue = hsv[:, :, 0]
        primary_mask = ((hue <= 18) | (hue >= 165) | ((hue >= 95) & (hue <= 135)))
        sat[primary_mask] = np.clip(sat[primary_mask] * 1.15, 0.0, 255.0)
    elif canonical_style == STYLE_PASTEL_SHOJO:
        # Gentle pastel compression: maintain soft tones
        sat = np.clip(sat * sat_scale, 0.0, 215.0)
        # Lift value slightly for airy radiance
        val = np.clip(val * 1.04, 0.0, 255.0)
    else:  # STYLE_ANIME_SOFT
        sat = np.clip(sat * sat_scale, 0.0, 240.0)
        
    hsv[:, :, 1] = sat
    hsv[:, :, 2] = val
    styled_rgb = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2RGB)
    
    # 5. Ethereal Soft Bloom for Shojo Style
    if params["bloom_weight"] > 0:
        bloom_blur = cv2.GaussianBlur(styled_rgb, (21, 21), 7.0)
        styled_rgb = cv2.addWeighted(styled_rgb, 1.0 - params["bloom_weight"], bloom_blur, params["bloom_weight"], 0)
        
    # 6. Skin-Tone Protection
    # Protect character skin tones from excessive tinting or saturation clipping
    skin_mask = _extract_skin_mask(styled_rgb)
    if canonical_style == STYLE_VIBRANT_SHONEN:
        # Ensure skin doesn't look sunburned/magenta: blend 30% softer saturation into skin regions
        skin_expanded = np.expand_dims(skin_mask, axis=2)
        softer_skin_rgb = cv2.addWeighted(styled_rgb, 0.70, graded_rgb, 0.30, 0)
        styled_rgb = (styled_rgb * (1.0 - skin_expanded * 0.4) + softer_skin_rgb * (skin_expanded * 0.4)).astype(np.uint8)
        
    # 7. Line-Art & Speech Bubble Preservation
    # Anchor pure black ink lines: ink stays pure black with zero haloing or color tint
    line_expanded = np.expand_dims(line_mask, axis=2)
    styled_rgb = (styled_rgb * (1.0 - line_expanded) + np.zeros_like(styled_rgb) * line_expanded).astype(np.uint8)
    
    # Anchor pure white speech bubbles & page margins: paper stays pristine clean #FFFFFF
    white_expanded = np.expand_dims(white_mask, axis=2)
    paper_white = np.full_like(styled_rgb, 255)
    styled_rgb = (styled_rgb * (1.0 - white_expanded) + paper_white * white_expanded).astype(np.uint8)
    
    return styled_rgb


def compute_image_statistics(rgb_image: np.ndarray) -> Dict[str, float]:
    """
    Computes key color and luminance metrics for automated validation and side-by-side comparison.
    Ignores pure white margins and pure black lines to measure artwork coloring accurately.
    """
    orig_gray = cv2.cvtColor(rgb_image, cv2.COLOR_RGB2GRAY)
    valid_art_mask = (orig_gray > 30) & (orig_gray < 245)
    
    if np.count_nonzero(valid_art_mask) == 0:
        valid_art_mask = np.ones_like(orig_gray, dtype=bool)
        
    hsv = cv2.cvtColor(rgb_image, cv2.COLOR_RGB2HSV)
    lab = cv2.cvtColor(rgb_image, cv2.COLOR_RGB2LAB)
    
    sat_valid = hsv[:, :, 1][valid_art_mask]
    val_valid = hsv[:, :, 2][valid_art_mask]
    a_valid = lab[:, :, 1][valid_art_mask].astype(np.float32)
    b_valid = lab[:, :, 2][valid_art_mask].astype(np.float32)
    
    return {
        "mean_saturation": round(float(np.mean(sat_valid)), 2),
        "std_saturation": round(float(np.std(sat_valid)), 2),
        "mean_luminance": round(float(np.mean(val_valid)), 2),
        "contrast_std": round(float(np.std(val_valid)), 2),
        "mean_lab_a": round(float(np.mean(a_valid)), 2),
        "mean_lab_b": round(float(np.mean(b_valid)), 2),
        "dynamic_range": round(float(np.percentile(val_valid, 95) - np.percentile(val_valid, 5)), 2)
    }
