"""
Final LEGO Pick a Brick scraper - clicks each color to get Element ID and price.
Based on findings from browser exploration.
"""

import asyncio
import json
import os
from typing import List
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from stagehand import Stagehand, StagehandConfig

load_dotenv()


class ColorVariant(BaseModel):
    """Model for a single color variant of a brick."""
    color_name: str = Field(..., description="The color name (e.g., Bright Red, Dark Orange)")
    element_id: str | None = Field(None, description="The unique element ID for this color variant (e.g., 300121)")
    rgb: str | None = Field(None, description="The RGB color value (e.g., #b40000)")
    price: float | None = Field(None, description="The price for this color variant in USD")


class BrickItem(BaseModel):
    """Model for a single brick item."""
    element_id: str = Field(..., description="The base LEGO element ID (like 3001, 3020)")
    brick_type: str = Field(..., description="The type/name of the brick (e.g., BRICK 2X4, PLATE 2X4)")
    num_colors: int = Field(0, description="The number of available colors for this brick")
    colors: list[ColorVariant] = Field(default=[], description="List of color variants")


# Known brick element IDs
BRICKS_TO_SCRAPE = [
    {"element_id": "3001", "name": "BRICK 2X4"},
    {"element_id": "3004", "name": "BRICK 1X2"},
    {"element_id": "3005", "name": "BRICK 1X1"},
    {"element_id": "3010", "name": "BRICK 1X4"},
    {"element_id": "3622", "name": "BRICK 1X3"},
    {"element_id": "3020", "name": "PLATE 2X4"},
    {"element_id": "3023", "name": "PLATE 1X2"},
    {"element_id": "3024", "name": "PLATE 1X1"},
    {"element_id": "3623", "name": "PLATE 1X3"},
    {"element_id": "3710", "name": "PLATE 1X4"},
]


async def scrape_brick_colors(stagehand, base_element_id: str, brick_name: str) -> BrickItem:
    """Scrape colors for a single brick type by clicking each color."""
    
    # Navigate directly to the brick's page
    url = f"https://www.lego.com/en-us/pick-and-build/pick-a-brick?query={base_element_id}"
    print(f"  Loading: {url}")
    await stagehand.page.goto(url)
    await asyncio.sleep(4)
    
    # Click on the brick to show colors
    print(f"  Clicking on brick...")
    click_result = await stagehand.page.evaluate("""
        () => {
            const btn = document.querySelector('[data-test="pab-item-button"]');
            if (btn) {
                btn.click();
                return {success: true};
            }
            return {success: false};
        }
    """)
    
    if not click_result.get('success'):
        print(f"  ✗ Could not find/click button")
        return BrickItem(element_id=base_element_id, brick_type=brick_name, num_colors=0, colors=[])
    
    await asyncio.sleep(6)  # Wait for colors to load
    
    # Get basic info about all colors (name and RGB)
    print(f"  Getting color information...")
    colors_basic = await stagehand.page.evaluate("""
        () => {
            const colorButtons = document.querySelectorAll('button[class*="color"]');
            const colors = [];
            
            colorButtons.forEach((btn, index) => {
                const colorName = btn.getAttribute('aria-label') || btn.getAttribute('title');
                const colorBlock = btn.querySelector('[data-test="pab-element-modal-color-block"]');
                
                let rgb = null;
                if (colorBlock) {
                    const bgColor = window.getComputedStyle(colorBlock).backgroundColor;
                    if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)') {
                        const rgbMatch = bgColor.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
                        if (rgbMatch) {
                            const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
                            const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
                            const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
                            rgb = `#${r}${g}${b}`;
                        }
                    }
                }
                
                if (colorName) {
                    colors.push({
                        index: index,
                        color_name: colorName,
                        rgb: rgb
                    });
                }
            });
            
            return colors;
        }
    """)
    
    if not colors_basic:
        print(f"  ✗ No colors found")
        return BrickItem(element_id=base_element_id, brick_type=brick_name, num_colors=0, colors=[])
    
    print(f"  Found {len(colors_basic)} colors, now clicking each to get Element ID and price...")
    
    # Now click each color to get Element ID and price
    all_colors = []
    for color_info in colors_basic:
        try:
            # Click the color button by index
            click_color_result = await stagehand.page.evaluate(f"""
                () => {{
                    const colorButtons = document.querySelectorAll('button[class*="color"]');
                    const btn = colorButtons[{color_info['index']}];
                    if (btn) {{
                        btn.click();
                        return {{success: true}};
                    }}
                    return {{success: false}};
                }}
            """)
            
            if not click_color_result.get('success'):
                print(f"    ✗ Could not click {color_info['color_name']}")
                continue
            
            # Wait a bit for the page to update
            await asyncio.sleep(1.5)
            
            # Extract Element ID from URL and price from page
            color_details = await stagehand.page.evaluate("""
                () => {
                    // Get Element ID from URL
                    const urlMatch = window.location.href.match(/selectedElement=(\\d+)/);
                    const elementId = urlMatch ? urlMatch[1] : null;
                    
                    // Get price
                    const priceEl = document.querySelector('[data-test="pab-item-price"]');
                    let price = null;
                    if (priceEl) {
                        const priceText = priceEl.textContent.trim();
                        const priceMatch = priceText.match(/\\$([\\d.]+)/);
                        price = priceMatch ? parseFloat(priceMatch[1]) : null;
                    }
                    
                    return {elementId, price};
                }
            """)
            
            if color_details.get('elementId'):
                all_colors.append(ColorVariant(
                    color_name=color_info['color_name'],
                    element_id=color_details['elementId'],
                    rgb=color_info['rgb'],
                    price=color_details.get('price')
                ))
                print(f"    ✓ {color_info['color_name']}: ID={color_details['elementId']}, Price=${color_details.get('price')}")
            else:
                print(f"    ✗ {color_info['color_name']}: Could not get Element ID")
                
        except Exception as e:
            print(f"    ✗ Error with {color_info['color_name']}: {e}")
            continue
    
    if all_colors:
        return BrickItem(
            element_id=base_element_id,
            brick_type=brick_name,
            num_colors=len(all_colors),
            colors=all_colors
        )
    
    return BrickItem(element_id=base_element_id, brick_type=brick_name, num_colors=0, colors=[])


