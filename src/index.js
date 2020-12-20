import {Controller, glMatrix} from "../leapjs/leap-1.1.0.js";
import PfXRInputSource from "./XRInputSource.js";
import PfXRSpace from "./XRSpace.js";
import PfXRPose from "./XRPose.js";
import PfXRJointPose from "./XRJointPose.js";
import PfXRInputSourcesChangeEvent from "./XRInputSourcesChangeEvent.js";
import PfXRHand from "./XRHand.js";

const handInputSources = [];
const jointSpaceCache = new WeakMap();
let leapLeftHand, leapRightHand;

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
			controller.frameEventName = "deviceFrame";
			controller.loop(frame => {
				for(const hand of frame.hands){
					if(hand.type == "left"){
						leapLeftHand = hand;
					}else if(hand.type == "right"){
						leapRightHand = hand;
					}
				}
			});
			const leftInputSource = new PfXRInputSource("left");
			const rightInputSource = new PfXRInputSource("right");
			handInputSources.push(leftInputSource);
			handInputSources.push(rightInputSource);
			Object.defineProperty(xrSession, "inputSources", {
				get: _ => {
					return handInputSources;
				}
			});

			setTimeout(_ => {
				xrSession.dispatchEvent(new PfXRInputSourcesChangeEvent("inputsourceschange", {session: xrSession, added: handInputSources, removed: []}));
			});
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

	function getJointSpaceCacheData(jointSpace){
		let data = jointSpaceCache.get(jointSpace);
		if(!data){
			for(const inputSource of handInputSources){
				if(inputSource.hand){
					for(let i=0; i<inputSource.hand.length; i++){
						const inputSourceJointSpace = inputSource.hand[i];
						if(jointSpace == inputSourceJointSpace){
							data = {
								handedness: inputSource.handedness,
								...jointIndexToLeapLocation(i),
							}
							break;
						}
					}
					if(data) break;
				}
			}
			jointSpaceCache.set(jointSpace, data);
		}
		return data;
	}

	function jointIndexToLeapLocation(jointIndex){
		switch(jointIndex){
			// case PfXRHand.WRIST:

			case PfXRHand.THUMB_METACARPAL:
				return {fingerName: "thumb", boneName: "metacarpal"};
			case PfXRHand.THUMB_PHALANX_PROXIMAL:
				return {fingerName: "thumb", boneName: "proximal"};
			case PfXRHand.THUMB_PHALANX_DISTAL:
				return {fingerName: "thumb", boneName: "distal"};
			case PfXRHand.THUMB_PHALANX_TIP:
				return {fingerName: "thumb", boneName: "distal"};

			case PfXRHand.INDEX_METACARPAL:
				return {fingerName: "indexFinger", boneName: "metacarpal"};
			case PfXRHand.INDEX_PHALANX_PROXIMAL:
				return {fingerName: "indexFinger", boneName: "proximal"};
			case PfXRHand.INDEX_PHALANX_INTERMEDIATE:
				return {fingerName: "indexFinger", boneName: "medial"};
			case PfXRHand.INDEX_PHALANX_DISTAL:
				return {fingerName: "indexFinger", boneName: "distal"};
			case PfXRHand.INDEX_PHALANX_TIP:
				return {fingerName: "indexFinger", boneName: "distal"};

			case PfXRHand.MIDDLE_METACARPAL:
				return {fingerName: "middleFinger", boneName: "metacarpal"};
			case PfXRHand.MIDDLE_PHALANX_PROXIMAL:
				return {fingerName: "middleFinger", boneName: "proximal"};
			case PfXRHand.MIDDLE_PHALANX_INTERMEDIATE:
				return {fingerName: "middleFinger", boneName: "medial"};
			case PfXRHand.MIDDLE_PHALANX_DISTAL:
				return {fingerName: "middleFinger", boneName: "distal"};
			case PfXRHand.MIDDLE_PHALANX_TIP:
				return {fingerName: "middleFinger", boneName: "distal"};

			case PfXRHand.RING_METACARPAL:
				return {fingerName: "ringFinger", boneName: "metacarpal"};
			case PfXRHand.RING_PHALANX_PROXIMAL:
				return {fingerName: "ringFinger", boneName: "proximal"};
			case PfXRHand.RING_PHALANX_INTERMEDIATE:
				return {fingerName: "ringFinger", boneName: "medial"};
			case PfXRHand.RING_PHALANX_DISTAL:
				return {fingerName: "ringFinger", boneName: "distal"};
			case PfXRHand.RING_PHALANX_TIP:
				return {fingerName: "ringFinger", boneName: "distal"};

			case PfXRHand.LITTLE_METACARPAL:
				return {fingerName: "pinky", boneName: "metacarpal"};
			case PfXRHand.LITTLE_PHALANX_PROXIMAL:
				return {fingerName: "pinky", boneName: "proximal"};
			case PfXRHand.LITTLE_PHALANX_INTERMEDIATE:
				return {fingerName: "pinky", boneName: "medial"};
			case PfXRHand.LITTLE_PHALANX_DISTAL:
				return {fingerName: "pinky", boneName: "distal"};
			case PfXRHand.LITTLE_PHALANX_TIP:
				return {fingerName: "pinky", boneName: "distal"};
		}
	}

	XRFrame.prototype.getJointPose = function(jointSpace, baseSpace){
		const spaceData = getJointSpaceCacheData(jointSpace);
		let leapHand;
		if(spaceData){
			if(spaceData.handedness == "left"){
				leapHand = leapLeftHand;
			}else if(spaceData.handedness == "right"){
				leapHand = leapRightHand;
			}
		}
		let pose;
		if(leapHand && spaceData.fingerName){
			const finger = leapHand[spaceData.fingerName];
			const bone = finger[spaceData.boneName];
			const boneMat = bone.matrix();

			//convert to column-major order
			glMatrix.mat4.transpose(boneMat, boneMat);

			//leap matrices are in mm
			boneMat[12] *= 0.001;
			boneMat[13] *= 0.001;
			boneMat[14] *= 0.001;

			//rotate
			const rot = glMatrix.mat4.create();
			glMatrix.mat4.rotateX(rot, rot, -Math.PI*0.5);
			glMatrix.mat4.rotateY(rot, rot, Math.PI);
			glMatrix.mat4.multiply(boneMat, rot, boneMat);

			const viewerPose = this.getViewerPose(baseSpace);
			const headMat = viewerPose.transform.matrix;
			glMatrix.mat4.multiply(boneMat, headMat, boneMat);
			const pos = glMatrix.mat4.getTranslation([], boneMat);
			// console.log(pos);
			pose = new PfXRJointPose({
				pos: {
					x: pos[0],
					y: pos[1],
					z: pos[2]
				},
			});
		}else{
			pose = new PfXRJointPose();
		}
		return pose;
	}
}
