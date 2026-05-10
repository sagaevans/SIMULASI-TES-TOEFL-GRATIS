# TOEFL ITP-like Practice Website

An open-source TOEFL ITP-like practice website for academic English learning and graduation preparation.

Created by **Nas**.

## Overview

This project is designed to help students practice for TOEFL ITP-like tests commonly used for university graduation, thesis requirements, or academic English preparation.

The website runs as a static web application, so it can be hosted on GitHub Pages and does not require a backend server.

## Features

- Listening Comprehension practice
- Structure & Written Expression practice
- Reading Comprehension practice
- Full Test Mode
- Browser Text-to-Speech for Listening
- Timer for each section
- Auto submit when time is up
- Required answers before manual submit
- Stop Test option
- Restart same questions
- Retry with shuffled questions
- Automatic scoring
- Estimated TOEFL ITP-like score
- JSON-based question bank
- GitHub Pages ready

## TOEFL ITP-like Test Format

The full TOEFL ITP Level 1 format generally consists of:

| Section | Number of Questions | Time |
|---|---:|---:|
| Listening Comprehension | 50 questions | ±35 minutes |
| Structure & Written Expression | 40 questions | 25 minutes |
| Reading Comprehension | 50 questions | 55 minutes |
| **Total** | **140 questions** | **±115 minutes** |

This project currently uses a smaller demo bank:

| Section | Current Demo Questions |
|---|---:|
| Listening | 10 questions |
| Structure | 10 questions |
| Reading | 10 questions |
| **Total** | **30 questions** |

The question bank can be expanded gradually to match the full TOEFL ITP-like format.

## Sections

### 1. Listening Comprehension

The Listening section uses browser-based Text-to-Speech.

Current sample content includes:

- Conversations
- Short talks
- Multiple-choice questions
- Automatic answer checking
- Explanations

Because the audio uses the browser's built-in speech engine, the voice quality may vary depending on the user's browser and device.

### 2. Structure & Written Expression

The Structure section includes:

- Sentence completion
- Error identification
- Grammar-focused explanations

Example topics:

- Subject-verb agreement
- Passive voice
- Prepositions
- Conjunctions
- Parallel structure
- Past participle
- Reduced clauses
- Inversion

### 3. Reading Comprehension

The Reading section includes:

- Academic-style passages
- Main idea questions
- Detail questions
- Inference questions
- Vocabulary-in-context questions
- Author's purpose questions

## Full Test Mode

Full Test Mode allows users to complete sections in sequence:

```text
Listening → Structure → Reading → Final Result

During Full Test Mode:

Section buttons are locked while the test is running.
Users must complete the current section before moving to the next section.
The timer runs independently for each section.
Final results show section scores, total correct answers, accuracy, and estimated TOEFL ITP-like score.
Estimated TOEFL ITP-like Score

The website provides an estimated TOEFL ITP-like score using a simplified conversion method.

Estimated section scale:

Listening: 31–68
Structure: 31–68
Reading: 31–67

Estimated total score:

((Listening Scale + Structure Scale + Reading Scale) × 10) / 3

Estimated level:

Estimated Score	Level
Below 343	Below A2 / Basic
343–432	A2 / Elementary
433–542	B1 / Intermediate
543–619	B2 / Upper Intermediate
620–677	C1 / Advanced

Important Disclaimer

This project is an unofficial TOEFL ITP-like practice tool.

It is not affiliated with, endorsed by, or sponsored by ETS.

All questions are original and created for educational practice. The estimated score is for practice purposes only and does not use the official ETS conversion table.

Project Structure
toefl-itp-practice/
├── index.html
├── admin.html
├── README.md
│
├── css/
│   ├── style.css
│   └── admin.css
│
├── js/
│   ├── app.js
│   ├── admin.js
│   ├── tts.js
│   ├── timer.js
│   ├── scoring.js
│   └── storage.js
│
└── data/
    ├── listening-set-1.json
    ├── structure-set-1.json
    └── reading-set-1.json
How to Run Locally

Because this project loads JSON files using fetch(), it is recommended to run it with a local server.

Option 1: VS Code Live Server
Open the project folder in VS Code.
Install the Live Server extension.
Right-click index.html.
Click Open with Live Server.
Option 2: GitHub Pages

This project is ready to be hosted with GitHub Pages.

Recommended settings:

Branch: main
Folder: /root
Question Bank Format

Question data is stored in JSON files inside the data/ folder.

Listening
{
  "id": "L-AUDIO-001",
  "type": "conversation",
  "title": "Conversation title",
  "ttsText": "Listening script here...",
  "questions": [
    {
      "id": "L001",
      "question": "Question text",
      "choices": ["A", "B", "C", "D"],
      "answer": 0,
      "explanation": "Explanation here"
    }
  ]
}
Structure
{
  "id": "S001",
  "type": "sentence-completion",
  "topic": "Subject-verb agreement",
  "question": "Question text",
  "choices": ["A", "B", "C", "D"],
  "answer": 1,
  "explanation": "Explanation here"
}
Reading
{
  "id": "R-PASSAGE-001",
  "title": "Passage title",
  "passage": "Passage text here...",
  "questions": [
    {
      "id": "R001",
      "type": "main-idea",
      "question": "Question text",
      "choices": ["A", "B", "C", "D"],
      "answer": 0,
      "explanation": "Explanation here"
    }
  ]
}
Roadmap

Planned improvements:

Admin page for editing question banks
Import and export JSON question data
Larger question bank
Full TOEFL ITP-like set:
Listening: 50 questions
Structure: 40 questions
Reading: 50 questions
Improved result analysis
Optional dark mode
GitHub API save option for maintainers
Contact

Email: nasotp1@gmail.com

WhatsApp: 085692648378

License

This project is open source for educational purposes.


Setelah simpan:

```text
Ctrl + S

Lalu commit ke GitHub nanti:

git add .
git commit -m "Update README documentation"
git push