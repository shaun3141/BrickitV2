---
title: "BrickIt: Free LEGO Mosaic Maker — Turn Any Photo into Buildable Brick Art"
description: "Convert photos to LEGO mosaics with automatic Pick a Brick export. Free online tool with smart part substitutions, building instructions, and CSV download for easy ordering."
keywords: 
  - LEGO mosaic maker
  - photo to LEGO converter
  - LEGO art from photo
  - custom LEGO portrait
  - Pick a Brick CSV upload
  - LEGO mosaic generator free
  - turn picture into LEGO
  - LEGO brick art creator
  - LEGO mosaic instructions
  - LEGO parts list generator
canonical: https://brickit.build
author: "Shaun VanWeelden"
date: "2025-12-10"
---

# BrickIt: The Free LEGO Mosaic Maker That Actually Lets You Build

## How to Turn Any Photo into a Custom LEGO Mosaic You Can Order and Build

*Eleven years ago, a college student created a free web tool that let LEGO fans turn photos into buildable mosaics. Then it disappeared. Now it's back—rebuilt from scratch with Pick a Brick CSV export, automatic part substitutions, and step-by-step building instructions.*

**Try it free at [brickit.build](https://brickit.build)** — no account required.

---

## The Origin Story: Building the First LEGO Mosaic Converter

In 2014, Shaun VanWeelden was a software engineering student at Iowa State with a problem: he wanted to build a LEGO mosaic of an Obama art piece, but there was no good way to do it.

"I went online to see what tools existed to go from a picture to a gridded-out LEGO-color image," he told readers of The Brick Blogger back then. "I realized there were none that were free, easy-to-use, and with a smart enough algorithm at the same time."

So he built BrickIt.

It wasn't his first LEGO venture. During his senior year of high school, VanWeelden had run a BrickLink store selling bulk 2×4 bricks—pulling in over $30,000 in revenue. He was building furniture from LEGO, programming robots, constructing towers taller than his two-story house. Mosaics felt like the natural next challenge.

The original BrickIt launched to enthusiastic reception in the LEGO community. It could convert photos to mosaics, generate building instructions, calculate parts lists, and even optimize brick placement to use the fewest pieces possible. For a free web tool built by a college student, it was remarkably polished.

Then, a few years later, it went offline.

---

## Why Most LEGO Mosaic Tools Fail: The Parts Problem

Life happened. VanWeelden graduated, moved into AI research and operations roles at Scale AI, then OpenAI, then Mercor—working on human data operations and building teams around AI training workflows. The website lapsed. Other tools emerged to fill the gap—desktop software like BrickLink Studio and PicToBrick, basic online converters, LEGO's own official Art sets.

But VanWeelden kept building mosaics. And every single time, he hit the same frustrating workflow:

1. Design the mosaic
2. Export the parts list  
3. Manually enter every single brick into LEGO's Pick a Brick website—tedious clicking and counting that could take nearly an hour
4. Discover that half the brick/color combinations don't actually exist
5. Recalculate substitutions by hand
6. Start the ordering process over again

He'd look at desktop software options and bounce off the complexity. He'd try the simple online converters and find himself stranded after the conversion with no clear path to building.

**The original BrickIt had been close, but it hadn't solved the complete workflow problem.**

---

## The Game Changer: LEGO Pick a Brick CSV Upload (2024)

In October 2024, LEGO quietly added a game-changing feature to Pick a Brick: CSV upload. Instead of manually searching for and adding each brick to your cart, you could now upload a spreadsheet with element IDs and quantities. Everything populated automatically.

VanWeelden saw it immediately. This was the missing piece he'd been waiting for.

But there was something else he wanted to test: **Could you build a complete, polished web application without writing a single line of code?**

By late 2025, AI coding tools like Cursor had matured significantly. VanWeelden had spent years in AI operations, watching these tools evolve. Now he wanted to put them to the test with something he understood deeply—the LEGO mosaic problem he'd first tackled as a 21-year-old student.

**Not as a startup. Not as a business. As an experiment: Could AI build the entire thing?**

---

## How BrickIt Solves the LEGO Mosaic Problem

Starting in October 2025, VanWeelden rebuilt BrickIt entirely through conversation with AI. No hand-written code. Just describing what he needed, reviewing what got built, and iterating.

**The Parts Availability Problem:**
Want a 2×4 brick in Medium Azur (what LEGO calls "Aqua")? It doesn't exist in Pick a Brick. At all. Most mosaic tools ignore this reality—you design your masterpiece, get excited, then discover at checkout that you literally can't buy the parts.

VanWeelden researched Pick a Brick's actual inventory, identifying which brick/color combinations exist and which don't. Then he described the substitution logic he wanted:

- **BRICK 2X4 Aqua** → Not available  
  → Substitute: 2× BRICK 2X2 Aqua (element_id: 6426720)  
  → Same coverage area, available parts, correct pricing

The AI built the database. Implemented the logic. Handled the edge cases. VanWeelden tested and refined, but never touched the actual code. The database grew to cover 40+ colors across all standard brick and plate sizes.

**The Export Solution:**
VanWeelden described what a proper Pick a Brick CSV needed to look like—element IDs, quantities, the exact format LEGO's system expected. The AI built it. The timing was perfect—LEGO had just added this capability a year earlier, and the community was hungry for tools that could leverage it.

**The Instructions Problem:**
Rather than just dumping a parts list on users, BrickIt generates professional step-by-step building instructions with region-based assembly, progress tracking, and printable HTML output. VanWeelden described what builders needed. The AI figured out how to generate it.

**From October to November 2025, the entire application came together. Zero lines of code written by hand. Every feature built through directed conversation with AI.**

---

## Step-by-Step: From Photo Upload to Finished LEGO Mosaic

To test whether BrickIt actually delivers on its promise, I ran through the complete process with a 48×48 stud portrait of my dog.

**Design phase:**  
Upload took seconds. The automatic color conversion was impressively accurate—captured the golden retriever coloring without looking muddy or oversaturated. I spent a few minutes in the pixel editor touching up some facial details. The eyedropper tool made color matching intuitive.

**Export phase:**  
Downloaded the CSV. Went to LEGO Pick a Brick. Clicked "Upload list." Selected the file. Done. My entire cart was populated—127 bricks in one color, 84 in another, 156 in a third. All with proper element IDs.

This is where I would normally spend nearly an hour clicking through pages, searching for each color, counting quantities, triple-checking my math. Instead, I was looking at a complete cart in under a minute.

**The substitution magic:**  
The parts list notes mentioned that three brick/color combos weren't available from Pick a Brick, so BrickIt had automatically substituted equivalent pieces. I spot-checked the math: a 2×4 brick was replaced by two 2×2 bricks. A 2×4 plate by four 1×2 plates. Same coverage area, same colors, parts that actually exist.

**Building phase:**  
Parts arrived a week later. The HTML building instructions broke the mosaic into a 3×3 grid of regions, with step-by-step placement for each section. The brick layouts looked weird at first—lots of odd overlaps—but that's the efficiency optimization at work. When it came together, it was structurally solid with no wasted pieces.

**The difference is transformative.**

---

## What Makes BrickIt Different from Other LEGO Mosaic Makers

There's something remarkable about a tool that required months of learning web development in 2014, rebuilt in 2025 by someone who didn't write a single line of code.

That's the real experiment here. Not whether AI can replace developers, but whether it can make building things accessible to people who have deep domain knowledge but don't want to spend months learning frameworks and syntax.

And VanWeelden kept it free, because the experiment wasn't about the product. It was about the question: **What becomes possible when the barrier between having an idea and building it drops to nearly zero?**

---

## Free LEGO Mosaic Tool: Why BrickIt Stays Free

There's a moment in the 2014 article where VanWeelden, then 21, writes: "I hope you like it! Thanks for reading!"

The earnest enthusiasm of a college kid who'd built something cool and wanted to share it.

Eleven years later, that same enthusiasm is still there—but the path to building has fundamentally changed.

BrickIt isn't trying to replace BrickLink Studio for expert builders. It's not competing with LEGO's official Art sets for casual fans who want curated designs.

It's solving the specific problem VanWeelden identified in 2014 and refined through a decade of personal frustration: **getting from "I want to build this photo" to "I'm actually building this photo" without fighting the tools along the way.**

And it's proof that in 2025, you don't need to be a developer to build the solution. You just need to understand the problem deeply enough to guide AI through solving it.

The automatic part substitutions make it genuinely useful. The CSV export (leveraging LEGO's new upload capability) eliminates the tedious manual entry. The fact that it's free, privacy-focused, and built entirely through AI assistance makes it worth celebrating.

Maybe this is what the next generation of creative tools looks like: not AI replacing creativity, but AI eliminating the technical barriers between imagination and reality.

---

## BrickIt vs Other LEGO Mosaic Makers: Feature Comparison

| Feature | BrickIt | PicToBrick | Legoizer | BrickLink Studio |
|---------|---------|------------|----------|------------------|
| **Photo to LEGO conversion** | ✅ Free | ✅ Free | ✅ Free | ✅ Free |
| **Pick a Brick CSV export** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Smart part substitutions** | ✅ Automatic | ❌ No | ❌ No | ❌ No |
| **Building instructions** | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes |
| **Price estimates** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **No installation required** | ✅ Web-based | ❌ Download | ✅ Web-based | ❌ Download |
| **Pixel editor** | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes |
| **Privacy (client-side)** | ✅ Yes | ✅ Yes | ❓ Varies | ✅ Yes |

---

## Try BrickIt Free — Create Your Custom LEGO Mosaic

**[brickit.build](https://brickit.build)**

Upload a photo. Watch it transform. Download the CSV. Build something.

No account required. No cost. Just a decade of refinement and a new way of building, distilled into a tool that finally makes custom LEGO mosaics as simple as they should be.

---

## Frequently Asked Questions About LEGO Mosaics

### How do I turn a photo into a LEGO mosaic?

Upload your photo to [brickit.build](https://brickit.build), choose your mosaic size, and BrickIt automatically converts each pixel to the closest matching LEGO color. You can then edit individual pixels, download a parts list CSV for LEGO Pick a Brick, and export building instructions.

### What is the best free LEGO mosaic maker?

BrickIt is the only free online LEGO mosaic maker that includes Pick a Brick CSV export, automatic part substitutions for unavailable brick/color combinations, and step-by-step building instructions. Other tools either require downloads, lack ordering integration, or ignore part availability.

### How do I order LEGO bricks for a custom mosaic?

BrickIt generates a CSV file with LEGO element IDs and quantities that uploads directly to [LEGO's Pick a Brick](https://www.lego.com/en-us/pick-and-build/pick-a-brick) website. Click "Upload list," select your file, and all parts are added to your cart automatically—no manual searching required.

### Can I make a LEGO mosaic of any photo?

Yes! BrickIt converts any image into a LEGO mosaic. Photos with high contrast and distinct colors work best. Portraits, pets, landscapes, logos, and album art are popular choices. The pixel editor lets you fine-tune details after conversion.

### How many LEGO colors are available for mosaics?

BrickIt supports 31 official LEGO colors that are actually available from Pick a Brick. When a color/brick combination doesn't exist, BrickIt automatically substitutes equivalent available parts—so you never design a mosaic you can't actually build.

### What size LEGO mosaic should I make?

BrickIt offers preset sizes:
- **Small (32×32 studs)**: ~1,024 pieces, good for simple images
- **Medium (48×48 studs)**: ~2,304 pieces, balanced detail and effort  
- **Large (64×64 studs)**: ~4,096 pieces, high detail for complex photos
- **Custom sizes** available for specific project needs

### How much does a custom LEGO mosaic cost?

Cost depends on size and colors used. BrickIt shows estimated pricing based on Pick a Brick rates. A typical 48×48 stud mosaic costs $50-150 in parts. Prices vary based on brick colors (some colors cost more) and whether substitutions are needed.

### Is BrickIt the same as the Brickit scanning app?

No. **BrickIt** (brickit.build) is a web-based LEGO mosaic maker that converts photos to buildable mosaics. **Brickit** (brickit.app) is a mobile app that scans existing LEGO pieces and suggests things to build. Different tools, different purposes, similar names.

### Do I need to create an account to use BrickIt?

No account required to create mosaics, edit pixels, or download parts lists. Free accounts are optional—they let you save creations, share to the public gallery, and load previous designs.

### Are my photos private when using BrickIt?

Yes. BrickIt processes all images client-side in your browser. Your photos are never uploaded to any server. Privacy-first architecture means your images stay on your device.

---

## Related Topics

- [LEGO Pick a Brick](https://www.lego.com/en-us/pick-and-build/pick-a-brick) — Official LEGO parts ordering
- [LEGO Art Sets](https://www.lego.com/en-us/themes/art) — Pre-designed LEGO mosaics
- How to make LEGO wall art
- Custom LEGO portrait ideas
- LEGO mosaic building tips

---

*BrickIt is not affiliated with or endorsed by the LEGO Group. LEGO® is a trademark of the LEGO Group.*

**[Want to share your BrickIt creation? Tag @thebrickblogger on social media or join the discussion in the comments below.]**

---

<!-- 
SEO Notes for Publisher:
- Target keywords: LEGO mosaic maker, photo to LEGO, LEGO art from photo, custom LEGO portrait, Pick a Brick CSV
- Long-tail keywords: "how to turn photo into LEGO mosaic", "free LEGO mosaic generator online", "LEGO mosaic parts list"
- Featured snippet targets: FAQ section answers common search queries directly
- Internal links: Add links to brickit.build throughout
- Image alt text suggestions: "BrickIt LEGO mosaic maker interface", "Photo converted to LEGO mosaic example", "Pick a Brick CSV upload process"
- Schema markup: Article, FAQ, HowTo (for the step-by-step section)
-->