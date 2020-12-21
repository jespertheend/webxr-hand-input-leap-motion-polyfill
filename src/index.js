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

	function leapJointMatrixFromWebXrIndex(jointIndex, leapHand){
		if(!leapHand) return null;

		switch(jointIndex){
			case PfXRHand.WRIST:
				return leapHand.arm.matrix();

			case PfXRHand.THUMB_METACARPAL:
				return leapHand.thumb.proximal.matrix();
			case PfXRHand.THUMB_PHALANX_PROXIMAL:
				return leapHand.thumb.medial.matrix();
			case PfXRHand.THUMB_PHALANX_DISTAL:
				return leapHand.thumb.distal.matrix();
			case PfXRHand.THUMB_PHALANX_TIP:
				return leapHand.thumb.distal.matrix();

			case PfXRHand.INDEX_METACARPAL:
				return leapHand.indexFinger.metacarpal.matrix();
			case PfXRHand.INDEX_PHALANX_PROXIMAL:
				return leapHand.indexFinger.proximal.matrix();
			case PfXRHand.INDEX_PHALANX_INTERMEDIATE:
				return leapHand.indexFinger.medial.matrix();
			case PfXRHand.INDEX_PHALANX_DISTAL:
				return leapHand.indexFinger.distal.matrix();
			case PfXRHand.INDEX_PHALANX_TIP:
				return leapHand.indexFinger.distal.matrix();

			case PfXRHand.MIDDLE_METACARPAL:
				return leapHand.middleFinger.metacarpal.matrix();
			case PfXRHand.MIDDLE_PHALANX_PROXIMAL:
				return leapHand.middleFinger.proximal.matrix();
			case PfXRHand.MIDDLE_PHALANX_INTERMEDIATE:
				return leapHand.middleFinger.medial.matrix();
			case PfXRHand.MIDDLE_PHALANX_DISTAL:
				return leapHand.middleFinger.distal.matrix();
			case PfXRHand.MIDDLE_PHALANX_TIP:
				return leapHand.middleFinger.distal.matrix();

			case PfXRHand.RING_METACARPAL:
				return leapHand.ringFinger.metacarpal.matrix();
			case PfXRHand.RING_PHALANX_PROXIMAL:
				return leapHand.ringFinger.proximal.matrix();
			case PfXRHand.RING_PHALANX_INTERMEDIATE:
				return leapHand.ringFinger.medial.matrix();
			case PfXRHand.RING_PHALANX_DISTAL:
				return leapHand.ringFinger.distal.matrix();
			case PfXRHand.RING_PHALANX_TIP:
				return leapHand.ringFinger.distal.matrix();

			case PfXRHand.LITTLE_METACARPAL:
				return leapHand.pinky.metacarpal.matrix();
			case PfXRHand.LITTLE_PHALANX_PROXIMAL:
				return leapHand.pinky.proximal.matrix();
			case PfXRHand.LITTLE_PHALANX_INTERMEDIATE:
				return leapHand.pinky.medial.matrix();
			case PfXRHand.LITTLE_PHALANX_DISTAL:
				return leapHand.pinky.distal.matrix();
			case PfXRHand.LITTLE_PHALANX_TIP:
				return leapHand.pinky.distal.matrix();
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
		let jointMatrix = leapJointMatrixFromWebXrIndex(spaceData.jointIndex, leapHand);
		if(leapHand && jointMatrix){
			jointMatrix = jointMatrix.slice();
			glMatrix.mat4.transpose(jointMatrix, jointMatrix);

			//leap positions are in mm
			jointMatrix[12] *= 0.001;
			jointMatrix[13] *= 0.001;
			jointMatrix[14] *= 0.001;


			//rotate leap motion space
			const rot = glMatrix.mat4.create();
			glMatrix.mat4.rotateX(rot, rot, -Math.PI*0.5);
			glMatrix.mat4.rotateY(rot, rot, Math.PI);
			glMatrix.mat4.multiply(jointMatrix, rot, jointMatrix);

			//move leap motion space in front of headset
			const viewerPose = this.getViewerPose(baseSpace);
			const headMat = viewerPose.transform.matrix;

			glMatrix.mat4.multiply(jointMatrix, headMat, jointMatrix);
			const matJointPos = glMatrix.mat4.getTranslation([], jointMatrix);

			//extract orientation from matrix
			const jointMatrix3 = glMatrix.mat3.fromMat4([], jointMatrix);
			const orientation = glMatrix.quat.fromMat3([], jointMatrix3);

			// glMatrix.quat.invert(orientation, orientation);
			// glMatrix.quat.rotateY(orientation, orientation, Math.cos(Date.now()*0.001)*Math.PI);
			glMatrix.quat.rotateY(orientation, orientation, -Math.PI*0.5);
			// glMatrix.quat.rotateX(orientation, orientation, -Math.PI);

			const headRot = [
				viewerPose.transform.orientation.x,
				viewerPose.transform.orientation.y,
				viewerPose.transform.orientation.z,
				viewerPose.transform.orientation.w
			];
			glMatrix.quat.multiply(orientation, headRot, orientation);

			pose = new PfXRJointPose({
				pos: {
					x: matJointPos[0],
					y: matJointPos[1],
					z: matJointPos[2],
				},
				dir: {
					x: orientation[0],
					y: orientation[1],
					z: -orientation[2],
					w: -orientation[3],
				},
			});
		}else{
			pose = new PfXRJointPose();
		}
		return pose;
	}
}
