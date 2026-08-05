# Notion Iconiser

A browser-based tool that turns a square image into a neutral-grey PNG icon with a transparent background.

## Architecture

The application deliberately uses native browser technologies and has no build step:

```text
.
├── index.html
└── assets
    ├── scripts
    │   ├── app.js             # Application controller and workflow
    │   ├── config.js          # Product copy, timings, and configuration
    │   ├── dom.js             # Required DOM element lookup
    │   ├── image-processor.js # Validation and image transformations
    │   ├── motion.js          # Layout transition primitives
    │   └── view.js            # DOM rendering and event bindings
    └── styles
        └── main.css           # Tokens, layout, components, and states
```

The modules follow a small separation-of-concerns boundary:

- `app.js` coordinates the workflow but does not implement rendering or image algorithms.
- `view.js` owns DOM updates and browser events.
- `image-processor.js` owns file validation, background removal, and pixel colourisation.
- `motion.js` owns position-based animations.
- `config.js` provides a single source of truth for copy and timings.

## Run locally

ES modules require the project to be served over HTTP. From the repository root, run any static file server, for example:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Runtime dependency

Background removal is loaded as an ES module from the jsDelivr CDN:

```text
@imgly/background-removal
```

Image processing runs locally in the browser; the selected image is not uploaded to an application server.
