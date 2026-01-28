# Learn About Roxy: The GovCon Expert AI

> *"If you want to win a federal contract, you don't just need a writer. You need a strategist who knows the difference between 'good' and 'compliant'."*

Welcome to **GovDevPro (Project Roxy)**. This isn't just a chatbot; it's a sophisticated, context-aware AI system designed to act as a Senior Proposal Strategist for government contractors.

This document tells the story of how we built her, how she works under the hood, and the engineering battles we fought to make her "smart."

---

## 1. The High-Level Vision: More Than a Wrapper

Most AI hacks are just "wrappers" around ChatGPT. You send a prompt, you get text.

Roxy is different. She is an **Agentic System**.
- **She has Eyes:** She can see images (org charts, architecture diagrams).
- **She has Ears:** She listens to your "Company DNA" (your past performance, your discriminators).
- **She has Standards:** She refuses to write generic fluff. She uses a "Senior Evaluator" persona to grade her own work.

---

## 2. Technical Architecture: The "Brain" (Backend)

We built the backend using **Python** and **FastAPI**. Why? Because Python is the lingua franca of AI, and FastAPI gives us speed and automatic documentation.

### **The Core Components**
1.  **FastAPI Server (`/backend`)**: The central nervous system. It handles chat requests, file uploads, and memory retrieval.
2.  **Supabase (The Memory)**:
    *   We use **pgvector** to store "embeddings" (mathematical representations of text).
    *   When you upload a Past Performance citation, we don't just save the text; we turn it into vectors so Roxy can "remember" that time you built a bridge in Alaska when you ask about "cold weather logistics."
3.  **The "Senior Evaluator" Logic (`roxy.py`)**:
    *   This is where the magic happens. We didn't just tell the AI "be helpful."
    *   We hard-coded a **"Vocabulary & Tone Elevation"** protocol.
    *   If Roxy tries to say "We fix things fast," the system overrides it and forces her to say "**Accelerated Incident Response**."
    *   *Analogy:* It's like having a strict editor standing over a junior writer's shoulder, correcting their grammar in real-time.

### **Key Technical Decision: "Check Before You Start"**
We ran into a nightmare where the server would crash because of missing dependencies.
*   **The Fix:** We built a `verify-and-heal.sh` script.
*   **How it works:** Every time the server starts, it checks: *Do we have a Python environment? Are the libraries installed? Is the syntax valid?* If not, it **automatically fixes itself** (re-installs deps, rebuilds venv) before letting you down.

---

## 3. The Face: Frontend Architecture

The frontend is built with **Next.js 14** (App Router) & **Tailwind CSS**.

### **The "Premium" Aesthetic**
We didn't want a boring admin panel. We wanted it to feel like *Minority Report*.
- **Silver/Chrome Theme:** We used custom CSS gradients to create a "shimmering silver" border effect.
- **Glassmorphism:** Panels have a frosted glass look (`backdrop-filter: blur`).
- **Typography:** We use `Inter` for clean readability but forced specific line-heights and margins to prevent the "Wall of Text" fatigue common in AI chats.

---

## 4. Engineering Lessons & War Stories

Building Roxy wasn't a straight line. Here are the walls we hit and how we broke through them.

### **Lesson 1: The "It Works On My Machine" Trap**
*   **The Problem:** The backend would run fine for me but crash for you because of a Python path issue or a missing `venv`.
*   **The Solution:** **Aggressive Self-Healing.**
    *   We stopped trusting the environment. We wrote scripts (`verify-and-heal.sh`) that assume everything is broken and fix it from scratch every time.
    *   *Takeaway:* Good engineering isn't about assuming things go right; it's about building systems that handle things going wrong.

### **Lesson 2: The "Dumb AI" Problem**
*   **The Problem:** Early versions of Roxy sounded like a generic sales brochure. She used phrases like "We are excited to help."
*   **The Solution:** **Persona Engineering.**
    *   We didn't just prompt better; we gave her a *negative* constraints list. "Do NOT use performative enthusiasm."
    *   We fed her a "Knowledge Base" (`GOVCON_EXPERTISE` string) containing definitions of FAR clauses, IDIQ structures, and evaluation criteria. She now "knows" things she wasn't trained on by OpenAI.

### **Lesson 3: Formatting is UX**
*   **The Problem:** Roxy would output great content, but it looked looked like a mess—loose lists, broken tables, giant gaps between paragraphs.
*   **The Solution:**
    *   We fought a war with CSS. We realized that standard HTML rendering isn't enough for chat.
    *   We wrote custom overrides for `.prose li`, `.prose table`, and `.prose blockquote`.
    *   We even forced the AI to normalize whitespace (`white-space: normal !important`) to fix a bug where numbered lists would break onto new lines.

---

## 5. How to Read the Code

If you want to dive in, start here:

1.  **The Brain:** `backend/app/prompts/roxy.py`
    *   Read this file. It contains the soul of the AI—her persona, her rules, and her knowledge base.
2.  **The Body:** `backend/app/routes/chat.py`
    *   See how we handle the message loop, inject context, and stream the response back.
3.  **The Self-Healing:** `verify-and-heal.sh`
    *   Read this to see how to write robust shell scripts that protect your application deployment.

---

## 6. What's Next?

Roxy is smart, but she's about to get smarter.
- **Proposal Generation:** We want her to write full .docx files, not just chat text.
- **Competitor Analysis:** We plan to feed her publicly available competitor data so she can "ghost" (write against) specific rivals.

Welcome to the team. You're building the future of government contracting.
