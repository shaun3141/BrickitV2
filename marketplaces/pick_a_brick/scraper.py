"""
Scraper for LEGO Pick a Brick to extract 2x4 brick item IDs and colors.
Uses BrowserBase Stagehand for browser automation.
"""

import asyncio
import json
import os
from typing import List
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from stagehand import Stagehand, StagehandConfig

# Load environment variables from .env file
load_dotenv()


class ColorVariant(BaseModel):
    """Model for a single color variant of a brick."""
    color_name: str = Field(..., description="The color name (e.g., Bright Red, Dark Orange)")
    element_id: str | None = Field(None, description="The unique element ID for this color variant (e.g., 4114319)")
    rgb: str | None = Field(None, description="The RGB color value if available (e.g., #FF0000 or rgb(255,0,0))")
    price: float | None = Field(None, description="The price for this color variant in USD")


class BrickItem(BaseModel):
    """Model for a single brick item."""
    element_id: str = Field(..., description="The base LEGO element ID (like 3001, 3020)")
    brick_type: str = Field(..., description="The type/name of the brick (e.g., BRICK 2X4, PLATE 2X4)")
    num_colors: int = Field(0, description="The number of available colors for this brick")
    colors: list[ColorVariant] = Field(default=[], description="List of color variants with their unique element IDs, RGB values, and prices")


