# PB and Jay 🥜📜
_A Modern React-based Play-by-Post D&D Campaign Platform_

PB and Jay is a solo-friendly, AI-assisted play-by-post (PBP) platform for running D&D-style adventures online. Inspired by classic PBP communities like WoldianGames, this project modernizes the experience using React, modular design, and optional API integrations.

---

## 🚀 Features (Planned)

- 🎭 **Character Panels** – Manage 5 active characters, view stats, class info, and updates.
- 📜 **Post Board** – Turn-based PBP thread simulation.
- 🧠 **AI Dungeon Master (coming soon)** – GPT-style module response engine.
- 🧩 **Module Builder** – Drag-and-drop templates and editable module zones.
- 📘 **Site-Opedia** – All posts, changes, and story state saved as a persistent knowledge base.
- 🪄 **D&D 5e API Integration** – Pull live data for classes, monsters, spells, etc.

---

## 🏗️ Project Structure

```bash
pb-and-jay/
├── public/                # Static assets
├── src/
│   ├── assets/            # Images, icons, etc.
│   ├── components/        # UI components (CharacterPanel, PostBoard, etc.)
│   ├── pages/             # Page-level routes (Home, GameThread, etc.)
│   ├── services/          # API logic (dndAPI.js, AI hooks)
│   ├── data/              # Mock or seed data
│   ├── styles/            # Global CSS or modules
│   ├── App.jsx            # Main app layout
│   └── main.jsx           # Entry point
├── index.html
├── vite.config.js
└── package.json