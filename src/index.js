import {Controller} from "../leapjs/leap-1.1.0.min.js";
import PfXRInputSource from "./XRInputSource.js";
import PfXRSpace from "./XRSpace.js";
import PfXRPose from "./XRPose.js";

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
			const leftInputSource = new PfXRInputSource();
			const rightInputSource = new PfXRInputSource();
			Object.defineProperty(xrSession, "inputSources", {
				get: _ => {
					return [leftInputSource, rightInputSource];
				}
			});

			console.log(xrSession);
		}
		return xrSession;
	}

	const originalGetPose = XRFrame.prototype.getPose;
	XRFrame.prototype.getPose = function(space, baseSpace){
		if(space instanceof PfXRSpace){
			const pose = new PfXRPose();
			return pose;
		}
		return originalGetPose.apply(this, [space, baseSpace]);
	}
}
