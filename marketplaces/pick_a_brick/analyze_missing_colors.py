#!/usr/bin/env python3
"""
Script to analyze bricks_and_plates.json and find pieces that are missing colors
that exist for smaller pieces of the same type.
"""

import json
from collections import defaultdict
from pathlib import Path


def parse_brick_type(brick_type: str) -> tuple[str, int, int]:
    """
    Parse a brick type string like "BRICK 2X4" into (type, width, length).
    Returns: (type_name, width, height)
    """
    parts = brick_type.split()
    type_name = parts[0]  # "BRICK" or "PLATE"
    dimensions = parts[1].split("X")
    width = int(dimensions[0])
    length = int(dimensions[1])
    return type_name, width, length


def calculate_size(width: int, length: int) -> int:
    """Calculate the total size (area) of a brick."""
    return width * length


def main():
    # Load the data
    data_file = Path(__file__).parent.parent.parent / "server" / "public" / "bricks_and_plates.json"
    
    with open(data_file, 'r') as f:
        bricks_data = json.load(f)
    
    # Group bricks by type (BRICK, PLATE, etc.)
    bricks_by_type = defaultdict(list)
    
    for brick in bricks_data:
        brick_type = brick['brick_type']
        type_name, width, length = parse_brick_type(brick_type)
        
        # Store brick info with parsed dimensions
        brick_info = {
            'element_id': brick['element_id'],
            'brick_type': brick_type,
            'type_name': type_name,
            'width': width,
            'length': length,
            'size': calculate_size(width, length),
            'colors': set(color['color_name'] for color in brick['colors']),
            'num_colors': brick['num_colors']
        }
        bricks_by_type[type_name].append(brick_info)
    
    # Analyze missing colors for each type
    print("=" * 80)
    print("MISSING COLOR ANALYSIS")
    print("=" * 80)
    
    for type_name, bricks in sorted(bricks_by_type.items()):
        print(f"\n{'=' * 80}")
        print(f"{type_name}S")
        print(f"{'=' * 80}")
        
        # Sort bricks by size
        bricks.sort(key=lambda x: x['size'])
        
        # For each brick, find colors that exist in smaller bricks but not in this one
        for i, brick in enumerate(bricks):
            # Get all colors from smaller bricks
            smaller_bricks = [b for b in bricks if b['size'] < brick['size']]
            
            if not smaller_bricks:
                continue  # This is the smallest brick
            
            # Collect all colors available in smaller bricks
            all_smaller_colors = set()
            for smaller_brick in smaller_bricks:
                all_smaller_colors.update(smaller_brick['colors'])
            
            # Find missing colors
            missing_colors = all_smaller_colors - brick['colors']
            
            if missing_colors:
                print(f"\n{brick['brick_type']} (Element ID: {brick['element_id']})")
                print(f"  Size: {brick['width']}x{brick['length']} ({brick['size']} studs)")
                print(f"  Has {brick['num_colors']} colors")
                print(f"  Missing {len(missing_colors)} colors that exist in smaller pieces:")
                
                # Show which smaller bricks have each missing color
                for color in sorted(missing_colors):
                    has_this_color = [
                        f"{b['brick_type']}"
                        for b in smaller_bricks
                        if color in b['colors']
                    ]
                    print(f"    - {color}")
                    print(f"      Available in: {', '.join(has_this_color)}")
    
    # Summary statistics
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    total_bricks = sum(len(bricks) for bricks in bricks_by_type.values())
    bricks_with_missing_colors = 0
    total_missing_colors = 0
    
    for type_name, bricks in bricks_by_type.items():
        bricks.sort(key=lambda x: x['size'])
        
        for brick in bricks:
            smaller_bricks = [b for b in bricks if b['size'] < brick['size']]
            
            if smaller_bricks:
                all_smaller_colors = set()
                for smaller_brick in smaller_bricks:
                    all_smaller_colors.update(smaller_brick['colors'])
                
                missing_colors = all_smaller_colors - brick['colors']
                
                if missing_colors:
                    bricks_with_missing_colors += 1
                    total_missing_colors += len(missing_colors)
    
    print(f"\nTotal bricks analyzed: {total_bricks}")
    print(f"Bricks with missing colors: {bricks_with_missing_colors}")
    print(f"Total missing color instances: {total_missing_colors}")
    
    # Show all unique colors across all bricks
    print("\n" + "=" * 80)
    print("ALL AVAILABLE COLORS")
    print("=" * 80)
    
    all_colors = set()
    for bricks in bricks_by_type.values():
        for brick in bricks:
            all_colors.update(brick['colors'])
    
    print(f"\nTotal unique colors across all pieces: {len(all_colors)}")
    for color in sorted(all_colors):
        print(f"  - {color}")


if __name__ == "__main__":
    main()

