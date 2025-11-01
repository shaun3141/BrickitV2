#!/usr/bin/env python3
"""
Script to analyze the generated substitutes file and identify:
1. Colors that still couldn't get substitutes
2. Color differences between plates and bricks
"""

import json
from pathlib import Path
from collections import defaultdict
from typing import Set, Dict, List


def parse_brick_type(brick_type: str) -> tuple[str, int, int]:
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


def main():
    # Load both files
    original_file = Path(__file__).parent.parent.parent / "server" / "public" / "bricks_and_plates.json"
    substitutes_file = Path(__file__).parent.parent.parent / "server" / "public" / "bricks_and_plates_with_substitutes.json"
    
    with open(original_file, 'r') as f:
        original_data = json.load(f)
    
    with open(substitutes_file, 'r') as f:
        substitutes_data = json.load(f)
    
    print("=" * 80)
    print("SUBSTITUTE ANALYSIS")
    print("=" * 80)
    print()
    
    # Track colors by type (BRICK vs PLATE)
    brick_colors = set()
    plate_colors = set()
    
    # Track which pieces have colors (including substitutes)
    piece_info = {}
    
    for piece in substitutes_data:
        brick_type = piece['brick_type']
        type_name, width, length = parse_brick_type(brick_type)
        size = calculate_size(width, length)
        
        colors_with_subs = set()
        colors_direct = set()
        missing_subs = []
        
        for color in piece['colors']:
            color_name = color['color_name']
            colors_with_subs.add(color_name)
            
            if not color.get('is_substitute'):
                colors_direct.add(color_name)
            
            # Track by type
            if type_name == 'BRICK':
                brick_colors.add(color_name)
            else:
                plate_colors.add(color_name)
        
        piece_info[brick_type] = {
            'type_name': type_name,
            'size': size,
            'width': width,
            'length': length,
            'colors_with_subs': colors_with_subs,
            'colors_direct': colors_direct
        }
    
    # Find colors that should have substitutes but don't
    print("=" * 80)
    print("MISSING SUBSTITUTES ANALYSIS")
    print("=" * 80)
    print()
    
    for piece in substitutes_data:
        brick_type = piece['brick_type']
        info = piece_info[brick_type]
        
        # Find smaller pieces
        smaller_pieces = [
            p for bt, p in piece_info.items()
            if p['type_name'] == info['type_name'] and p['size'] < info['size']
        ]
        
        if not smaller_pieces:
            continue
        
        # Get all colors available in smaller pieces (with substitutes)
        all_smaller_colors = set()
        for smaller in smaller_pieces:
            all_smaller_colors.update(smaller['colors_with_subs'])
        
        # Find what's still missing
        missing = all_smaller_colors - info['colors_with_subs']
        
        if missing:
            print(f"{brick_type} (Size: {info['width']}x{info['length']})")
            print(f"  Still missing {len(missing)} colors:")
            for color in sorted(missing):
                # Find which smaller pieces have this color
                has_this = [
                    bt for bt, p in piece_info.items()
                    if p['type_name'] == info['type_name'] 
                    and p['size'] < info['size']
                    and color in p['colors_with_subs']
                ]
                print(f"    - {color}")
                print(f"      Available in: {', '.join(has_this)}")
            print()
    
    # Color differences between bricks and plates
    print("=" * 80)
    print("COLOR DIFFERENCES: BRICKS vs PLATES")
    print("=" * 80)
    print()
    
    only_bricks = brick_colors - plate_colors
    only_plates = plate_colors - brick_colors
    both = brick_colors & plate_colors
    
    print(f"Total unique colors in BRICKS: {len(brick_colors)}")
    print(f"Total unique colors in PLATES: {len(plate_colors)}")
    print(f"Colors in BOTH: {len(both)}")
    print()
    
    if only_bricks:
        print(f"Colors ONLY in BRICKS ({len(only_bricks)}):")
        for color in sorted(only_bricks):
            # Find which bricks have this color
            bricks_with_color = [
                bt for bt, p in piece_info.items()
                if p['type_name'] == 'BRICK' and color in p['colors_with_subs']
            ]
            print(f"  - {color}")
            print(f"    Available in: {', '.join(bricks_with_color)}")
        print()
    
    if only_plates:
        print(f"Colors ONLY in PLATES ({len(only_plates)}):")
        for color in sorted(only_plates):
            # Find which plates have this color
            plates_with_color = [
                bt for bt, p in piece_info.items()
                if p['type_name'] == 'PLATE' and color in p['colors_with_subs']
            ]
            print(f"  - {color}")
            print(f"    Available in: {', '.join(plates_with_color)}")
        print()
    
    # Detailed breakdown by piece size
    print("=" * 80)
    print("COLOR AVAILABILITY BY PIECE SIZE")
    print("=" * 80)
    print()
    
    for type_name in ['BRICK', 'PLATE']:
        pieces = [(bt, p) for bt, p in piece_info.items() if p['type_name'] == type_name]
        pieces.sort(key=lambda x: x[1]['size'])
        
        print(f"\n{type_name}S:")
        print("-" * 80)
        
        for brick_type, info in pieces:
            direct_count = len(info['colors_direct'])
            substitute_count = len(info['colors_with_subs']) - direct_count
            total_count = len(info['colors_with_subs'])
            
            print(f"{brick_type:15} (Size: {info['size']:2}): "
                  f"Direct: {direct_count:2}, Substitutes: {substitute_count:2}, Total: {total_count:2}")
    
    # Summary statistics
    print()
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print()
    
    total_colors_added = 0
    total_pieces_with_subs = 0
    
    for piece in substitutes_data:
        subs = [c for c in piece['colors'] if c.get('is_substitute')]
        if subs:
            total_pieces_with_subs += 1
            total_colors_added += len(subs)
    
    print(f"Total pieces analyzed: {len(substitutes_data)}")
    print(f"Pieces with substitutes: {total_pieces_with_subs}")
    print(f"Total substitute colors added: {total_colors_added}")
    print(f"Total unique colors across all pieces: {len(brick_colors | plate_colors)}")


if __name__ == "__main__":
    main()

