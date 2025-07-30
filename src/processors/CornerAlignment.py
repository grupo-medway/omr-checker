"""
Corner-based alignment for scanned sheets with minimal positioning variations.
Detects 4 corner markers and applies affine transformation for precise alignment.
"""
import cv2
import numpy as np
from src.logger import logger
from src.processors.interfaces.ImagePreprocessor import ImagePreprocessor
from src.utils.interaction import InteractionUtils


class CornerAlignment(ImagePreprocessor):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        options = self.options
        config = self.tuning_config
        
        # Options - DEVE VIR PRIMEIRO
        self.marker_threshold = options.get("markerThreshold", 50)  # Threshold for dark markers
        self.min_area = options.get("minArea", 100)  # Minimum area for corner markers
        self.max_area = options.get("maxArea", 2000)  # Maximum area for corner markers
        
        # Load reference image
        self.ref_path = self.relative_dir.joinpath(options["reference"])
        self.ref_img = cv2.imread(str(self.ref_path), cv2.IMREAD_GRAYSCALE)
        
        # Detect reference corners once
        self.ref_corners = self.detect_corner_markers(self.ref_img)
        if len(self.ref_corners) != 4:
            logger.error(f"Could not detect 4 corners in reference image: {self.ref_path}")
        
    def __str__(self):
        return f"CornerAlignment({self.ref_path.name})"
        
    def exclude_files(self):
        return [self.ref_path]
    
    def detect_corner_markers(self, image):
        """Detect 4 corner markers (dark squares) in the image"""
        # Threshold to find dark regions
        _, binary = cv2.threshold(image, self.marker_threshold, 255, cv2.THRESH_BINARY_INV)
        
        # Find contours
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Filter contours by area and shape
        corner_candidates = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if self.min_area < area < self.max_area:
                # Check if roughly rectangular
                peri = cv2.arcLength(contour, True)
                approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
                if len(approx) >= 4:  # Roughly rectangular
                    # Get center point
                    M = cv2.moments(contour)
                    if M["m00"] != 0:
                        cx = int(M["m10"] / M["m00"])
                        cy = int(M["m01"] / M["m00"])
                        corner_candidates.append((cx, cy, area))
        
        # Select 4 corners (largest areas, well distributed)
        if len(corner_candidates) < 4:
            return []
            
        # Sort by area and take largest ones
        corner_candidates.sort(key=lambda x: x[2], reverse=True)
        corners = [(x, y) for x, y, _ in corner_candidates[:8]]  # Take top 8 candidates
        
        # From these, select 4 that are most spread out (one in each quadrant)
        h, w = image.shape
        selected_corners = []
        
        # Divide image into quadrants and pick one corner from each
        quadrants = [
            (0, w//2, 0, h//2),      # Top-left
            (w//2, w, 0, h//2),      # Top-right  
            (0, w//2, h//2, h),      # Bottom-left
            (w//2, w, h//2, h)       # Bottom-right
        ]
        
        for x1, x2, y1, y2 in quadrants:
            quadrant_corners = [(x, y) for x, y in corners if x1 <= x < x2 and y1 <= y < y2]
            if quadrant_corners:
                selected_corners.append(quadrant_corners[0])  # Take first (largest area in quadrant)
        
        return selected_corners

    def apply_filter(self, image, file_path):
        config = self.tuning_config
        
        # Detect corners in current image
        current_corners = self.detect_corner_markers(image)
        
        if len(current_corners) != 4 or len(self.ref_corners) != 4:
            logger.warning(f"Could not detect 4 corners in {file_path}. Skipping alignment.")
            return image
            
        # Sort corners in consistent order (top-left, top-right, bottom-right, bottom-left)
        def sort_corners(corners):
            corners = sorted(corners, key=lambda x: x[1])  # Sort by y
            top_corners = sorted(corners[:2], key=lambda x: x[0])  # Sort top 2 by x
            bottom_corners = sorted(corners[2:], key=lambda x: x[0])  # Sort bottom 2 by x
            return [top_corners[0], top_corners[1], bottom_corners[1], bottom_corners[0]]
        
        current_sorted = sort_corners(current_corners)
        ref_sorted = sort_corners(self.ref_corners)
        
        # Convert to numpy arrays
        src_points = np.array(current_sorted, dtype=np.float32)
        dst_points = np.array(ref_sorted, dtype=np.float32)
        
        # Calculate affine transformation
        transform_matrix = cv2.estimateAffine2D(src_points, dst_points)[0]
        
        if transform_matrix is None:
            logger.warning(f"Could not calculate transformation for {file_path}")
            return image
            
        # Apply transformation
        h, w = self.ref_img.shape
        aligned_image = cv2.warpAffine(image, transform_matrix, (w, h))
        
        # Debug visualization
        if config.outputs.show_image_level >= 3:
            debug_img = cv2.cvtColor(image.copy(), cv2.COLOR_GRAY2BGR)
            for i, (x, y) in enumerate(current_sorted):
                cv2.circle(debug_img, (x, y), 10, (0, 255, 0), 2)
                cv2.putText(debug_img, str(i), (x+15, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
            InteractionUtils.show("Corner Detection", debug_img, config=config)
            
        logger.info(f"Aligned image using corner markers: {file_path}")
        return aligned_image