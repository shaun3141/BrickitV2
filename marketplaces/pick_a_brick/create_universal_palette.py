#!/usr/bin/env python3
"""
Post-processing script to create a universal color palette.

Only keeps colors that:
1. Exist as 1x1 BRICK
2. Exist as 1x1 PLATE

This ensures all colors are completely interchangeable between bricks and plates.
"""

import json
from pathlib import Path
from typing import Set, Dict, List


def parse_brick_type(brick_type: str) -> tuple[str, int, int]:
    """Parse a brick type string like "BRICK 2X4" into (type, width, length)."""
    parts = brick_type.split()
    type_name = parts[0]  # "BRICK" or "PLATE"
    dimensions = parts[1].split("X")
    width = int(dimensions[0])
    length = int(dimensions[1])
    return type_name, width, length


def main():
    # Load the substitutes file
    input_file = Path(__file__).parent.parent.parent / "server" / "public" / "bricks_and_plates_with_substitutes.json"
    output_file = Path(__file__).parent.parent.parent / "server" / "public" / "bricks_and_plates_universal.json"
    
    with open(input_file, 'r') as f:
        data = json.load(f)
    
    print("=" * 80)
    print("CREATING UNIVERSAL COLOR PALETTE")
    print("=" * 80)
    print()
    
    # Find BRICK 1X1 and PLATE 1X1
    brick_1x1 = None
    plate_1x1 = None
    
    for piece in data:
        if piece['brick_type'] == 'BRICK 1X1':
            brick_1x1 = piece
        elif piece['brick_type'] == 'PLATE 1X1':
            plate_1x1 = piece
    
    if not brick_1x1 or not plate_1x1:
        print("❌ Could not find BRICK 1X1 or PLATE 1X1")
        return
    
    # Get colors from each (only direct colors, not substitutes)
    brick_1x1_colors = {
        c['color_name'] for c in brick_1x1['colors']
        if not c.get('is_substitute')
    }
    
    plate_1x1_colors = {
        c['color_name'] for c in plate_1x1['colors']
        if not c.get('is_substitute')
    }
    
    # Find universal colors (exist in both)
    universal_colors = brick_1x1_colors & plate_1x1_colors
    
    print(f"🧱 BRICK 1X1 direct colors: {len(brick_1x1_colors)}")
    print(f"📋 PLATE 1X1 direct colors: {len(plate_1x1_colors)}")
    print(f"✅ Universal colors (in both): {len(universal_colors)}")
    print()
    
    # Colors that will be removed
    brick_only = brick_1x1_colors - plate_1x1_colors
    plate_only = plate_1x1_colors - brick_1x1_colors
    
    if brick_only:
        print(f"🔴 Removing {len(brick_only)} BRICK-only colors:")
        for color in sorted(brick_only):
            print(f"   - {color}")
        print()
    
    if plate_only:
        print(f"🔴 Removing {len(plate_only)} PLATE-only colors:")
        for color in sorted(plate_only):
            print(f"   - {color}")
        print()
    
    print(f"✅ Universal color palette ({len(universal_colors)} colors):")
    for color in sorted(universal_colors):
        print(f"   - {color}")
    print()
    
    # Filter all pieces to only include universal colors
    filtered_data = []
    total_colors_before = 0
    total_colors_after = 0
    
    print("=" * 80)
    print("FILTERING PIECES")
    print("=" * 80)
    print()
    
    for piece in data:
        total_colors_before += len(piece['colors'])
        
        # Filter colors to only universal ones
        filtered_colors = [
            color for color in piece['colors']
            if color['color_name'] in universal_colors
        ]
        
        total_colors_after += len(filtered_colors)
        
        if filtered_colors:
            filtered_piece = {
                'element_id': piece['element_id'],
                'brick_type': piece['brick_type'],
                'num_colors': len(filtered_colors),
                'colors': filtered_colors
            }
            filtered_data.append(filtered_piece)
            
            removed_count = len(piece['colors']) - len(filtered_colors)
            status = "✅" if removed_count == 0 else f"🔧 (-{removed_count})"
            print(f"{status} {piece['brick_type']:15} {len(piece['colors']):2} → {len(filtered_colors):2} colors")
    
    print()
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print()
    
    print(f"Total pieces: {len(filtered_data)}")
    print(f"Total colors before: {total_colors_before}")
    print(f"Total colors after: {total_colors_after}")
    print(f"Colors removed: {total_colors_before - total_colors_after}")
    print(f"Universal palette size: {len(universal_colors)} colors")
    print()
    
    # Verify consistency
    print("=" * 80)
    print("VERIFYING CONSISTENCY")
    print("=" * 80)
    print()
    
    bricks_by_type = {'BRICK': [], 'PLATE': []}
    
    for piece in filtered_data:
        type_name, _, _ = parse_brick_type(piece['brick_type'])
        bricks_by_type[type_name].append(piece)
    
    # Check if all colors are now available in both types
    all_brick_colors = set()
    all_plate_colors = set()
    
    for piece in bricks_by_type['BRICK']:
        for color in piece['colors']:
            all_brick_colors.add(color['color_name'])
    
    for piece in bricks_by_type['PLATE']:
        for color in piece['colors']:
            all_plate_colors.add(color['color_name'])
    
    print(f"Colors available in BRICKS: {len(all_brick_colors)}")
    print(f"Colors available in PLATES: {len(all_plate_colors)}")
    
    if all_brick_colors == all_plate_colors == universal_colors:
        print("✅ Perfect match! All colors are available in both BRICKS and PLATES")
    else:
        print("⚠️  Mismatch detected!")
        if all_brick_colors != universal_colors:
            print(f"   BRICK colors don't match: {all_brick_colors - universal_colors}")
        if all_plate_colors != universal_colors:
            print(f"   PLATE colors don't match: {all_plate_colors - universal_colors}")
    
    print()
    
    # Write output file
    with open(output_file, 'w') as f:
        json.dump(filtered_data, f, indent=2)
    
    print(f"💾 Saved to: {output_file}")
    print()


if __name__ == "__main__":
    main()

