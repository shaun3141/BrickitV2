#!/usr/bin/env python3
"""
Script to generate a new version of bricks_and_plates.json with substitutes
for missing colors. For each piece that doesn't have a color, adds that color
with substitute pieces that can fill the same space.
"""

import json
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional


def parse_brick_type(brick_type: str) -> Tuple[str, int, int]:
    """Parse a brick type string like "BRICK 2X4" into (type, width, length)."""
    parts = brick_type.split()
    type_name = parts[0]  # "BRICK" or "PLATE"
    dimensions = parts[1].split("X")
    width = int(dimensions[0])
    length = int(dimensions[1])
    return type_name, width, length


def calculate_size(width: int, length: int) -> int:
    """Calculate the total size (area) of a brick."""
    return width * length


def find_efficient_substitute(
    target_width: int,
    target_length: int,
    available_pieces: List[Dict[str, Any]],
    color_name: str
) -> Optional[List[Dict[str, Any]]]:
    """
    Find the most efficient combination of smaller pieces to fill target dimensions.
    Uses a greedy approach: prioritize pieces that fit the width, then pack length.
    
    Args:
        target_width: Target width in studs
        target_length: Target length in studs
        available_pieces: List of smaller pieces that have the desired color
        color_name: The color we're looking for
        
    Returns:
        List of substitute pieces with quantities, or None if no valid substitute
    """
    # Filter pieces by those that have the color and are smaller
    candidates = []
    for piece in available_pieces:
        if piece['size'] < target_width * target_length:
            # Check if this piece has the color
            color_data = next((c for c in piece['colors_data'] if c['color_name'] == color_name), None)
            if color_data:
                candidates.append({
                    'brick_type': piece['brick_type'],
                    'width': piece['width'],
                    'length': piece['length'],
                    'size': piece['size'],
                    'color_data': color_data
                })
    
    if not candidates:
        return None
    
    # Sort candidates by size (largest first) for greedy packing
    candidates.sort(key=lambda x: x['size'], reverse=True)
    
    # Greedy packing algorithm
    # For simplicity, we'll use a row-based approach:
    # Try to fill rows of the target width, for target_length rows
    
    substitutes = []
    total_area_needed = target_width * target_length
    total_area_filled = 0
    
    # Greedy approach: use largest pieces first until we fill the area
    remaining_area = total_area_needed
    
    for candidate in candidates:
        # How many of this piece can we fit?
        if candidate['width'] <= target_width and candidate['length'] <= target_length:
            # Calculate how many we need
            count = 0
            temp_remaining = remaining_area
            
            while temp_remaining >= candidate['size']:
                count += 1
                temp_remaining -= candidate['size']
            
            if count > 0:
                remaining_area -= count * candidate['size']
                substitutes.append({
                    'brick_type': candidate['brick_type'],
                    'element_id': candidate['color_data']['element_id'],
                    'quantity': count
                })
                
                if remaining_area == 0:
                    break
    
    # Verify we filled the area exactly
    if remaining_area == 0:
        return substitutes
    
    # If greedy didn't work perfectly, try a simpler approach:
    # Just use 1x1 or smallest pieces to fill the remaining area
    smallest = min(candidates, key=lambda x: x['size'])
    if remaining_area > 0 and smallest['size'] == 1:
        substitutes.append({
            'brick_type': smallest['brick_type'],
            'element_id': smallest['color_data']['element_id'],
            'quantity': remaining_area
        })
        remaining_area = 0
    
    if remaining_area == 0:
        return substitutes
    
    # If we still can't fill it, return None
    return None


