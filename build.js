#!/usr/bin/env node

const rollup = require("rollup");
const legacy = require("@rollup/plugin-legacy");

(async _ => {
	const bundle = await rollup.rollup({
		input: "src/index.js",
		plugins: [legacy({
			"./leapjs/leap-1.1.0.js": {
				Controller: "Leap.Controller",
				glMatrix: "Leap.glMatrix",
			},
		})],
	});
	await bundle.write({
		file: "out/webxr-leap-polyfill.js",
		format: "esm",
	});
})();
