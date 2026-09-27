# ComicCraft Studio

A colorful upgraded version of the original ComicCraft project.

## Main features

- Gemini-powered comic story generation
- Structured JSON story output
- Pollinations image generation
- 3–6 comic panels
- Genre, mood, art style and language controls
- Main character + side character inputs
- Adventure / Mystery / Fantasy / Sci-Fi presets
- Random story idea button
- Dark / light theme
- API key save / clear / show-hide
- Loading progress animation
- Regenerate individual panel artwork
- Story copy button
- Export comic as standalone HTML
- Browser print support
- Local story history
- Favorite stories
- Demo mode without Gemini API
- Responsive mobile layout

## Folder

comiccraft-studio/
  index.html
  styles.css
  script.js
  README.md

## Run

1. Put all four files in one folder.
2. Open `index.html` in Chrome or Edge.
3. Get a Gemini API key from Google AI Studio.
4. Paste the key into the app and click Save key.
5. Enter a story idea.
6. Choose genre, mood, art style, language and number of panels.
7. Click Generate My Comic.

## Important API-key note

This is a browser-only college-project demo. The Gemini API key is stored in localStorage, which is convenient for a demo but is NOT the recommended architecture for a public production application.

For a real deployed application:
- keep the API key on a backend/server
- send requests from your frontend to your backend
- add authentication/rate limiting
- validate user input on the server
- never commit secrets to GitHub

## Demo mode

Use "Try a demo without API" to test the interface and story flow without a Gemini key. Artwork still uses the image service.

## Current Gemini model

The project uses `gemini-3.8-flash`, matching Google's current API examples at the time this project was prepared.
