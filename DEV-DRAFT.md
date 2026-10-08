---
title: "Footpath Receipt: a field note, not a verdict"
published: false
tags: devchallenge, hf26challenge
---

_This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 1: Touch Grass](https://dev.to/challenges/hacktoberfest-week1-2026-10-05)._ 

## What I Built

Footpath Receipt is a small field-note organizer for things someone notices on a familiar block. You can jot observations in your own words—like a narrow footpath or a place without shade—and ask Gemma to arrange them into a short, editable draft.

Every generated observation must point back to an exact quote and note ID. The tool also leaves an “unknown / needs checking” section. It does not map a route, verify safety or accessibility, determine causes, or send anything to an authority. The person who took the notes remains responsible for reviewing the draft.

## Demo

TODO: Add a working demo URL or short video after testing. No demo link is available yet.

## Code

[Footpath Receipt on GitHub](https://github.com/aditya-mnnit/footpath-receipt) — repository created; code still needs to be committed and pushed.

## How I Built It

The app uses plain HTML, CSS, and JavaScript with a small Node.js built-in HTTP server. There is no framework, package installation, model download, database, account, GPS, or image upload. The server sends the user's notes and optional typed area label to Google's hosted Gemini API, using the open-weight `gemma-4-26b-a4b-it` model. The API key stays on the server.

The server checks that each cited note ID exists and its quote is present in the original note. That verifies only the citation string, not the accuracy of an observation or the model's interpretation. Automated tests cover input validation, source mapping, and malformed output. TODO: Run an actual inference and replace this note with the observed result before publishing.

## Why Does Open Innovation Matter?

Open-weight Gemma does the organizing, so people can inspect and adapt the model rather than treating a closed model as the only option. To keep setup small, this version uses Google's hosted Gemma API instead of asking someone to download model weights. That trade-off means a network request is required and the notes go to Google's API; this is not private local inference. The person still reviews the draft, because source quotes prove where text came from—not whether the observation or interpretation is true.

## Prize Categories

Best Use of Gemma — include this category only after a successful live inference with the documented Gemma 4 model. If that run cannot be verified, remove this category rather than claiming untested use.
