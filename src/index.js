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
			controller.setOptimizeHMD(true);
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
				return leapHand.arm.nextJoint.slice();

			case PfXRHand.THUMB_METACARPAL:
				return leapHand.thumb.proximal.prevJoint.slice();
			case PfXRHand.THUMB_PHALANX_PROXIMAL:
				return leapHand.thumb.medial.prevJoint.slice();
			case PfXRHand.THUMB_PHALANX_DISTAL:
				return leapHand.thumb.distal.prevJoint.slice();
			case PfXRHand.THUMB_PHALANX_TIP:
				return leapHand.thumb.distal.nextJoint.slice();

			case PfXRHand.INDEX_METACARPAL:
				return leapHand.indexFinger.metacarpal.prevJoint.slice();
			case PfXRHand.INDEX_PHALANX_PROXIMAL:
				return leapHand.indexFinger.proximal.prevJoint.slice();
			case PfXRHand.INDEX_PHALANX_INTERMEDIATE:
				return leapHand.indexFinger.medial.prevJoint.slice();
			case PfXRHand.INDEX_PHALANX_DISTAL:
				return leapHand.indexFinger.distal.prevJoint.slice();
			case PfXRHand.INDEX_PHALANX_TIP:
				return leapHand.indexFinger.distal.nextJoint.slice();

			case PfXRHand.MIDDLE_METACARPAL:
				return leapHand.middleFinger.metacarpal.prevJoint.slice();
			case PfXRHand.MIDDLE_PHALANX_PROXIMAL:
				return leapHand.middleFinger.proximal.prevJoint.slice();
			case PfXRHand.MIDDLE_PHALANX_INTERMEDIATE:
				return leapHand.middleFinger.medial.prevJoint.slice();
			case PfXRHand.MIDDLE_PHALANX_DISTAL:
				return leapHand.middleFinger.distal.prevJoint.slice();
			case PfXRHand.MIDDLE_PHALANX_TIP:
				return leapHand.middleFinger.distal.nextJoint.slice();

			case PfXRHand.RING_METACARPAL:
				return leapHand.ringFinger.metacarpal.prevJoint.slice();
			case PfXRHand.RING_PHALANX_PROXIMAL:
				return leapHand.ringFinger.proximal.prevJoint.slice();
			case PfXRHand.RING_PHALANX_INTERMEDIATE:
				return leapHand.ringFinger.medial.prevJoint.slice();
			case PfXRHand.RING_PHALANX_DISTAL:
				return leapHand.ringFinger.distal.prevJoint.slice();
			case PfXRHand.RING_PHALANX_TIP:
				return leapHand.ringFinger.distal.nextJoint.slice();

			case PfXRHand.LITTLE_METACARPAL:
				return leapHand.pinky.metacarpal.prevJoint.slice();
			case PfXRHand.LITTLE_PHALANX_PROXIMAL:
				return leapHand.pinky.proximal.prevJoint.slice();
			case PfXRHand.LITTLE_PHALANX_INTERMEDIATE:
				return leapHand.pinky.medial.prevJoint.slice();
			case PfXRHand.LITTLE_PHALANX_DISTAL:
				return leapHand.pinky.distal.prevJoint.slice();
			case PfXRHand.LITTLE_PHALANX_TIP:
				return leapHand.pinky.distal.nextJoint.slice();
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
		const jointPos = leapBoneFromjointIndex(spaceData.jointIndex, leapHand);
		if(leapHand && jointPos){

			//leap positions are in mm
			jointPos[0] *= 0.001;
			jointPos[1] *= 0.001;
			jointPos[2] *= 0.001;

			//rotate
			const rot = glMatrix.mat4.create();
			glMatrix.mat4.rotateX(rot, rot, -Math.PI*0.5);
			glMatrix.mat4.rotateY(rot, rot, Math.PI);
			glMatrix.vec3.transformMat4(jointPos, jointPos, rot);

			const viewerPose = this.getViewerPose(baseSpace);
			const headMat = viewerPose.transform.matrix;
			glMatrix.vec3.transformMat4(jointPos, jointPos, headMat);
			pose = new PfXRJointPose({
				pos: {
					x: jointPos[0],
					y: jointPos[1],
					z: jointPos[2],
				},
			});
		}else{
			pose = new PfXRJointPose();
		}
		return pose;
	}
}
