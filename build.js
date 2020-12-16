#!/usr/bin/env node

const rollup = require("rollup");

(async _ => {
	const bundle = await rollup.rollup({
		input: "index.js",
	});
	await bundle.write({
		file: "out/webxr-leap-polyfill.js",
		format: "esm",
	});
})();