def generate_with_substitutes(input_file: Path, output_file: Path):
    """Generate a new JSON file with substitutes for missing colors."""
    
    # Load the data
    with open(input_file, 'r') as f:
        bricks_data = json.load(f)
    
    # Parse all bricks and organize by type
    parsed_bricks = []
    bricks_by_type = {}
    
    for brick in bricks_data:
        brick_type = brick['brick_type']
        type_name, width, length = parse_brick_type(brick_type)
        
        brick_info = {
            'element_id': brick['element_id'],
            'brick_type': brick_type,
            'type_name': type_name,
            'width': width,
            'length': length,
            'size': calculate_size(width, length),
            'colors_data': brick['colors'],
            'num_colors': brick['num_colors']
        }
        parsed_bricks.append(brick_info)
        
        if type_name not in bricks_by_type:
            bricks_by_type[type_name] = []
        bricks_by_type[type_name].append(brick_info)
    
    # Sort bricks by size within each type
    for type_name in bricks_by_type:
        bricks_by_type[type_name].sort(key=lambda x: x['size'])
    
    # Process each brick to add substitutes
    new_bricks_data = []
    
    for brick_info in parsed_bricks:
        type_name = brick_info['type_name']
        current_size = brick_info['size']
        
        # Get all smaller bricks of the same type
        smaller_bricks = [
            b for b in bricks_by_type[type_name]
            if b['size'] < current_size
        ]
        
        # Get all colors available in this brick
        current_colors = {c['color_name'] for c in brick_info['colors_data']}
        
        # Get all colors available in smaller bricks
        all_colors_in_smaller = set()
        for smaller in smaller_bricks:
            for color in smaller['colors_data']:
                all_colors_in_smaller.add(color['color_name'])
        
        # Find missing colors
        missing_colors = all_colors_in_smaller - current_colors
        
        # Start building the new brick entry
        new_brick = {
            'element_id': brick_info['element_id'],
            'brick_type': brick_info['brick_type'],
            'num_colors': brick_info['num_colors'],
            'colors': list(brick_info['colors_data'])  # Start with existing colors
        }
        
        # Add missing colors with substitutes
        for color_name in sorted(missing_colors):
            # Find the most efficient substitute
            substitutes = find_efficient_substitute(
                brick_info['width'],
                brick_info['length'],
                smaller_bricks,
                color_name
            )
            
            if substitutes:
                # Get RGB value from any smaller brick that has this color
                rgb_value = None
                for smaller in smaller_bricks:
                    color_data = next((c for c in smaller['colors_data'] if c['color_name'] == color_name), None)
                    if color_data:
                        rgb_value = color_data['rgb']
                        break
                
                # Get total price from substitutes
                total_price = 0
                for sub in substitutes:
                    # Find the piece and color to get the price
                    for smaller in smaller_bricks:
                        if smaller['brick_type'] == sub['brick_type']:
                            color_data = next((c for c in smaller['colors_data'] if c['color_name'] == color_name), None)
                            if color_data:
                                total_price += color_data.get('price', 0) * sub['quantity']
                                break
                
                # Add the color with substitutes
                new_color_entry = {
                    'color_name': color_name,
                    'element_id': None,  # No direct element_id since it's a substitute
                    'rgb': rgb_value,
                    'price': round(total_price, 2),
                    'is_substitute': True,
                    'substitutes': substitutes
                }
                
                new_brick['colors'].append(new_color_entry)
        
        # Update num_colors to include substitutes
        new_brick['num_colors'] = len(new_brick['colors'])
        
        new_bricks_data.append(new_brick)
    
    # Write the new file
    with open(output_file, 'w') as f:
        json.dump(new_bricks_data, f, indent=2)
    
    print(f"✅ Generated new file: {output_file}")
    print(f"📊 Total pieces: {len(new_bricks_data)}")
    
    # Statistics
    total_substitutes = sum(
        len([c for c in brick['colors'] if c.get('is_substitute')])
        for brick in new_bricks_data
    )
    print(f"🔄 Total substitute colors added: {total_substitutes}")


def main():
    input_file = Path(__file__).parent.parent.parent / "server" / "public" / "bricks_and_plates.json"
    output_file = Path(__file__).parent.parent.parent / "server" / "public" / "bricks_and_plates_with_substitutes.json"
    
    print("=" * 80)
    print("GENERATING BRICKS & PLATES WITH SUBSTITUTES")
    print("=" * 80)
    print()
    
    generate_with_substitutes(input_file, output_file)
    
    print()
    print("=" * 80)
    print("✅ COMPLETE!")
    print("=" * 80)


if __name__ == "__main__":
    main()