async def main():
    """Main entry point."""
    print("=" * 70)
    print("LEGO Pick a Brick - Final Scraper")
    print("Clicks each color to extract Element ID and Price")
    print("=" * 70)
    
    required_vars = ["BROWSERBASE_API_KEY", "BROWSERBASE_PROJECT_ID", "OPENAI_API_KEY"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"\nError: Missing environment variables: {', '.join(missing_vars)}")
        return
    
    print("\n✓ All required environment variables are set\n")
    
    stagehand = None
    all_bricks = []
    
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
        
        print(f"View browser: https://www.browserbase.com/sessions/{stagehand.session_id}")
        print(f"Note: This will take a while as we click each color individually!\n")
        
        for idx, brick_info in enumerate(BRICKS_TO_SCRAPE, 1):
            print(f"\n{'='*70}")
            print(f"[{idx}/{len(BRICKS_TO_SCRAPE)}] {brick_info['name']} (Element ID: {brick_info['element_id']})")
            print(f"{'='*70}")
            
            try:
                brick_data = await scrape_brick_colors(stagehand, brick_info['element_id'], brick_info['name'])
                all_bricks.append(brick_data)
                
                if brick_data.colors:
                    print(f"\n  ✓ Successfully scraped {len(brick_data.colors)} colors!")
                else:
                    print(f"\n  ✗ No colors extracted")
                    
            except Exception as e:
                print(f"\n  ✗ Error: {e}")
                all_bricks.append(BrickItem(
                    element_id=brick_info['element_id'],
                    brick_type=brick_info['name'],
                    num_colors=0,
                    colors=[]
                ))
        
        # Save results
        output_file = os.path.join(os.path.dirname(__file__), "bricks_and_plates.json")
        bricks_data = [brick.model_dump() for brick in all_bricks]
        
        with open(output_file, 'w') as f:
            json.dump(bricks_data, f, indent=2)
        
        print(f"\n\n{'=' * 70}")
        print(f"COMPLETE!")
        print(f"{'=' * 70}")
        print(f"Results saved to: {output_file}")
        print(f"Total bricks processed: {len(all_bricks)}")
        print(f"Bricks with colors: {sum(1 for b in all_bricks if b.num_colors > 0)}")
        print(f"Total colors extracted: {sum(b.num_colors for b in all_bricks)}")
        print("=" * 70)
        
    finally:
        if stagehand:
            await stagehand.close()


if __name__ == "__main__":
    asyncio.run(main())

