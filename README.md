# QVAC OfficePilot

**OfficePilot** is a local-first employee work-report assistant powered by Tether's QVAC SDK.

An employee enters a rough daily update. QVAC runs a local language model and turns it into a structured report with:

- Completed work
- Pending work
- Priorities
- Blockers
- Manager note

## QVAC requirement

This project declares:

```json
"@qvac/sdk": "0.20.0"
```

It uses:

- `loadModel()`
- `completion()`
- `unloadModel()`

No cloud AI API is used for inference.

## Run

Requirements: Node.js 22+ and npm.

```bash
npm install
npm start
```

Open `http://localhost:3000`.

The first generation downloads the QVAC model. Subsequent generations reuse the local model cache.

## Example

Enter:

> Finished login module. Started dashboard testing. Database connection is failing and I need to discuss the API issue with Rahul tomorrow.

OfficePilot generates a structured work report and identifies completed work, pending items, priorities and blockers.

## Privacy

The application is designed for local inference through QVAC. It does not send employee work updates to a cloud AI API. The initial model download requires internet access.

## License

Apache License 2.0.

## Project Status

OfficePilot is a working local-first employee work report assistant powered by Tether QVAC.
