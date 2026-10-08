# Footpath Receipt

A tiny field-note organizer for observations a person makes on one familiar block. Write short notes; Gemma organizes them into an editable draft, attaching each finding to an exact quote and note ID. It is not a map, accessibility/safety audit, fact checker, or way to send reports to authorities.

## Run locally

Requires Node.js 20 or newer. No framework, npm install, model download, database, or account.

```sh
node server.mjs
```

Open <http://localhost:4173>. To enable real model output, create a Gemini API key in Google AI Studio, then:

```sh
GEMINI_API_KEY="your-key" node server.mjs
```

The key stays in the server process and is never delivered to browser JavaScript. Do not commit it. Without the key, the app clearly reports that live Gemma is unavailable; it does not show mock AI output. Run unit tests with `npm test` (no dependencies are installed).

## Model and data handling

Live organization uses open-weight `gemma-4-26b-a4b-it` through Google's hosted Gemini API. Hosted inference avoids a local model download but needs internet and a key; this version does not run offline. Each generation request sends the notes and optional manually typed area label to Google's API. There is no GPS, image upload, account, browser persistence, tracking, or automatic sharing. You review/edit before copying or downloading.

The server validates that every cited note ID exists and that each quoted source string appears exactly in that note. This checks provenance—not whether the note is true, current, representative, or interpreted correctly. The model must state unverified details as unknowns, but its output still needs human review. Do not include sensitive personal information.

## Try it

1. Enter one or more things you personally noticed; optionally type an area label.
2. Generate the field receipt with a valid server-side API key.
3. Verify each quote against your original notes, edit the draft, and check the unknowns.
4. Copy or download only if the draft accurately represents what you observed.
5. Change a note: the previous output is immediately invalidated.

## Challenge submission status

Fresh project for Hacktoberfest 2026 Week 1 “Touch Grass”. Tests cover note input validation and citation mapping. Live model inference has not been confirmed unless run with a valid key. No user feedback, verified field audit, hosted demo, or published repository is claimed.
