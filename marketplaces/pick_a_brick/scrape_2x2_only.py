"""
Temporary script to scrape only 2x2 bricks and merge with existing data.
"""
import asyncio
import json
import os
from scraper import scrape_brick_colors, BrickItem
from stagehand import Stagehand, StagehandConfig
from dotenv import load_dotenv

load_dotenv()

# Only scrape 2x2 bricks
BRICKS_TO_SCRAPE = [
    {"element_id": "3003", "name": "BRICK 2X2"},
    {"element_id": "3022", "name": "PLATE 2X2"},
]

async def main():
    """Scrape only 2x2 bricks and merge with existing data."""
    print("=" * 70)
    print("Scraping 2x2 Bricks Only")
    print("=" * 70)
    
    required_vars = ["BROWSERBASE_API_KEY", "BROWSERBASE_PROJECT_ID", "OPENAI_API_KEY"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"\nError: Missing environment variables: {', '.join(missing_vars)}")
        return
    
    print("\n✓ All required environment variables are set\n")
    
    # Load existing data
    data_file = os.path.join(os.path.dirname(__file__), "bricks_and_plates.json")
    existing_bricks = []
    if os.path.exists(data_file):
        with open(data_file, 'r') as f:
            existing_bricks = json.load(f)
        print(f"Loaded {len(existing_bricks)} existing bricks")
    
    stagehand = None
    new_bricks = []
    
    try:
        config = StagehandConfig(
            env="BROWSERBASE",
            api_key=os.getenv("BROWSERBASE_API_KEY"),
            project_id=os.getenv("BROWSERBASE_PROJECT_ID"),
            model_name="openai/gpt-4o",
            model_api_key=os.getenv("OPENAI_API_KEY"),
        )
        stagehand = Stagehand(config)
        await stagehand.init()
        
        print(f"View browser: https://www.browserbase.com/sessions/{stagehand.session_id}\n")
        
        for idx, brick_info in enumerate(BRICKS_TO_SCRAPE, 1):
            print(f"\n{'='*70}")
            print(f"[{idx}/{len(BRICKS_TO_SCRAPE)}] {brick_info['name']} (Element ID: {brick_info['element_id']})")
            print(f"{'='*70}")
            
            try:
                brick_data = await scrape_brick_colors(stagehand, brick_info['element_id'], brick_info['name'])
                new_bricks.append(brick_data.model_dump())
                
                if brick_data.colors:
                    print(f"\n  ✓ Successfully scraped {len(brick_data.colors)} colors!")
                else:
                    print(f"\n  ✗ No colors extracted")
                    
            except Exception as e:
                print(f"\n  ✗ Error: {e}")
                new_bricks.append({
                    "element_id": brick_info['element_id'],
                    "brick_type": brick_info['name'],
                    "num_colors": 0,
                    "colors": []
                })
        
        # Merge with existing data (replace if exists, otherwise add)
        existing_types = {b['brick_type']: i for i, b in enumerate(existing_bricks)}
        merged_bricks = existing_bricks.copy()
        
        for new_brick in new_bricks:
            if new_brick['brick_type'] in existing_types:
                # Replace existing
                idx = existing_types[new_brick['brick_type']]
                merged_bricks[idx] = new_brick
                print(f"\n  Replaced {new_brick['brick_type']} in existing data")
            else:
                # Add new
                merged_bricks.append(new_brick)
                print(f"\n  Added {new_brick['brick_type']} to data")
        
        # Save merged results
        with open(data_file, 'w') as f:
            json.dump(merged_bricks, f, indent=2)
        
        print(f"\n\n{'=' * 70}")
        print(f"COMPLETE!")
        print(f"{'=' * 70}")
        print(f"Results saved to: {data_file}")
        print(f"Total bricks: {len(merged_bricks)}")
        print(f"2x2 bricks scraped: {len(new_bricks)}")
        print(f"Total colors extracted: {sum(b.get('num_colors', 0) for b in new_bricks)}")
        print("=" * 70)
        
    finally:
        if stagehand:
            await stagehand.close()


if __name__ == "__main__":
    asyncio.run(main())

