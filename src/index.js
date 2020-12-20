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
								jointIndex: i,
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

	function leapBoneFromjointIndex(jointIndex, leapHand){
		if(!leapHand) return null;

		switch(jointIndex){
			case PfXRHand.WRIST:
				return leapHand.arm;

			case PfXRHand.THUMB_METACARPAL:
				return leapHand.thumb.metacarpal;
			case PfXRHand.THUMB_PHALANX_PROXIMAL:
				return leapHand.thumb.proximal;
			case PfXRHand.THUMB_PHALANX_DISTAL:
				return leapHand.thumb.distal;
			case PfXRHand.THUMB_PHALANX_TIP:
				return leapHand.thumb.distal;

			case PfXRHand.INDEX_METACARPAL:
				return leapHand.indexFinger.metacarpal;
			case PfXRHand.INDEX_PHALANX_PROXIMAL:
				return leapHand.indexFinger.proximal;
			case PfXRHand.INDEX_PHALANX_INTERMEDIATE:
				return leapHand.indexFinger.medial;
			case PfXRHand.INDEX_PHALANX_DISTAL:
				return leapHand.indexFinger.distal;
			case PfXRHand.INDEX_PHALANX_TIP:
				return leapHand.indexFinger.distal;

			case PfXRHand.MIDDLE_METACARPAL:
				return leapHand.middleFinger.metacarpal;
			case PfXRHand.MIDDLE_PHALANX_PROXIMAL:
				return leapHand.middleFinger.proximal;
			case PfXRHand.MIDDLE_PHALANX_INTERMEDIATE:
				return leapHand.middleFinger.medial;
			case PfXRHand.MIDDLE_PHALANX_DISTAL:
				return leapHand.middleFinger.distal;
			case PfXRHand.MIDDLE_PHALANX_TIP:
				return leapHand.middleFinger.distal;

			case PfXRHand.RING_METACARPAL:
				return leapHand.ringFinger.metacarpal;
			case PfXRHand.RING_PHALANX_PROXIMAL:
				return leapHand.ringFinger.proximal;
			case PfXRHand.RING_PHALANX_INTERMEDIATE:
				return leapHand.ringFinger.medial;
			case PfXRHand.RING_PHALANX_DISTAL:
				return leapHand.ringFinger.distal;
			case PfXRHand.RING_PHALANX_TIP:
				return leapHand.ringFinger.distal;

			case PfXRHand.LITTLE_METACARPAL:
				return leapHand.pinky.metacarpal;
			case PfXRHand.LITTLE_PHALANX_PROXIMAL:
				return leapHand.pinky.proximal;
			case PfXRHand.LITTLE_PHALANX_INTERMEDIATE:
				return leapHand.pinky.medial;
			case PfXRHand.LITTLE_PHALANX_DISTAL:
				return leapHand.pinky.distal;
			case PfXRHand.LITTLE_PHALANX_TIP:
				return leapHand.pinky.distal;
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
		const bone = leapBoneFromjointIndex(spaceData.jointIndex, leapHand);
		if(leapHand && bone){
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
