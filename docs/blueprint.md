# **App Name**: Cartoon Linker

## Core Features:

- Cartoon Input: Input fields for cartoon title and episode count.
- Generate Queries: Builds search queries by combining the cartoon title with the episode number (plain code, no AI required).
- Fetch YouTube Links: Searches YouTube directly with youtube-sr (no API key required), then keeps videos at least 15 minutes long and excludes videos with unwanted keywords. All filtering happens locally in code.
- Display Episodes: Displays a list of cartoon episodes with the episode number, video duration, thumbnail, and video link.
- Export and Share: Offers buttons to download results as a PDF, copy all links, and share the result by generating a direct link containing the search query.
- Loading Status: Show loading status for each episode as "Searching" then "Done". Also shows the loading progress bar during the fetching.

## Style Guidelines:

- Primary color: Soft blue (#64B5F6) to reflect the playful yet reliable nature of cartoon watching.
- Background color: Light blue (#E3F2FD) to create a calming and visually appealing environment.
- Accent color: Pale purple (#9575CD) to highlight interactive elements and important information.
- Body and headline font: 'PT Sans', a humanist sans-serif, for a clean and modern look suitable for all text elements.
- Simple and friendly icons for actions like downloading, copying, and sharing.
- Clean and intuitive layout that focuses on providing the core functionality without distractions.
- Subtle animations during the loading and fetching processes to keep users engaged.