async def scrape_bricks_and_plates():
    """
    Scrape the LEGO Pick a Brick website for brick and plate item IDs and colors.
    
    Returns:
        List[BrickItem]: List of brick items with their IDs and colors
    """
    
    stagehand = None
    
    try:
        # Initialize Stagehand with configuration
        print("Initializing Stagehand...")
        config = StagehandConfig(
            env="BROWSERBASE",
            api_key=os.getenv("BROWSERBASE_API_KEY"),
            project_id=os.getenv("BROWSERBASE_PROJECT_ID"),
            model_name="openai/gpt-4o",  # Using GPT-4o for higher token limits
            model_api_key=os.getenv("OPENAI_API_KEY"),
        )
        stagehand = Stagehand(config)
        await stagehand.init()
        
        if stagehand.env == "BROWSERBASE":
            print(f"View your live browser: https://www.browserbase.com/sessions/{stagehand.session_id}")
        
        # Navigate to search results for bricks and plates
        print("Navigating to search results...")
        url = "https://www.lego.com/en-us/pick-and-build/pick-a-brick?query=brick%20OR%20plate"
        await stagehand.page.goto(url)
        
        # Wait for page to load
        print("Waiting for page to load...")
        await asyncio.sleep(8)  # Longer initial wait
        
        # Get unique brick types from the initial page
        print("Getting list of unique 2x4 brick types...")
        
        class BrickSummary(BaseModel):
            element_id: str = Field(..., description="The base LEGO element ID")
            brick_name: str = Field(..., description="The name of the brick type")
            num_colors_text: str = Field(..., description="Text showing number of colors like 'This element exists in 30 different colours'")
        
        class BricksList(BaseModel):
            bricks: List[BrickSummary] = Field(..., description="List of brick summaries")
        
        summary_result = await stagehand.page.extract(
            instruction="""Extract unique brick and plate types from the search results. 
            
            Focus on these specific sizes:
            - BRICK 1X1, BRICK 1X2, BRICK 1X3, BRICK 1X4, BRICK 2X4
            - PLATE 1X1, PLATE 1X2, PLATE 1X3, PLATE 1X4, PLATE 2X4
            
            For each brick/plate type, get:
            - The base element ID (like 3001, 3020, 3023, etc.)
            - The brick/plate name
            - The text showing how many colors exist
            
            Only list each brick type once - if you see multiple color variants of the same brick type, only extract it once.""",
            schema=BricksList
        )
        
        all_bricks_summary = summary_result.bricks if hasattr(summary_result, 'bricks') else []
        print(f"Found {len(all_bricks_summary)} unique brick types to process")
        
        # Now click on each brick to get its colors
        bricks_with_colors = []
        for idx, brick_summary in enumerate(all_bricks_summary, 1):  # Process all bricks
            print(f"\n[{idx}/{len(all_bricks_summary)}] Processing {brick_summary.brick_name} (Element ID: {brick_summary.element_id})...")
            
            try:
                # Click on the brick to open modal
                await stagehand.page.act(f"Click on the brick type '{brick_summary.brick_name}' with element ID {brick_summary.element_id}")
                await asyncio.sleep(5)  # Longer wait for modal to fully load
                
                # Extract ALL colors from the modal using JavaScript evaluation
                print("  Extracting colors from modal...")
                
                # Use JavaScript to extract data directly from DOM
                colors_data = await stagehand.page.evaluate("""
                    () => {
                        const colorButtons = document.querySelectorAll('[data-test="pab-item-button"]');
                        const colors = [];
                        
                        colorButtons.forEach(btn => {
                            const ariaLabel = btn.getAttribute('aria-label') || '';
                            const elementIdMatch = ariaLabel.match(/Element (\\d+)/);
                            const elementId = elementIdMatch ? elementIdMatch[1] : null;
                            
                            // Get price
                            const priceEl = btn.closest('div')?.querySelector('[data-test="price"]');
                            const priceText = priceEl?.textContent?.trim() || '';
                            const priceMatch = priceText.match(/\\$([\\d.]+)/);
                            const price = priceMatch ? parseFloat(priceMatch[1]) : null;
                            
                            if (elementId) {
                                colors.push({
                                    element_id: elementId,
                                    price: price
                                });
                            }
                        });
                        
                        return colors;
                    }
                """)
                
                # Now extract with schema for color names
                color_info = await stagehand.page.extract(
                    instruction="""Extract color information for each element ID shown in the modal. For each color variant button, get the color name from the visible text or image.""",
                    schema=BrickItem
                )
                
                # Merge data
                if colors_data and hasattr(color_info, 'colors'):
                    for i, color in enumerate(color_info.colors):
                        if i < len(colors_data):
                            color.element_id = colors_data[i]['element_id']
                            color.price = colors_data[i]['price']
                    colors_result = color_info
                else:
                    colors_result = color_info
                
                if hasattr(colors_result, 'colors') and colors_result.colors:
                    colors_result.num_colors = len(colors_result.colors)
                    bricks_with_colors.append(colors_result)
                    print(f"  ✓ Found {len(colors_result.colors)} colors")
                else:
                    # Fallback: just save the brick without colors
                    bricks_with_colors.append(BrickItem(
                        element_id=brick_summary.element_id,
                        brick_type=brick_summary.brick_name,
                        num_colors=0,
                        colors=[]
                    ))
                    print(f"  ✗ No colors extracted")
                
                # Close the modal
                await stagehand.page.act("Close the modal by clicking the X button")
                await asyncio.sleep(2)  # Wait before next brick
                
            except Exception as e:
                print(f"  ✗ Error processing brick: {e}")
                # Still add the brick without colors
                bricks_with_colors.append(BrickItem(
                    element_id=brick_summary.element_id,
                    brick_type=brick_summary.brick_name,
                    num_colors=0,
                    colors=[]
                ))
        
        bricks = bricks_with_colors
        
        print(f"\nSuccessfully processed {len(bricks)} brick types:")
        print("-" * 60)
        
        for brick in bricks:
            print(f"Element ID: {brick.element_id:<10} Type: {brick.brick_type} ({brick.num_colors} colors)")
            if brick.colors:
                for color in brick.colors[:5]:  # Show first 5 colors as sample
                    price_str = f"${color.price:.2f}" if color.price else "N/A"
                    rgb_str = color.rgb if color.rgb else "N/A"
                    print(f"  • {color.color_name:<25} ID: {color.element_id:<10} RGB: {rgb_str:<10} Price: {price_str}")
                if len(brick.colors) > 5:
                    print(f"  ... and {len(brick.colors) - 5} more colors")
        
        return bricks
        
    except Exception as e:
        print(f"Error during scraping: {e}")
        return []
        
    finally:
        if stagehand:
            print("\nClosing browser session...")
            await stagehand.close()


async def save_results(bricks: List[BrickItem], filename: str = "bricks_and_plates.json"):
    """Save scraped bricks to a JSON file."""
    output_file = os.path.join(os.path.dirname(__file__), filename)
    
    bricks_data = [brick.model_dump() for brick in bricks]
    
    with open(output_file, 'w') as f:
        json.dump(bricks_data, f, indent=2)
    
    print(f"\nResults saved to: {output_file}")


async def main():
    """Main entry point."""
    print("=" * 60)
    print("LEGO Pick a Brick - Brick & Plate Scraper")
    print("=" * 60)
    
    # Check for required environment variables
    required_vars = ["BROWSERBASE_API_KEY", "BROWSERBASE_PROJECT_ID", "OPENAI_API_KEY"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"\nWarning: Missing environment variables: {', '.join(missing_vars)}")
        print("Make sure to set these in your .env file or environment.")
        print()
    else:
        print("\n✓ All required environment variables are set")
        print()
    
    # Scrape the bricks
    bricks = await scrape_bricks_and_plates()
    
    # Save results
    if bricks:
        await save_results(bricks)
    
    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(main())
