import {Controller} from "./leapjs/leap-1.1.0.min.js";

if("xr" in navigator){
	const original = navigator.xr.requestSession.bind(navigator.xr);
	navigator.xr.requestSession = async function(mode, options = {}){

		let featureRequested = false;


		//strip "hand-tracking" from feature lists to prevent warnings and errors
		const featureName = "hand-tracking";

		if(options.optionalFeatures && options.optionalFeatures.includes(featureName)){
			const index = options.optionalFeatures.indexOf(featureName);
			if(index != -1){
				options.optionalFeatures.splice(index, 1);
				featureRequested = true;
			}
		}
		if(options.requiredFeatures && options.requiredFeatures.includes(featureName)){
			const index = options.requiredFeatures.indexOf(featureName);
			if(index != -1){
				options.requiredFeatures.splice(index, 1);
				featureRequested = true;
			}
		}

		const xrSession = await original(mode, options);

		if(featureRequested){
			const controller = new Controller();
			controller.loop(frame => {

			});
			Object.defineProperty(xrSession, "inputSources", {
				get: _ => {
					return [];
				}
			});
			console.log(xrSession);
		}
		return xrSession;
	}
}
